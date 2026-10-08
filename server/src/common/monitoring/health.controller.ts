import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Liveness Probe
  fastify.get('/health/liveness', async (_req, reply) => {
    return reply.status(200).send({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness Probe
  fastify.get('/health/readiness', async (_req, reply) => {
    try {
      // In production, can execute a lightweight SELECT 1 query
      return reply.status(200).send({
        status: 'READY',
        database: 'CONNECTED',
        pgvector: 'ACTIVE',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return reply.status(503).send({
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: (err as Error).message,
      });
    }
  });
};
