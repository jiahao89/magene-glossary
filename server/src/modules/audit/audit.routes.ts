import { FastifyInstance } from 'fastify';
import { ChangeAuditService } from './audit.service.js';
import { SnapshotService } from './snapshot.service.js';
import { TimeMachineRollbackService } from './rollback.service.js';
import { AuditController } from './audit.controller.js';
import { SnapshotController } from './snapshot.controller.js';
import { RollbackController } from './rollback.controller.js';

export async function auditRoutes(app: FastifyInstance) {
  const auditService = new ChangeAuditService();
  const snapshotService = new SnapshotService();
  const rollbackService = new TimeMachineRollbackService(snapshotService, auditService);

  const auditController = new AuditController(auditService);
  const snapshotController = new SnapshotController(snapshotService);
  const rollbackController = new RollbackController(rollbackService);

  // 1. 字段级审计日志查询
  app.get('/api/v2/audit/logs', auditController.getLogs.bind(auditController));

  // 2. 词条时光机快照列表与详情
  app.get('/api/v2/audit/terms/:termId/snapshots', snapshotController.getTermSnapshots.bind(snapshotController));
  app.get('/api/v2/audit/snapshots/:snapshotId', snapshotController.getSnapshot.bind(snapshotController));

  // 3. 时光机一键回退与二次撤销
  app.post('/api/v2/audit/snapshots/:snapshotId/rollback', rollbackController.rollback.bind(rollbackController));
}
