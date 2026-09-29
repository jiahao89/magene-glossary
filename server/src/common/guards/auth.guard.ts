import { FastifyRequest, FastifyReply } from 'fastify';

export interface UserContext {
  operatorId: string;
  operatorName: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userContext?: UserContext;
  }
}

export async function authGuard(request: FastifyRequest, _reply: FastifyReply) {
  const operatorId = (request.headers['x-operator-id'] as string) || 'USR_001';
  const operatorName = (request.headers['x-operator-name'] as string) || '李工 (固件负责人)';
  const role = (request.headers['x-operator-role'] as string) || 'firmware_admin';

  request.userContext = {
    operatorId,
    operatorName,
    role,
  };
}
