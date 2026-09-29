import { FastifyRequest, FastifyReply } from 'fastify';
import { ChangeAuditService, QueryAuditLogsParams } from './audit.service.js';

export class AuditController {
  constructor(private auditService: ChangeAuditService) {}

  async getLogs(req: FastifyRequest<{ Querystring: QueryAuditLogsParams }>, reply: FastifyReply) {
    const result = await this.auditService.queryLogs(req.query);
    return reply.status(200).send(result);
  }
}
