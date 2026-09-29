# 【TASK-203】历史 API 兼容垫片层 Legacy API Facade

*   **工单编号**：`TASK-203`
*   **所属 Epic**：`Epic 2: 服务底座与向后兼容垫片层`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-202`](./TASK-202.md), [`TASK-104`](./TASK-104.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 存量前端客户端、外部自动化脚本及存量测试套件，  
> **我需要** 继续调用原有的 `/api/tables/:tableId/sync`、`/api/sync-table`、`/api/tables/:tableId/terms` 等历史接口，且入参及返回结果完全一致，  
> **以便于** 平台在新旧架构升级割接期间，无需强迫上游系统停机改造，做到“业务无感平滑切换”。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/compat/legacy-facade.routes.ts` (历史路由注册)
*   `server/src/compat/legacy-adapter.ts` (历史报文与新领域模型的双向转换器)
*   `server/src/compat/legacy-term.controller.ts` (历史请求控制器)
*   `server/test/compat/legacy-facade.test.ts` (历史接口 100% 幂等兼容测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 兼容的旧接口定义与映射
| 历史接口 | 请求方法 | 历史 Payload 契约 | 新系统领域服务映射 |
| :--- | :---: | :--- | :--- |
| `/api/tables/:tableId/sync` | `POST` | `{ added: [...], updated: [...], deletedIds: [...] }` | 映射为 `TermService` 内部单事务批量插入、多语种子表拆解更新及删除 |
| `/api/sync-table` | `POST` | 历史同义端点 | 同上，指向同一适配器 |
| `/api/tables/:tableId/terms` | `GET` | 无 / 查询参数 | 直接基于 `view_terms_legacy` 视图查询并输出单列 `translations` JSON |

### 3.2 报文转换逻辑 (Adapter Pattern)
```typescript
// server/src/compat/legacy-adapter.ts
export function adaptLegacyTermToV2(legacyItem: any, versionId: string) {
  return {
    versionId,
    kw: legacyItem.kw,
    zhCn: legacyItem.zh_cn || legacyItem.sourceText,
    maxChars: legacyItem.max_chars,
    isLocked: Boolean(legacyItem.is_locked),
    // 自动将单列 translations JSON 拆解为行级数据
    translations: typeof legacyItem.translations === 'string'
      ? JSON.parse(legacyItem.translations)
      : (legacyItem.translations || {}),
  };
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 向 `POST /api/tables/:tableId/sync` 提交包含 `added` 的报文，新词条及其各语种成功落库到 `terms` 与 `term_translations`；
- [ ] 提交包含 `updated` 的报文（包含修改德语与新增韩语），数据精准更新并无损新增韩语翻译行；
- [ ] 提交包含 `deletedIds` 的报文，成功软删除或硬删除对应词条；
- [ ] 返回的响应体结构与历史 Express 完全相同（包含 `success: true, updatedRecords: ...`）；
- [ ] 访问 `GET /api/tables/:tableId/terms`，返回的数据格式与历史结构 100% 对齐（含 `translations` 与 `translations_meta` 聚合 JSON）。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:legacy-facade
# 或运行独立测试
npx tsx server/test/compat/legacy-facade.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 现有历史测试脚本对准该接口运行时全量绿标通过；
2. 异常输入（如非法 JSON）返回与历史兼容的错误码与提示。
