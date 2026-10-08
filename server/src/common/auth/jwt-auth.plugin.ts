import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { operatorContextStorage } from './operator-context';

export interface AuthPluginOptions {
  requireAuth?: boolean;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify: FastifyInstance,
  options: AuthPluginOptions = {}
) => {
  // Hook into onRequest to extract user context
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    // 1. Try to extract operator from headers
    const rawOperator = request.headers['x-operator'] as string;
    let operator = '张工 (固件研发组)';

    if (rawOperator) {
      try {
        operator = decodeURIComponent(rawOperator);
      } catch {
        operator = rawOperator;
      }
    } else if (request.headers.authorization) {
      // Mock / simple token bearer extraction
      const token = request.headers.authorization.replace('Bearer ', '');
      if (token) {
        operator = `User-${token.substring(0, 8)}`;
      }
    }

    // 2. Set into AsyncLocalStorage
    operatorContextStorage.enterWith({
      operator,
      userId: request.headers['x-user-id'] as string || 'user-default',
    });
  });
};

export const jwtAuthPlugin = fp(authPlugin, {
  name: 'jwt-auth-plugin',
});
