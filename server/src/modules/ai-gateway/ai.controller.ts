import { FastifyRequest, FastifyReply } from 'fastify';
import { AIGatewayService } from './gateway.service.js';
import { TMVectorService } from './tm/tm-vector.service.js';
import { MicroBatcher } from './batch/micro-batcher.js';
import { L10nQAEngine } from './qa-engine/l10n-qa.engine.js';
import { SelfCorrectionService } from './qa-engine/self-correction.js';
import { ValidationError } from '../../common/errors/domain-errors.js';

export class AIController {
  constructor(
    private gateway: AIGatewayService,
    private tmService: TMVectorService,
    private batcher: MicroBatcher,
    private correctionService: SelfCorrectionService
  ) {}

  /**
   * 单条智能翻译 (带 TM 漏斗直通 + QA 自纠错保护)
   */
  async translate(
    req: FastifyRequest<{
      Body: {
        sourceText: string;
        sourceLang?: string;
        targetLang: string;
        maxChars?: number;
        hardwareType?: string;
        termContext?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { sourceText, targetLang, sourceLang = 'zh-cn', maxChars, hardwareType, termContext } = req.body;
    if (!sourceText || !targetLang) {
      throw new ValidationError('必须提供 sourceText 原文与 targetLang 目标语种');
    }

    // 1. 第一步: TM 记忆库双层漏斗检索
    const tmLookup = await this.tmService.lookup(sourceText, targetLang);
    if (tmLookup.exactHit && tmLookup.exactTranslation) {
      return reply.status(200).send({
        translatedText: tmLookup.exactTranslation,
        sourceType: 'tm',
        provider: 'Local-TM-pgvector',
        model: 'tm-exact-match',
        latencyMs: tmLookup.latencyMs,
        qaResult: { passed: true, hasErrors: false, hasWarnings: false, issues: [] },
        selfCorrected: false,
      });
    }

    // 2. 第二步: 将高相似度模糊匹配项注入作为 Few-Shot 上下文
    const tmSamples = tmLookup.fuzzyMatches.map((m) => ({
      source: m.sourceText,
      target: m.targetText,
    }));

    // 3. 第三步: 调度直连 AI 网关并经过 L10n QA 质检与自纠错
    const result = await this.correctionService.translateWithQA({
      sourceText,
      sourceLang,
      targetLang,
      maxChars,
      hardwareType,
      termContext,
      tmSamples,
    });

    return reply.status(200).send({
      ...result,
      sourceType: 'ai',
      tmFewShotHits: tmSamples.length,
    });
  }

  /**
   * 批量微批聚合翻译
   */
  async batchTranslate(
    req: FastifyRequest<{
      Body: {
        items: Array<{
          id?: string;
          sourceText: string;
          sourceLang?: string;
          targetLang: string;
          maxChars?: number;
          hardwareType?: string;
        }>;
      };
    }>,
    reply: FastifyReply
  ) {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('必须提供非空的 items 批量翻译数组');
    }

    const tasks = items.map((item) =>
      this.batcher.enqueue({
        id: item.id,
        sourceText: item.sourceText,
        sourceLang: item.sourceLang || 'zh-cn',
        targetLang: item.targetLang,
        maxChars: item.maxChars,
        hardwareType: item.hardwareType,
      })
    );

    const settled = await Promise.allSettled(tasks);
    const results = settled.map((s, idx) => {
      if (s.status === 'fulfilled') {
        return { success: true, item: items[idx], result: s.value };
      } else {
        return { success: false, item: items[idx], error: s.reason?.message || 'Translation failed' };
      }
    });

    return reply.status(200).send({
      total: items.length,
      successCount: results.filter((r) => r.success).length,
      results,
    });
  }

  /**
   * 静态规则单条质检端点
   */
  async inspectQA(
    req: FastifyRequest<{
      Body: {
        sourceText: string;
        targetText: string;
        maxChars?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    const { sourceText, targetText, maxChars } = req.body;
    if (sourceText === undefined || targetText === undefined) {
      throw new ValidationError('必须提供 sourceText 与 targetText');
    }

    const report = L10nQAEngine.inspect(sourceText, targetText, { maxChars });
    return reply.status(200).send(report);
  }

  /**
   * 查看当前各供应商的熔断健康状态
   */
  async getProviderStatus(_req: FastifyRequest, reply: FastifyReply) {
    const status = this.gateway.getProviderStatus();
    return reply.status(200).send({ status });
  }
}
