import { FastifyRequest, FastifyReply } from 'fastify';
import { SnapshotService } from './snapshot.service.js';

export class SnapshotController {
  constructor(private snapshotService: SnapshotService) {}

  async getTermSnapshots(
    req: FastifyRequest<{
      Params: { termId: string };
      Querystring: { limit?: number; offset?: number };
    }>,
    reply: FastifyReply
  ) {
    const { termId } = req.params;
    const { limit, offset } = req.query;
    const items = await this.snapshotService.getSnapshotsByTerm(termId, limit, offset);
    return reply.status(200).send({ items });
  }

  async getSnapshot(
    req: FastifyRequest<{
      Params: { snapshotId: string };
    }>,
    reply: FastifyReply
  ) {
    const { snapshotId } = req.params;
    const item = await this.snapshotService.getSnapshotById(snapshotId);
    return reply.status(200).send(item);
  }
}
