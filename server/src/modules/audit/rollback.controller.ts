import { FastifyRequest, FastifyReply } from 'fastify';
import { TimeMachineRollbackService } from './rollback.service.js';

export class RollbackController {
  constructor(private rollbackService: TimeMachineRollbackService) {}

  async rollback(
    req: FastifyRequest<{
      Params: { snapshotId: string };
    }>,
    reply: FastifyReply
  ) {
    const { snapshotId } = req.params;
    const operator = req.userContext || { operatorId: 'OP-ANON', operatorName: 'Anonymous', role: 'editor' };
    const result = await this.rollbackService.rollbackToSnapshot(snapshotId, {
      id: operator.operatorId,
      name: operator.operatorName,
    });
    return reply.status(200).send(result);
  }
}
