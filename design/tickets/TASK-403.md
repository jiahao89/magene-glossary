# 【TASK-403】一键选择性增量合并同步 Selective Apply Diff

*   **工单编号**：`TASK-403`
*   **所属 Epic**：`Epic 4: 固件版本对比 Diff 引擎`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-402`](./TASK-402.md), [`TASK-302`](./TASK-302.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 固件发版负责人，  
> **我需要** 在比对出的差异列表中，勾选部分可信的新增或修改词条（或指定语种），一键执行“选择性合并（Selective Apply）”同步到目标版本中，且操作全程受“后悔药快照”保护，  
> **以便于** 避免传统“要么全量覆盖、要么手工一条条复制”的低效与易错风险，支持跨硬件分支的灰度特性快速 cherry-pick。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/diff/apply-diff.service.ts` (选择性合并原子事务编排)
*   `server/src/modules/diff/diff.controller.ts` (挂载合并接口)
*   `server/src/modules/diff/diff.routes.ts` (路由：`POST /api/v2/diff/apply`)
*   `server/test/modules/diff/apply-diff.service.test.ts` (选择性合并与事务回滚测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 请求载荷契约
```typescript
// POST /api/v2/diff/apply
export interface ApplyDiffPayload {
  sourceVersionId: string;
  targetVersionId: string;
  selectedKws: string[]; // 选中的 KW 列表
  selectedLangs?: string[]; // 可选：仅同步指定的语言列表
  strategy: 'OVERWRITE' | 'SKIP_EXISTING';
}
```

### 3.2 事务原子性与后悔药编排
```typescript
// server/src/modules/diff/apply-diff.service.ts
export class ApplyDiffService {
  async applySelectedDiff(payload: ApplyDiffPayload, operator: any) {
    return await db.transaction(async (tx) => {
      // 1. 检查目标版本是否封板（封板则禁止写入）
      const targetVersion = await tx.query.versions.findFirst({
        where: eq(versions.id, payload.targetVersionId),
      });
      if (targetVersion?.isSealed) throw new SealedVersionError("目标固件版本已封板，禁止合并");

      // 2. 针对受影响的目标词条批量生成 ROLLBACK_BACKUP 快照 (后悔药)
      await this.snapshotService.batchBackupTerms(tx, payload.targetVersionId, payload.selectedKws);

      // 3. 执行合并：新增不存在的词条，更新指定语言的翻译
      const result = await this.executeSync(tx, payload, operator);

      // 4. 写入一条 action='DIFF_APPLY' 的全局审计日志
      await this.auditService.logDiffApplyAudit(tx, payload, result, operator);

      return result;
    });
  }
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 勾选 5 条新增词条与 3 条修改词条提交合并，目标版本精准增补与更新，其余词条完全不受影响；
- [ ] 限制 `selectedLangs=['de']` 时，仅同步德语译文，其他语种在目标版本中保持原状；
- [ ] 合并发生前，自动为目标词条创建 `ROLLBACK_BACKUP` 快照；
- [ ] 事务容灾测试：中间任何步骤发生 SQL 异常，目标版本全量回滚，不产生半同步脏数据；
- [ ] 目标版本封板保护：向已封板的目标版本提交合并，返回 403 明确拦截。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:apply-diff
# 或运行独立测试
npx tsx server/test/modules/diff/apply-diff.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试与集成测试覆盖单语种覆盖、整条插入与异常回滚；
2. 合并后调用 `view_terms_legacy` 视图校验，数据无缝更新。
