import { eq, desc, inArray } from 'drizzle-orm';
import { initDatabase, schema } from '../../common/database/db.client.js';
import { EntityNotFoundError } from '../../common/errors/domain-errors.js';

export interface TermSnapshotPayload {
  termId: string;
  versionId: string;
  kw: string;
  zhCn: string;
  context?: string | null;
  ownerComponent?: string | null;
  maxChars?: number | null;
  isLocked: boolean;
  sortOrder: number;
  translations: Record<
    string,
    {
      text: string;
      sourceType: string;
      updatedAt?: string;
      updatedBy?: string;
    }
  >;
}

export interface CreateSnapshotParams {
  termId: string;
  versionId?: string;
  operatorId: string;
  operatorName: string;
  reason: 'MANUAL_EDIT' | 'BATCH_TRANSLATE' | 'DIFF_APPLY' | 'ROLLBACK_BACKUP';
}

export class SnapshotService {
  constructor(private dbClient?: any) {}

  private async getDb() {
    if (this.dbClient) return this.dbClient;
    const { db } = await initDatabase();
    return db;
  }

  /**
   * 拍摄并落库一份不可变全量词条快照
   */
  async createSnapshot(params: CreateSnapshotParams, tx?: any) {
    const db = tx || (await this.getDb());

    // 1. 查询词条主表
    const [term] = await db
      .select()
      .from(schema.terms)
      .where(eq(schema.terms.id, params.termId));

    if (!term) {
      throw new EntityNotFoundError('词条', params.termId);
    }

    // 2. 查询词条所有语言的翻译
    const translations = await db
      .select()
      .from(schema.termTranslations)
      .where(eq(schema.termTranslations.termId, params.termId));

    const translationMap: TermSnapshotPayload['translations'] = {};
    for (const t of translations) {
      translationMap[t.languageCode] = {
        text: t.translationText,
        sourceType: t.sourceType,
        updatedAt: t.updatedAt?.toISOString ? t.updatedAt.toISOString() : String(t.updatedAt),
        updatedBy: t.updatedBy,
      };
    }

    const snapshotPayload: TermSnapshotPayload = {
      termId: term.id,
      versionId: term.versionId,
      kw: term.kw,
      zhCn: term.zhCn,
      context: term.context,
      ownerComponent: term.ownerComponent,
      maxChars: term.maxChars,
      isLocked: term.isLocked,
      sortOrder: term.sortOrder,
      translations: translationMap,
    };

    const operatorStr = `${params.operatorName} (${params.operatorId})`;

    const [snapshot] = await db
      .insert(schema.termSnapshots)
      .values({
        termId: term.id,
        versionId: term.versionId,
        snapshotState: snapshotPayload,
        reason: params.reason,
        operator: operatorStr,
      })
      .returning();

    return snapshot;
  }

  /**
   * 后悔药核心触发器：在执行回滚或高危覆盖前，备份当前受影响词条数据
   */
  async captureRegretBackup(
    termId: string,
    operator: { id: string; name: string },
    tx?: any
  ) {
    return await this.createSnapshot(
      {
        termId,
        operatorId: operator.id,
        operatorName: operator.name,
        reason: 'ROLLBACK_BACKUP',
      },
      tx
    );
  }

  /**
   * 批量为版本下的多个词条拍摄后悔药备份快照 (用于选择性 Diff 合并等批量动作)
   */
  async batchBackupTerms(
    versionId: string,
    kws: string[],
    operator: { id: string; name: string },
    tx?: any
  ) {
    if (!kws || kws.length === 0) return [];
    const db = tx || (await this.getDb());

    const targetTerms = await db
      .select({ id: schema.terms.id, kw: schema.terms.kw })
      .from(schema.terms)
      .where(inArray(schema.terms.kw, kws));

    const snapshots = [];
    for (const term of targetTerms) {
      const snap = await this.captureRegretBackup(term.id, operator, tx);
      snapshots.push(snap);
    }

    return snapshots;
  }

  /**
   * 查询指定词条的快照历史列表 (时间倒序)
   */
  async getSnapshotsByTerm(termId: string, limit = 50, offset = 0) {
    const db = await this.getDb();
    const rows = await db
      .select()
      .from(schema.termSnapshots)
      .where(eq(schema.termSnapshots.termId, termId))
      .orderBy(desc(schema.termSnapshots.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  /**
   * 获取单条快照详情
   */
  async getSnapshotById(snapshotId: string, tx?: any) {
    const db = tx || (await this.getDb());
    const [row] = await db
      .select()
      .from(schema.termSnapshots)
      .where(eq(schema.termSnapshots.id, snapshotId));

    if (!row) {
      throw new EntityNotFoundError('时光机快照', snapshotId);
    }
    return row;
  }
}
