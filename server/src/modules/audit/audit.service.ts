import { eq, and, desc, sql } from 'drizzle-orm';
import { initDatabase, schema } from '../../common/database/db.client.js';
import { computeMyersDiff, DiffChunk } from './myers-diff.js';

export interface CaptureChangeEvent {
  termId: string;
  versionId: string;
  kw: string;
  targetLang?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLLBACK' | 'DIFF_APPLY' | 'AI_TRANSLATE';
  oldValue?: string | null;
  newValue?: string | null;
  operatorId: string;
  operatorName: string;
  sourceType?: 'human' | 'ai' | 'tm';
  reason?: string;
  details?: Record<string, any>;
}

export interface QueryAuditLogsParams {
  versionId?: string;
  termId?: string;
  kw?: string;
  targetLang?: string;
  operator?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export class ChangeAuditService {
  constructor(private dbClient?: any) {}

  private async getDb() {
    if (this.dbClient) return this.dbClient;
    const { db } = await initDatabase();
    return db;
  }

  /**
   * 捕获并记录一条字段级变更审计日志
   */
  async captureChange(event: CaptureChangeEvent, tx?: any) {
    const db = tx || (await this.getDb());

    let charDiff: DiffChunk[] = [];
    if (event.oldValue !== undefined || event.newValue !== undefined) {
      charDiff = computeMyersDiff(event.oldValue || '', event.newValue || '');
    }

    const operatorStr = `${event.operatorName} (${event.operatorId})`;
    const detailsObj = {
      field: event.targetLang ? 'translation_text' : 'metadata',
      targetLang: event.targetLang || null,
      oldValue: event.oldValue || '',
      newValue: event.newValue || '',
      charDiff,
      sourceType: event.sourceType || 'human',
      reason: event.reason,
      ...(event.details || {}),
    };

    const [record] = await db
      .insert(schema.auditChangeLogs)
      .values({
        versionId: event.versionId,
        termId: event.termId,
        kw: event.kw,
        targetLang: event.targetLang || null,
        action: event.action,
        oldValue: event.oldValue ?? null,
        newValue: event.newValue ?? null,
        details: JSON.stringify(detailsObj),
        operator: operatorStr,
      })
      .returning();

    return {
      ...record,
      parsedDetails: detailsObj,
    };
  }

  /**
   * 记录 DIFF_APPLY 批量差异合并全局审计
   */
  async logDiffApplyAudit(
    tx: any,
    payload: { sourceVersionId: string; targetVersionId: string; selectedKws: string[] },
    result: any,
    operator: { id: string; name: string }
  ) {
    const db = tx || (await this.getDb());
    const operatorStr = `${operator.name} (${operator.id})`;

    const [record] = await db
      .insert(schema.auditChangeLogs)
      .values({
        versionId: payload.targetVersionId,
        termId: '00000000-0000-0000-0000-000000000000',
        kw: `[BATCH_APPLY] ${payload.selectedKws.length} items`,
        targetLang: null,
        action: 'DIFF_APPLY',
        oldValue: `SourceVersion: ${payload.sourceVersionId}`,
        newValue: `TargetVersion: ${payload.targetVersionId}`,
        details: JSON.stringify({
          sourceVersionId: payload.sourceVersionId,
          targetVersionId: payload.targetVersionId,
          selectedKws: payload.selectedKws,
          result,
        }),
        operator: operatorStr,
      })
      .returning();

    return record;
  }

  /**
   * 多条件组合分页检索变更审计日志
   */
  async queryLogs(params: QueryAuditLogsParams) {
    const db = await this.getDb();
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const offset = Math.max(params.offset || 0, 0);

    const conditions = [];

    if (params.versionId) {
      conditions.push(eq(schema.auditChangeLogs.versionId, params.versionId));
    }
    if (params.termId) {
      conditions.push(eq(schema.auditChangeLogs.termId, params.termId));
    }
    if (params.kw) {
      conditions.push(eq(schema.auditChangeLogs.kw, params.kw));
    }
    if (params.targetLang !== undefined) {
      if (params.targetLang === null || params.targetLang === '') {
        conditions.push(sql`${schema.auditChangeLogs.targetLang} IS NULL`);
      } else {
        conditions.push(eq(schema.auditChangeLogs.targetLang, params.targetLang));
      }
    }
    if (params.action) {
      conditions.push(eq(schema.auditChangeLogs.action, params.action));
    }
    if (params.operator) {
      conditions.push(sql`${schema.auditChangeLogs.operator} LIKE ${`%${params.operator}%`}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.auditChangeLogs)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select()
      .from(schema.auditChangeLogs)
      .where(whereClause)
      .orderBy(desc(schema.auditChangeLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r: any) => ({
      ...r,
      parsedDetails: r.details ? safeJsonParse(r.details) : null,
    }));

    return {
      total,
      limit,
      offset,
      items,
    };
  }
}

function safeJsonParse(val: string) {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}
