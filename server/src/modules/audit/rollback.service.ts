import { eq } from 'drizzle-orm';
import { initDatabase, schema } from '../../common/database/db.client.js';
import {
  EntityNotFoundError,
  LockViolationError,
  SealedVersionError,
} from '../../common/errors/domain-errors.js';
import { SnapshotService, TermSnapshotPayload } from './snapshot.service.js';
import { ChangeAuditService } from './audit.service.js';

export interface RollbackResult {
  success: boolean;
  restoredTermId: string;
  regretBackupSnapshotId: string;
  message: string;
}

export class TimeMachineRollbackService {
  constructor(
    private snapshotService: SnapshotService,
    private auditService: ChangeAuditService,
    private dbClient?: any
  ) {}

  private async getDb() {
    if (this.dbClient) return this.dbClient;
    const { db } = await initDatabase();
    return db;
  }

  /**
   * 单一原子事务执行时光机回退，并自动生成可二次逆转的后悔药快照
   */
  async rollbackToSnapshot(
    snapshotId: string,
    operator: { id: string; name: string }
  ): Promise<RollbackResult> {
    const db = await this.getDb();

    return await db.transaction(async (tx: any) => {
      // 1. 读取目标快照数据
      const targetSnapshot = await this.snapshotService.getSnapshotById(snapshotId, tx);
      if (!targetSnapshot) {
        throw new EntityNotFoundError('时光机快照', snapshotId);
      }

      // 2. 校验所属版本封板状态
      const [version] = await tx
        .select()
        .from(schema.versions)
        .where(eq(schema.versions.id, targetSnapshot.versionId));

      if (version?.isSealed) {
        throw new SealedVersionError('所属固件版本已封板，禁止回退');
      }

      // 3. 校验词条当前状态 (防篡改锁)
      const [currentTerm] = await tx
        .select()
        .from(schema.terms)
        .where(eq(schema.terms.id, targetSnapshot.termId));

      if (!currentTerm) {
        throw new EntityNotFoundError('词条', targetSnapshot.termId);
      }

      if (currentTerm.isLocked) {
        throw new LockViolationError(`词条 '${currentTerm.kw}' 已被人工加锁锁定，禁止回退`);
      }

      // 4. 【后悔药核心防线】在覆写前，拍摄当前数据的 ROLLBACK_BACKUP 快照
      const regretBackup = await this.snapshotService.captureRegretBackup(
        targetSnapshot.termId,
        operator,
        tx
      );
      const regretBackupId = regretBackup.id;

      // 5. 用快照内容全量覆盖词条主表与多语种子表
      const snapshotState = targetSnapshot.snapshotState as TermSnapshotPayload;
      const operatorStr = `${operator.name} (${operator.id})`;

      await tx
        .update(schema.terms)
        .set({
          zhCn: snapshotState.zhCn,
          context: snapshotState.context || '',
          ownerComponent: snapshotState.ownerComponent || '',
          maxChars: snapshotState.maxChars ?? 0,
          sortOrder: snapshotState.sortOrder ?? 0,
          updatedAt: new Date(),
          updatedBy: operatorStr,
        })
        .where(eq(schema.terms.id, targetSnapshot.termId));

      // 重构多语言译文列表
      await tx
        .delete(schema.termTranslations)
        .where(eq(schema.termTranslations.termId, targetSnapshot.termId));

      if (snapshotState.translations && Object.keys(snapshotState.translations).length > 0) {
        const translationRows = Object.entries(snapshotState.translations).map(
          ([langCode, tInfo]) => ({
            termId: targetSnapshot.termId,
            languageCode: langCode,
            translationText: tInfo.text ?? '',
            sourceType: tInfo.sourceType ?? 'human',
            updatedAt: new Date(),
            updatedBy: operatorStr,
          })
        );
        await tx.insert(schema.termTranslations).values(translationRows);
      }

      // 6. 记录一条 action='ROLLBACK' 的审计日志，记录回退来源与新快照引用
      await this.auditService.captureChange(
        {
          termId: targetSnapshot.termId,
          versionId: targetSnapshot.versionId,
          kw: snapshotState.kw,
          targetLang: null,
          action: 'ROLLBACK',
          oldValue: `Current ZhCn: ${currentTerm.zhCn}`,
          newValue: `Restored ZhCn: ${snapshotState.zhCn}`,
          operatorId: operator.id,
          operatorName: operator.name,
          reason: `时光机回退至快照 ${snapshotId}`,
          details: {
            rollbackFromSnapshotId: snapshotId,
            regretBackupSnapshotId: regretBackupId,
          },
        },
        tx
      );

      return {
        success: true,
        restoredTermId: targetSnapshot.termId,
        regretBackupSnapshotId: regretBackupId,
        message: '时光机回退成功，系统已自动备份当前数据至后悔药快照',
      };
    });
  }
}
