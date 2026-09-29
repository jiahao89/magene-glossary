import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { globalErrorHandler } from './common/errors/error-handler.js';
import { authGuard } from './common/guards/auth.guard.js';
import { initDatabase } from './common/database/db.client.js';

import { termRoutes } from './modules/term/term.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { diffRoutes } from './modules/diff/diff.routes';
import { aiRoutes } from './modules/ai-gateway/ai.routes';
import { legacyFacadeRoutes } from './compat/legacy-facade.routes';

export interface BuildAppOptions {
  inMemoryDb?: boolean;
  logger?: boolean | object;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test';

  const app = Fastify({
    logger: options.logger ?? (isTest ? false : { level: process.env.LOG_LEVEL || 'info' }),
  });

  // 1. 注册基础中间件
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // 2. 注册错误处理器
  app.setErrorHandler(globalErrorHandler);

  // 3. 注册操作人上下文 Guard
  app.addHook('preHandler', authGuard);

  // 4. 初始化数据库
  await initDatabase({ inMemory: options.inMemoryDb });

  // 5. 注册业务路由
  await app.register(termRoutes);
  await app.register(auditRoutes);
  await app.register(diffRoutes);
  await app.register(aiRoutes);
  await app.register(legacyFacadeRoutes);

  // 6. 核心健康检查端点 (Health Check)
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'glossa-hub-server',
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
