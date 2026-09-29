# 【TASK-104】向后兼容视图 view_terms_legacy 挂载与双向验证

*   **工单编号**：`TASK-104`
*   **所属 Epic**：`Epic 1: 基础设施与数据持久化层`
*   **冲刺归属**：`Sprint 1 (Milestone 1)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[DONE]` (已在里程碑 1 成功交付并通过验证)
*   **前置依赖**：[`TASK-103`](./TASK-103.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 存量外部系统、旧脚本及上游调用方，  
> **我需要** 在数据库底层挂载一个向后兼容视图 `view_terms_legacy`，该视图通过 `jsonb_object_agg` 将新系统的行级多语言翻译实时汇聚为旧版单列 `translations` 与 `translations_meta` JSON 结构，  
> **以便于** 任何老系统无论在新架构升级期间还是未来，都能直接像查询旧单表一样读取实时数据，实现底层物理关系化解耦与上层契约 100% 向后兼容并存。

---

## 2. 涉及代码文件清单 (Target Files)
*   [`server/src/common/database/schema/schema.ts`](file:///Users/jacko/Projects/magene-glossary/server/src/common/database/schema/schema.ts) (兼容视图定义)
*   [`server/scripts/verify-milestone1.ts`](file:///Users/jacko/Projects/magene-glossary/server/scripts/verify-milestone1.ts) (视图动态联动与契约保真度验证)

---

## 3. 验收条件清单 (Acceptance Criteria Checklist)
- [x] 执行 `SELECT * FROM view_terms_legacy`，输出字段名与结构与旧版 `terms` 表 100% 相同；
- [x] 动态联动：向底层 `term_translations` 插入新语种行，视图实时感知并自动拼入 `translations` JSON 中；
- [x] 高性能聚合：单次视图查询响应耗时 $\le 10\text{ms}$。

---

## 4. 验证命令 (Verification Command)
```bash
npm run verify:m1
```

---

## 5. 完成定义 (Definition of Done)
- [x] 兼容视图在 Milestone 1 验证套件中 100% 通过。
