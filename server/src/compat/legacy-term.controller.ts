import { FastifyRequest, FastifyReply } from 'fastify';
import { TermService } from '../modules/term/term.service.js';
import { adaptLegacyTermToV2, adaptV2TermToLegacy, LegacySyncPayload } from './legacy-adapter.js';
import { schema } from '../common/database/db.client.js';
import { eq, sql } from 'drizzle-orm';

export class LegacyTermController {
  constructor(private service: TermService, private db: any) {}

  private async resolveVersionId(paramId: string): Promise<string> {
    // 检查 paramId 是否直接是有效的 versionId
    const v = await this.db.select().from(schema.versions).where(eq(schema.versions.id, paramId)).limit(1);
    if (v.length > 0) return v[0].id;

    // 否则尝试取第一个未封板版本或最新版本
    const latest = await this.db.select().from(schema.versions).orderBy(sql`${schema.versions.createdAt} DESC`).limit(1);
    if (latest.length > 0) return latest[0].id;

    throw new Error('未找到关联的固件版本');
  }

  async handleSync(
    request: FastifyRequest<{ Params: { tableId?: string }; Body: LegacySyncPayload }>,
    reply: FastifyReply
  ) {
    const versionId = await this.resolveVersionId(request.params.tableId || (request.body as any)?.tableId || '');
    const body = (request.body || {}) as LegacySyncPayload;
    const operator = request.userContext?.operatorName || 'Legacy-Sync-Client';

    const results = {
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
    };

    // 1. 处理新增项 (Added)
    if (Array.isArray(body.added)) {
      for (const item of body.added) {
        const v2Dto = adaptLegacyTermToV2(item, versionId);
        await this.service.createTerm(v2Dto, operator);
        results.addedCount++;
      }
    }

    // 2. 处理修改项 (Updated)
    if (Array.isArray(body.updated)) {
      for (const item of body.updated) {
        const termId = item.id;
        if (!termId) continue;

        // 更新主表元数据
        await this.service.updateTerm(
          termId,
          {
            zhCn: item.zh_cn || item.sourceText,
            context: item.context,
            ownerComponent: item.owner_component,
            maxChars: item.max_chars !== undefined ? Number(item.max_chars) : undefined,
            isLocked: item.is_locked !== undefined ? Boolean(item.is_locked) : undefined,
          },
          operator
        );

        // 更新/新增单语种翻译
        let translationsObj: Record<string, string> = {};
        if (typeof item.translations === 'string') {
          try {
            translationsObj = JSON.parse(item.translations);
          } catch {
            translationsObj = {};
          }
        } else if (item.translations && typeof item.translations === 'object') {
          translationsObj = item.translations;
        }

        for (const [lang, text] of Object.entries(translationsObj)) {
          await this.service.upsertTranslation(
            termId,
            { languageCode: lang, translationText: text, sourceType: 'human' },
            operator
          );
        }

        results.updatedCount++;
      }
    }

    // 3. 处理删除项 (Deleted)
    if (Array.isArray(body.deletedIds)) {
      for (const id of body.deletedIds) {
        await this.service.deleteTerm(id);
        results.deletedCount++;
      }
    }

    return reply.send({
      code: 200,
      status: 'success',
      message: '历史接口同步已完成',
      data: results,
    });
  }

  async handleGetTerms(
    request: FastifyRequest<{ Params: { tableId?: string } }>,
    reply: FastifyReply
  ) {
    const versionId = await this.resolveVersionId(request.params.tableId || '');

    // 查询向后兼容视图 view_terms_legacy
    const rows = await this.db.execute(
      sql`SELECT * FROM view_terms_legacy WHERE version_id = ${versionId} ORDER BY sort_order ASC, updated_at DESC`
    );

    const legacyItems = (rows.rows || rows || []).map((row: any) => ({
      id: row.id,
      kw: row.kw,
      zh_cn: row.zh_cn,
      sourceText: row.zh_cn,
      context: row.context,
      owner_component: row.owner_component,
      max_chars: row.max_chars,
      is_locked: row.is_locked,
      sort_order: row.sort_order,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      translations: typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations || {},
      translations_meta: typeof row.translations_meta === 'string' ? JSON.parse(row.translations_meta) : row.translations_meta || {},
    }));

    return reply.send({
      code: 200,
      status: 'success',
      data: legacyItems,
      total: legacyItems.length,
    });
  }
}
