import { FastifyInstance } from 'fastify';
import { DiffService } from './diff.service.js';
import { ApplyDiffService } from './apply-diff.service.js';
import { SnapshotService } from '../audit/snapshot.service.js';
import { ChangeAuditService } from '../audit/audit.service.js';
import { DiffController } from './diff.controller.js';

export async function diffRoutes(app: FastifyInstance) {
  const diffService = new DiffService();
  const snapshotService = new SnapshotService();
  const auditService = new ChangeAuditService();
  const applyDiffService = new ApplyDiffService(snapshotService, auditService);

  const diffController = new DiffController(diffService, applyDiffService);

  // 1. 双固件版本 3D 差异计算与多语种下钻过滤
  app.get('/api/v2/diff/compare', diffController.compareVersions.bind(diffController));

  // 2. 选择性差异原子合并同步
  app.post('/api/v2/diff/apply', diffController.applyDiff.bind(diffController));

  // 3. Excel 色块高亮持久化报表导出
  app.get('/api/v2/diff/export/excel', diffController.exportExcel.bind(diffController));
}
