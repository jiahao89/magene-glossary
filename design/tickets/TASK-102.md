# 【TASK-102】Drizzle ORM 数据模型与迁移机制构建

*   **工单编号**：`TASK-102`
*   **所属 Epic**：`Epic 1: 基础设施与数据持久化层`
*   **冲刺归属**：`Sprint 1 (Milestone 1)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[DONE]` (已在里程碑 1 成功交付并通过验证)
*   **前置依赖**：[`TASK-101`](./TASK-101.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 后端领域建模与关系持久化基础，  
> **我需要** 使用 Drizzle ORM 构建 7 大核心表结构（项目、版本、词条主表、行级多语言翻译表、快照表、审计日志表、TM 记忆库表）与完备的唯一复合索引，  
> **以便于** 根除单列 JSON 并发覆写脏写风险，从数据结构层面强保障加锁防篡改与封板保护。

---

## 2. 涉及代码文件清单 (Target Files)
*   [`drizzle.config.ts`](file:///Users/jacko/Projects/magene-glossary/drizzle.config.ts) (Drizzle ORM 配置)
*   [`server/src/common/database/schema/schema.ts`](file:///Users/jacko/Projects/magene-glossary/server/src/common/database/schema/schema.ts) (7大核心表 Schema 与复合索引定义)
*   [`server/scripts/verify-milestone1.ts`](file:///Users/jacko/Projects/magene-glossary/server/scripts/verify-milestone1.ts) (Schema 自动化创建与类型校验)

---

## 3. 验收条件清单 (Acceptance Criteria Checklist)
- [x] 成功定义 7 大核心表结构：`projects`, `versions`, `terms`, `term_translations`, `term_snapshots`, `audit_change_logs`, `translation_memories`；
- [x] 为 `(version_id, kw)`、`(term_id, language_code)`、`(project_id, version_name)` 建立唯一复合索引；
- [x] 支持 TypeScript 类型推导（`$inferSelect` / `$inferInsert`）；
- [x] 数据库表结构创建耗时 $\le 50\text{ms}$。

---

## 4. 验证命令 (Verification Command)
```bash
npm run verify:m1
```

---

## 5. 完成定义 (Definition of Done)
- [x] Milestone 1 验收套件全绿通过。
