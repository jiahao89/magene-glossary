import { FastifyInstance } from 'fastify';
import { AIGatewayService } from './gateway.service.js';
import { TMVectorService } from './tm/tm-vector.service.js';
import { MicroBatcher } from './batch/micro-batcher.js';
import { SelfCorrectionService } from './qa-engine/self-correction.js';
import { AIController } from './ai.controller.js';

export async function aiRoutes(app: FastifyInstance) {
  const gateway = new AIGatewayService();
  const tmService = new TMVectorService();
  const batcher = new MicroBatcher({ gateway });
  const correctionService = new SelfCorrectionService(gateway);

  const controller = new AIController(gateway, tmService, batcher, correctionService);

  // 1. 单条智能翻译 (带 TM 漏斗直通 + QA 自纠错保护)
  app.post('/api/v2/ai/translate', controller.translate.bind(controller));

  // 2. 批量微批聚合高并发翻译
  app.post('/api/v2/ai/batch-translate', controller.batchTranslate.bind(controller));

  // 3. 静态规则单条质检端点
  app.post('/api/v2/ai/qa/inspect', controller.inspectQA.bind(controller));

  // 4. 查看当前各供应商的熔断健康状态
  app.get('/api/v2/ai/providers/status', controller.getProviderStatus.bind(controller));
}
