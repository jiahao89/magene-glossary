import { AIGatewayService } from '../gateway.service.js';
import { TranslationPromptContext, TranslationResult } from '../providers/provider.interface.js';
import { L10nQAEngine, QACheckResult } from './l10n-qa.engine.js';

export interface CorrectedTranslationResult extends TranslationResult {
  qaResult: QACheckResult;
  selfCorrected: boolean;
  originalTranslation?: string;
  correctionAttempts: number;
}

export class SelfCorrectionService {
  constructor(
    private gateway: AIGatewayService = new AIGatewayService(),
    private maxRetries: number = 2
  ) {}

  /**
   * 带自纠错反馈循环的端到端稳健翻译流水线
   */
  async translateWithQA(ctx: TranslationPromptContext): Promise<CorrectedTranslationResult> {
    // 1. 首轮大模型生成
    const initialResult = await this.gateway.translate(ctx);

    // 2. 静态规则首轮质检
    let currentText = initialResult.translatedText;
    let qa = L10nQAEngine.inspect(ctx.sourceText, currentText, { maxChars: ctx.maxChars });

    if (qa.passed) {
      return {
        ...initialResult,
        translatedText: currentText,
        qaResult: qa,
        selfCorrected: false,
        correctionAttempts: 0,
      };
    }

    // 3. 存在 ERROR 违规，触发自纠错反馈循环
    let attempts = 0;
    const originalText = currentText;

    while (!qa.passed && attempts < this.maxRetries) {
      attempts++;
      const errorHints = qa.issues
        .filter((i) => i.severity === 'ERROR')
        .map((i) => i.message)
        .join('; ');

      const correctionInstruction = `[QA 自纠错指示] 上一轮输出 "${currentText}" 存在严重违规: ${errorHints}。请严格修正，保留原意及所有占位符，且严格满足字符长度限制！`;

      console.warn(`⚠️ 触发 AI 质检自纠错第 ${attempts} 轮: ${errorHints}`);

      try {
        const retryResult = await this.gateway.translate({
          ...ctx,
          systemInstruction: correctionInstruction,
          termContext: `${ctx.termContext || ''}\n${correctionInstruction}`,
        });

        currentText = retryResult.translatedText;
        qa = L10nQAEngine.inspect(ctx.sourceText, currentText, { maxChars: ctx.maxChars });

        if (qa.passed) {
          return {
            ...retryResult,
            translatedText: currentText,
            qaResult: qa,
            selfCorrected: true,
            originalTranslation: originalText,
            correctionAttempts: attempts,
          };
        }
      } catch (err: any) {
        console.warn(`自纠错重试异常: ${err.message}`);
        break;
      }
    }

    // 纠错后仍未通过，返回带有违规标记的最终结果
    return {
      ...initialResult,
      translatedText: currentText,
      qaResult: qa,
      selfCorrected: attempts > 0,
      originalTranslation: originalText,
      correctionAttempts: attempts,
    };
  }
}
