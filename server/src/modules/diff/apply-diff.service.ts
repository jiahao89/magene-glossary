import { eq, inArray, and } from 'drizzle-orm';
import { initDatabase, schema } from '../../common/database/db.client.js';
import { SealedVersionError, EntityNotFoundError } from '../../common/errors/domain-errors.js';
import { SnapshotService } from '../audit/snapshot.service.js';
import { ChangeAuditService } from '../audit/audit.service.js';

export interface ApplyDiffPayload {
  sourceVersionId: string;
  targetVersionId: string;
  selectedKws: string[];
  selectedLangs?: string[];
  strategy?: 'OVERWRITE' | 'SKIP_EXISTING';
}

export interface ApplyDiffResult {
  success: boolean;
  appliedTermsCount: number;
  insertedCount: number;
  updatedCount: number;
  appliedKws: string[];
}

export class ApplyDiffService {
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
   * 执行选择性差异合并原子同步
   */
  async applySelectedDiff(
    payload: ApplyDiffPayload,
    operator: { id: string; name: string }
  ): Promise<ApplyDiffResult> {
    const db = await this.getDb();
    const strategy = payload.strategy || 'OVERWRITE';

    return await db.transaction(async (tx: any) => {
      // 1. 检查目标版本封板状态
      const [targetVersion] = await tx
        .select()
        .from(schema.versions)
        .where(eq(schema.versions.id, payload.targetVersionId));

      if (!targetVersion) {
        throw new EntityNotFoundError('目标版本', payload.targetVersionId);
      }
      if (targetVersion.isSealed) {
        throw new SealedVersionError('目标固件版本已封板，禁止合并');
      }

      const [sourceVersion] = await tx
        .select()
        .from(schema.versions)
        .where(eq(schema.versions.id, payload.sourceVersionId));

      if (!sourceVersion) {
        throw new EntityNotFoundError('源版本', payload.sourceVersionId);
      }

      if (!payload.selectedKws || payload.selectedKws.length === 0) {
        return {
          success: true,
          appliedTermsCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          appliedKws: [],
        };
      }

      // 2. 【安全防线】针对受影响的目标词条批量拍摄后悔药快照
      await this.snapshotService.batchBackupTerms(
        payload.targetVersionId,
        payload.selectedKws,
        operator,
        tx
      );

      // 3. 读取源版本中的选中词条及其多语言
      const sourceTerms = await tx
        .select()
        .from(schema.terms)
        .where(
          and(
            eq(schema.terms.versionId, payload.sourceVersionId),
            inArray(schema.terms.kw, payload.selectedKws)
          )
        );

      const sourceTermIds = sourceTerms.map((t: any) => t.id);
      const sourceTranslations =
        sourceTermIds.length > 0
          ? await tx
              .select()
              .from(schema.termTranslations)
              .where(inArray(schema.termTranslations.termId, sourceTermIds))
          : [];

      const sourceTransMap = new Map<string, any[]>();
      for (const st of sourceTranslations) {
        if (!sourceTransMap.has(st.termId)) sourceTransMap.set(st.termId, []);
        sourceTransMap.get(st.termId)!.push(st);
      }

      // 4. 读取目标版本中现存的选中词条
      const targetExistingTerms = await tx
        .select()
        .from(schema.terms)
        .where(
          and(
            eq(schema.terms.versionId, payload.targetVersionId),
            inArray(schema.terms.kw, payload.selectedKws)
          )
        );

      const targetTermMap = new Map<string, any>();
      for (const tt of targetExistingTerms) {
        targetTermMap.set(tt.kw, tt);
      }

      let insertedCount = 0;
      let updatedCount = 0;
      const operatorStr = `${operator.name} (${operator.id})`;

      for (const sTerm of sourceTerms) {
        const tTerm = targetTermMap.get(sTerm.kw);
        const transList = sourceTransMap.get(sTerm.id) || [];

        // 语言筛选器
        const filteredTrans = payload.selectedLangs
          ? transList.filter((tr) => payload.selectedLangs!.includes(tr.languageCode))
          : transList;

        if (!tTerm) {
          // 目标版本不存在该词条 -> 新增整条词条
          const [newTerm] = await tx
            .insert(schema.terms)
            .values({
              versionId: payload.targetVersionId,
              kw: sTerm.kw,
              zhCn: sTerm.zhCn,
              context: sTerm.context || '',
              ownerComponent: sTerm.ownerComponent || '',
              maxChars: sTerm.maxChars ?? 0,
              isLocked: false,
              sortOrder: sTerm.sortOrder ?? 0,
              updatedBy: operatorStr,
            })
            .returning();

          if (filteredTrans.length > 0) {
            await tx.insert(schema.termTranslations).values(
              filteredTrans.map((tr) => ({
                termId: newTerm.id,
                languageCode: tr.languageCode,
                translationText: tr.translationText,
                sourceType: tr.sourceType || 'human',
                updatedBy: operatorStr,
              }))
            );
          }
          insertedCount++;
        } else {
          // 目标版本已存在词条 -> 根据策略同步
          if (strategy === 'OVERWRITE') {
            await tx
              .update(schema.terms)
              .set({
                zhCn: sTerm.zhCn,
                context: sTerm.context || '',
                ownerComponent: sTerm.ownerComponent || '',
                maxChars: sTerm.maxChars ?? 0,
                sortOrder: sTerm.sortOrder ?? 0,
                updatedAt: new Date(),
                updatedBy: operatorStr,
              })
              .where(eq(schema.terms.id, tTerm.id));

            for (const tr of filteredTrans) {
              const existingTrans = await tx
                .select()
                .from(schema.termTranslations)
                .where(
                  and(
                    eq(schema.termTranslations.termId, tTerm.id),
                    eq(schema.termTranslations.languageCode, tr.languageCode)
                  )
                );

              if (existingTrans.length > 0) {
                await tx
                  .update(schema.termTranslations)
                  .set({
                    translationText: tr.translationText,
                    sourceType: tr.sourceType || 'human',
                    updatedAt: new Date(),
                    updatedBy: operatorStr,
                  })
                  .where(eq(schema.termTranslations.id, existingTrans[0].id));
              } else {
                await tx.insert(schema.termTranslations).values({
                  termId: tTerm.id,
                  languageCode: tr.languageCode,
                  translationText: tr.translationText,
                  sourceType: tr.sourceType || 'human',
                  updatedBy: operatorStr,
                });
              }
            }
            updatedCount++;
          } else if (strategy === 'SKIP_EXISTING') {
            // 仅对不存在的语种补全
            for (const tr of filteredTrans) {
              const existingTrans = await tx
                .select()
                .from(schema.termTranslations)
                .where(
                  and(
                    eq(schema.termTranslations.termId, tTerm.id),
                    eq(schema.termTranslations.languageCode, tr.languageCode)
                  )
                );

              if (existingTrans.length === 0) {
                await tx.insert(schema.termTranslations).values({
                  termId: tTerm.id,
                  languageCode: tr.languageCode,
                  translationText: tr.translationText,
                  sourceType: tr.sourceType || 'human',
                  updatedBy: operatorStr,
                });
              }
            }
            updatedCount++;
          }
        }
      }

      const result: ApplyDiffResult = {
        success: true,
        appliedTermsCount: insertedCount + updatedCount,
        insertedCount,
        updatedCount,
        appliedKws: payload.selectedKws,
      };

      // 5. 写入一条全局差异合并审计日志
      await this.auditService.logDiffApplyAudit(tx, payload, result, operator);

      return result;
    });
  }
}
