---
id: "005"
title: "AI 直连校验与妙搭 PostgreSQL 就绪强化 (AI Direct Connect & Miaoda PG Readiness)"
status: "done"
labels: ["ready-for-agent", "feature", "backend", "database"]
---

# Ticket 005: AI 直连校验与妙搭 PostgreSQL 就绪强化

## 目标
响应用户核心诉求“不要过分依赖 Dify”以及“项目需要 PG 数据库以直接部署在妙搭上”：
1. **添加统一 AI 连通性测试接口**：
   - 支持测试 OpenAI / DeepSeek / 通义千问直连连接与延迟，并返回模型应答探测状态。
2. **妙搭 PostgreSQL 环境探针**：
   - 提供健康检查与数据库连通性诊断端点 (`/api/health`)，输出当前运行方言（SQLite / PostgreSQL）、连接池活跃度及表索引状态。
3. **保持 100% 测试通过率与双分支同步**：
   - 验证 `vitest` 全量测试无破坏，推送至 `v1.2` 与 `main`。

## 任务清单
- [x] 在 `server/services/aiTranslationService.cjs` 与 `server/routes/translation.cjs` 增加 AI 直连快速探测端点
- [x] 在 `server/app.cjs` 或 `server/routes/` 增加系统健康与 PG/SQLite 探针 (`/api/health`)
- [x] 运行 `npx vitest run` & `npm run build` 确保 100% 通过
- [x] 提交并推送到 `v1.2` 与 `main`
