import { FastifyInstance } from 'fastify';
import { TermController } from './term.controller.js';
import { TermService } from './term.service.js';
import { TermRepository } from './term.repository.js';
import { initDatabase } from '../../common/database/db.client.js';

export async function termRoutes(app: FastifyInstance) {
  const { db } = await initDatabase();
  const repo = new TermRepository(db);
  const service = new TermService(repo);
  const controller = new TermController(service);

  // 1. 创建词条
  app.post('/api/v2/terms', controller.createTerm.bind(controller));

  // 2. 详情获取
  app.get('/api/v2/terms/:termId', controller.getTerm.bind(controller));

  // 3. 词条元数据修改
  app.patch('/api/v2/terms/:termId', controller.updateTerm.bind(controller));

  // 4. 词条删除
  app.delete('/api/v2/terms/:termId', controller.deleteTerm.bind(controller));

  // 5. 单语种原子更新/录入
  app.put('/api/v2/terms/:termId/translations/:lang', controller.upsertTranslation.bind(controller));

  // 6. 版本下的词条列表检索
  app.get('/api/v2/versions/:versionId/terms', controller.listTerms.bind(controller));
}
