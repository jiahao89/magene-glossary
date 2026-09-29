# 【TASK-301】字段级变更精准捕获服务 ChangeAuditService

*   **工单编号**：`TASK-301`
*   **所属 Epic**：`Epic 3: 全维度细粒度变更审计与时光机`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-202`](./TASK-202.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 固件项目负责人与合规审计人员，  
> **我需要** 清楚追踪谁（操作工号/姓名）、在什么时间、修改了哪一个词条的哪个具体语种、变更前后的文本 Diff 是什么、操作原因是什么，  
> **以便于** 在出现固件量产文案异常（如乱码、违禁词、截断爆框）时，能够在 30 秒内精准定责回溯，提供不可篡改的变更审计证据链。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/audit/audit.service.ts` (变更捕获、差异计算与审计落库)
*   `server/src/modules/audit/myers-diff.ts` (Myers 字符级红绿 Diff 高性能算法)
*   `server/src/modules/audit/audit.controller.ts` (审计日志查询控制器)
*   `server/src/modules/audit/audit.routes.ts` (Fastify 路由：`/api/v2/audit/logs`)
*   `server/test/modules/audit/audit.service.test.ts` (单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 变更审计事件模型 (AuditEvent)
```typescript
// server/src/modules/audit/audit.service.ts
export interface CaptureChangeEvent {
  termId: string;
  versionId: string;
  kw: string;
  targetLang?: string; // 若为词条属性改动为 null，若为译文改动则为 'de' / 'fr'
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLLBACK' | 'DIFF_APPLY';
  oldValue?: string;
  newValue?: string;
  operatorId: string;
  operatorName: string;
  sourceType?: 'human' | 'ai' | 'tm';
  reason?: string;
}
```

### 3.2 字符级红绿 Diff 计算 (Myers Diff)
记录结构：
```json
{
  "field": "translation_text",
  "targetLang": "de",
  "oldValue": "Fahrt beenden und aufzeichnen?",
  "newValue": "Fahrt beenden?",
  "charDiff": [
    { "type": "unchanged", "value": "Fahrt beenden" },
    { "type": "delete", "value": " und aufzeichnen" },
    { "type": "unchanged", "value": "?" }
  ]
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 无论通过 API 还是管理界面修改德语翻译，`audit_change_logs` 均同步插入一条高精度的审计记录；
- [ ] 审计记录中准确包含操作人工号、操作人姓名与时间戳；
- [ ] 修改中文原文、KW 或 `max_chars` 时，正确记录主属性变动日志；
- [ ] 提供按词条 KW、按版本号、按语种、按操作人多条件组合分页检索；
- [ ] 10,000 条审计记录下，分页查询响应耗时 $\le 25\text{ms}$。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:audit-service
# 或运行独立测试
npx tsx server/test/modules/audit/audit.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试覆盖率 $\ge 95\%$；
2. 批量更新场景下日志生成无遗漏且事务一致。
