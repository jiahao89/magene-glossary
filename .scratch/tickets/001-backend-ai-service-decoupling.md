---
id: "001"
title: "后端 AI 核心分层与路由瘦身 (Backend AI Service Decoupling & Route Slimming)"
status: "done"
labels: ["ready-for-agent", "refactor", "backend"]
---

# Ticket 001: 后端 AI 核心分层与路由瘦身

## 目标
解决 `server/routes/translation.cjs` 超过 1000 行的“胖路由”问题，将业务逻辑彻底下沉：
1. **统一 AI Provider 策略模式**：
   - 将 OpenAI 兼容直连（DeepSeek / 通义千问 / OpenAI）、Dify 智能体工作流、本地离线固件词典彻底组件化。
2. **提取 JSON 容错与修复工具**：
   - 剥离路由中针对 `<think>`、代码块、各种残缺 JSON 的手写复杂正则表达式，提取至 `server/utils/jsonRepair.cjs`。
3. **入参规范与轻量校验**：
   - 规范输入参数，封装统一校验器，消除到处防御式 `kw || KW || keyword` 与 `zh_cn || chinese || text` 的冗余补丁。
4. **保持 100% 接口向后兼容**：
   - 所有已有 API 端点行为、返回值格式保持不变，全量单元测试与集成测试通过。

## 任务清单
- [x] 创建 `server/utils/jsonRepair.cjs`（独立单测并剥离清洗逻辑）
- [x] 优化 `server/services/aiTranslationService.cjs`（策略模式分发：`OpenAIProvider`, `DifyProvider`, `LocalDictProvider`）
- [x] 瘦身 `server/routes/translation.cjs`（保持纯粹的 Express 路由控制器职责）
- [x] 运行 `npx vitest run` 验证所有 AI 与协同路由测试 100% 通过

