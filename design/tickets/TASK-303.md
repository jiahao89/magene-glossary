# 【TASK-303】时光机一键回退事务与二次撤销安全保障

*   **工单编号**：`TASK-303`
*   **所属 Epic**：`Epic 3: 全维度细粒度变更审计与时光机`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-302`](./TASK-302.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 词条编辑人员或固件负责人，  
> **我需要** 在词条历史时间轴上选择任意一个历史快照，一键执行“时光机回退”，将词条恢复至该快照时刻的状态，且如果不慎选错快照，还能再次通过“后悔药快照”一键撤销回退，  
> **以便于** 在免除沉重审批流程的同时，提供金融级的容灾撤销能力，保障协同效率与数据安全兼得。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/audit/rollback.service.ts` (单事务回退编排与双向可逆执行引擎)
*   `server/src/modules/audit/rollback.controller.ts` (时光机回退端点)
*   `server/src/modules/audit/audit.routes.ts` (路由：`POST /api/v2/audit/snapshots/:snapshotId/rollback`)
*   `server/test/modules/audit/rollback.service.test.ts` (双向回滚可逆性集成测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 单一事务双向回退编排流
```typescript
// server/src/modules/audit/rollback.service.ts
export class TimeMachineRollbackService {
  async rollbackToSnapshot(
    snapshotId: string, 
    operator: { id: string; name: string }
  ): Promise<RollbackResult> {
    return await db.transaction(async (tx) => {
      // 1. 读取目标快照数据
      const targetSnapshot = await tx.query.termSnapshots.findFirst({
        where: eq(termSnapshots.id, snapshotId),
      });
      if (!targetSnapshot) throw new NotFoundError("目标时光机快照不存在");

      // 2. 校验所属版本封板状态
      const version = await tx.query.versions.findFirst({
        where: eq(versions.id, targetSnapshot.versionId),
      });
      if (version?.isSealed) throw new SealedVersionError("所属固件版本已封板，禁止回退");

      // 3. 【后悔药核心防线】捕获当前最新数据生成 ROLLBACK_BACKUP 快照
      const regretBackupId = await this.captureRegretBackup(tx, targetSnapshot.termId, operator);

      // 4. 用快照内容全量覆盖词条主表与多语种子表
      await this.restoreTermData(tx, targetSnapshot);

      // 5. 记录一条 action='ROLLBACK' 的审计日志，记录回退来源与新快照引用
      await this.logRollbackAudit(tx, targetSnapshot, regretBackupId, operator);

      return {
        success: true,
        restoredTermId: targetSnapshot.termId,
        regretBackupSnapshotId: regretBackupId,
        message: "时光机回退成功，系统已自动备份当前数据至后悔药快照",
      };
    });
  }
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 调用 `POST /api/v2/audit/snapshots/:id/rollback`，词条中文原文、max_chars 与全语言译文精准恢复为该快照当时的状态；
- [ ] 强原子性验证：若回退过程中断电或抛出异常，整个回退事务完整回滚，现有数据零污染；
- [ ] 后悔药二次回退验证：连续执行两次回退（先回退到版本 A，再立即选择生成的后悔药快照回退），数据与回退前完全一致（0 误差）；
- [ ] 封板阻断：对已封板固件版本的快照发起回退，返回 403 明确拦截；
- [ ] 视图兼容：回退后，`view_terms_legacy` 视图实时感知并呈现回退后的翻译内容。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:rollback-service
# 或运行独立测试
npx tsx server/test/modules/audit/rollback.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 双向回退与后悔药撤销单元测试用例通过；
2. 异常回退场景事务回滚覆盖率 100%。
