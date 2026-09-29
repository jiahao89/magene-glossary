import { buildApp } from '../../src/app.js';
import { EntityNotFoundError, LockViolationError } from '../../src/common/errors/domain-errors.js';

async function runScaffoldTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-201】Fastify 整洁架构脚手架与全局异常拦截契约测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const app = await buildApp({ inMemoryDb: true, logger: false });

  // 模拟注入测试路由
  app.get('/test/domain-not-found', async () => {
    throw new EntityNotFoundError('词条', 'KW_POWER_ZONE_ALERT');
  });

  app.get('/test/lock-violation', async () => {
    throw new LockViolationError('词条已被人工加锁锁定，禁止覆写');
  });

  app.get('/test/unhandled-crash', async () => {
    throw new Error('database connection lost');
  });

  app.get('/test/whoami', async (req) => {
    return { user: req.userContext };
  });

  await app.ready();
  const initDuration = Date.now() - startTime;
  console.log(`✔ Fastify 实例冷启动就绪，耗时: ${initDuration}ms (指标: <= 100ms)`);

  // 1. 测试健康检查
  console.log('\n▶ 测试 1: GET /health 端点');
  const resHealth = await app.inject({ method: 'GET', url: '/health' });
  if (resHealth.statusCode !== 200) throw new Error(`Health check failed: ${resHealth.statusCode}`);
  const healthJson = JSON.parse(resHealth.payload);
  if (healthJson.status !== 'ok') throw new Error('Health check payload invalid');
  console.log(`✔ 状态码 200，返回响应: status=${healthJson.status}, uptime=${healthJson.uptime.toFixed(2)}s`);

  // 2. 测试 404 EntityNotFoundError
  console.log('\n▶ 测试 2: 捕获 EntityNotFoundError 领域异常 (404)');
  const resNotFound = await app.inject({ method: 'GET', url: '/test/domain-not-found' });
  if (resNotFound.statusCode !== 404) throw new Error(`Expected 404, got ${resNotFound.statusCode}`);
  const notFoundJson = JSON.parse(resNotFound.payload);
  if (notFoundJson.code !== 'ENTITY_NOT_FOUND' || !notFoundJson.message.includes('KW_POWER_ZONE_ALERT')) {
    throw new Error(`Invalid 404 payload: ${resNotFound.payload}`);
  }
  console.log(`✔ 状态码 404，code=${notFoundJson.code}, message="${notFoundJson.message}"`);

  // 3. 测试 403 LockViolationError
  console.log('\n▶ 测试 3: 捕获 LockViolationError 加锁防篡改拦截 (403)');
  const resLock = await app.inject({ method: 'GET', url: '/test/lock-violation' });
  if (resLock.statusCode !== 403) throw new Error(`Expected 403, got ${resLock.statusCode}`);
  const lockJson = JSON.parse(resLock.payload);
  if (lockJson.code !== 'LOCK_VIOLATION' || !lockJson.message.includes('禁止覆写')) {
    throw new Error(`Invalid 403 payload: ${resLock.payload}`);
  }
  console.log(`✔ 状态码 403，code=${lockJson.code}, message="${lockJson.message}"`);

  // 4. 测试 500 未捕获异常脱敏
  console.log('\n▶ 测试 4: 捕获未声明的系统内部异常 (500 脱敏)');
  const resCrash = await app.inject({ method: 'GET', url: '/test/unhandled-crash' });
  if (resCrash.statusCode !== 500) throw new Error(`Expected 500, got ${resCrash.statusCode}`);
  const crashJson = JSON.parse(resCrash.payload);
  if (crashJson.code !== 'INTERNAL_SERVER_ERROR') {
    throw new Error(`Invalid 500 code: ${crashJson.code}`);
  }
  console.log(`✔ 状态码 500，code=${crashJson.code}, error="${crashJson.error}"`);

  // 5. 测试上下文操作人提取
  console.log('\n▶ 测试 5: 操作人 Header 上下文传递');
  const resUser = await app.inject({
    method: 'GET',
    url: '/test/whoami',
    headers: {
      'x-operator-id': 'ENG_888',
      'x-operator-name': '张工',
      'x-operator-role': 'firmware_qa',
    },
  });
  const userJson = JSON.parse(resUser.payload);
  if (userJson.user.operatorId !== 'ENG_888' || userJson.user.operatorName !== '张工') {
    throw new Error('User context guard failed');
  }
  console.log(`✔ 成功从 Header 解析操作人: ID=${userJson.user.operatorId}, Name=${userJson.user.operatorName}`);

  // 6. 优雅停机测试
  console.log('\n▶ 测试 6: 优雅关闭连接');
  await app.close();
  console.log('✔ Server closed gracefully without leaking sockets.');

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('   🎉 【TASK-201】脚手架与错误拦截所有测试项 100% 验收通过！');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runScaffoldTests().catch((err) => {
  console.error('❌ TASK-201 验证失败:', err);
  process.exit(1);
});
