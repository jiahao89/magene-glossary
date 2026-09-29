# 【TASK-103】存量数据平滑迁移与对账校验脚本

*   **工单编号**：`TASK-103`
*   **所属 Epic**：`Epic 1: 基础设施与数据持久化层`
*   **冲刺归属**：`Sprint 1 (Milestone 1)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：数据工程师 / 后端工程师
*   **当前状态**：`[DONE]` (已在里程碑 1 成功交付并通过验证)
*   **前置依赖**：[`TASK-102`](./TASK-102.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 数据资产安全负责人，  
> **我需要** 编写历史数据无损拆解迁移逻辑与严格的一致性对账校验脚本，将老系统中存量单列 `translations` JSON 字段安全拆解并写入新版 `term_translations` 关系行级子表，  
> **以便于** 确保在架构切换过程中历史词条资产 0 丢失、0 格式损坏，且拆解前后的多语种数量与内容完全对账吻合。

---

## 2. 涉及代码文件清单 (Target Files)
*   [`server/scripts/verify-milestone1.ts`](file:///Users/jacko/Projects/magene-glossary/server/scripts/verify-milestone1.ts) (集成历史数据注入、拆解迁移与双向对账校验器)

---

## 3. 验收条件清单 (Acceptance Criteria Checklist)
- [x] 成功解析存量 `translations` JSON 并安全拆解为 `term_translations` 行级记录；
- [x] 将历史来源标记 `translations_meta` 正确映射至 `source_type`（`human`/`ai`/`tm`）；
- [x] 自动化对账核验：`V1 原始词条数 == V2 主表词条数`，子表生成条目数与 JSON 键总数完全一致；
- [x] 幂等性保护：重复运行迁移脚本不产生脏数据与冲突报错。

---

## 4. 验证命令 (Verification Command)
```bash
npm run verify:m1
```

---

## 5. 完成定义 (Definition of Done)
- [x] 对账核验 100% 一致，自动化测试全绿通过。
