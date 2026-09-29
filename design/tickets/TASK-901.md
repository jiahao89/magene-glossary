# 【TASK-901】75+ 存量 Golden Master 回归契约测试网

*   **工单编号**：`TASK-901`
*   **所属 Epic**：`Epic 9: 自动化契约测试网与上线割接`
*   **冲刺归属**：`Sprint 5 (Milestone 5)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：QA / 测试架构师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-203`](./TASK-203.md), [`TASK-303`](./TASK-303.md), [`TASK-404`](./TASK-404.md), [`TASK-504`](./TASK-504.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 平台质量委员会与上线审批人，  
> **我需要** 将老系统存量的 75+ 自动化测试用例（包括词条同步、Dify 翻译兜底、管理员安全鉴权等）作为“Golden Master 契约黄金基准”，全部接入新系统进行回归验证，  
> **以便于** 确保系统重构升级后，存量已验证的业务行为与边缘边界没有发生任何不可预期的意外劣化。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/test/golden-master-regression.test.ts` (75+ 存量用例自动化回归驱动套件)
*   `server/test/fixtures/legacy-test-fixtures.json` (历史测试用例样本集)

---

## 3. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 运行 `npm test`，全部 75+ 历史自动化测试用例 100% 绿色通过，无任何失败跳过；
- [ ] 断言对比新旧两套实现的 HTTP 响应 Body 结构，字段名称与嵌套格式 100% 兼容；
- [ ] 全套测试运行完成总耗时 $\le 10\text{s}$。

---

## 4. 验证命令 (Verification Command)
```bash
npm run test:golden-master
```

---

## 5. 完成定义 (Definition of Done)
1. 契约测试全部通过；
2. 输出完整的回归测试覆盖率报告。
