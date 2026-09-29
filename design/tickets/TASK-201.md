# 【TASK-201】Fastify 4.x + TS 5.x 分层整洁架构脚手架与全局异常拦截

*   **工单编号**：`TASK-201`
*   **所属 Epic**：`Epic 2: 服务底座与向后兼容垫片层`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端架构师 / Node.js 工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-102`](./TASK-102.md) (已完成)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 后端开发团队与上层应用服务，  
> **我需要** 一个基于 Fastify 4.x 与 TypeScript 5.x 的高性能、分层清晰、自带统一错误处理与安全上下文的服务器底座，  
> **以便于** 后续所有业务模块（词条、审计、版本对比、AI 网关）能够标准化挂载，在处理高并发固件同步时延迟控制在 50ms 以内，且在发生任何未捕获异常时提供标准化、安全脱敏的错误响应。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/server.ts` (主进程监听、端口绑定与优雅停机)
*   `server/src/app.ts` (Fastify 实例工厂与插件注册)
*   `server/src/config/env.config.ts` (Zod 驱动的环境变量强类型校验)
*   `server/src/common/errors/domain-errors.ts` (领域错误体系：`EntityNotFoundError`, `LockViolationError` 等)
*   `server/src/common/errors/error-handler.ts` (全局异常拦截器映射为 RFC 7807 规范 JSON)
*   `server/src/common/guards/auth.guard.ts` (操作人工号/姓名上下文提取中间件)
*   `server/test/core/server-scaffold.test.ts` (脚手架与异常拦截自动化测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 环境变量校验 (Zod Schema)
```typescript
// server/src/config/env.config.ts
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
```

### 3.2 领域错误模型与全局错误响应规范
统一错误响应结构：
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "code": "LOCK_VIOLATION",
  "message": "词条已加锁或所属版本已封板，禁止修改",
  "timestamp": "2026-09-28T16:00:00.000Z"
}
```

### 3.3 优雅停机契约 (Graceful Shutdown)
监听 `SIGINT` 与 `SIGTERM` 信号：
1. 停止接收新的 HTTP 连接；
2. 等待活跃请求完成（超时上限 5000ms）；
3. 关闭 PostgreSQL 连接池；
4. 退出进程并记录安全退出日志。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 运行 `npx tsx server/src/server.ts`，控制台打印 Pino 结构化日志，冷启动时间 $\le 100\text{ms}$；
- [ ] 访问 `GET /health` 返回 `{"status": "ok", "uptime": ...}`，HTTP 状态码 200；
- [ ] 触发 `NotFoundError`，返回 HTTP 404 及标准 RFC 错误格式；
- [ ] 触发 `LockViolationError`，返回 HTTP 403 及明确加锁提示文案；
- [ ] 发生未声明的 `throw new Error('db crash')` 时，生产环境下自动脱敏内部堆栈，仅向外返回 500 "Internal Server Error"；
- [ ] 发送 `kill -SIGTERM <PID>`，服务在 2 秒内安全关闭，控制台输出 `Server shutdown gracefully`。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:server-scaffold
# 或运行独立的 tsx 脚本验证
npx tsx server/test/core/server-scaffold.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. TypeScript 静态编译 0 Error 0 Warning；
2. ESLint 检查全绿；
3. 单元测试用例覆盖率 $\ge 90\%$。
