import { eq, and, sql, ilike, or, desc, asc } from 'drizzle-orm';
import { schema } from '../../common/database/db.client.js';
import { CreateTermDto, QueryTermsDto, UpdateTermDto } from './term.schema.js';

export class TermRepository {
  constructor(private db: any) {}

  async findVersionById(versionId: string) {
    const rows = await this.db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.id, versionId))
      .limit(1);
    return rows[0] || null;
  }

  async findTermById(termId: string) {
    const rows = await this.db
      .select()
      .from(schema.terms)
      .where(eq(schema.terms.id, termId))
      .limit(1);
    return rows[0] || null;
  }

  async findTermByKw(versionId: string, kw: string) {
    const rows = await this.db
      .select()
      .from(schema.terms)
      .where(and(eq(schema.terms.versionId, versionId), eq(schema.terms.kw, kw)))
      .limit(1);
    return rows[0] || null;
  }

  async findTermWithTranslations(termId: string) {
    const term = await this.findTermById(termId);
    if (!term) return null;

    const translations = await this.db
      .select()
      .from(schema.termTranslations)
      .where(eq(schema.termTranslations.termId, termId));

    const transMap: Record<string, string> = {};
    const metaMap: Record<string, string> = {};
    for (const t of translations) {
      transMap[t.languageCode] = t.translationText;
      metaMap[t.languageCode] = t.sourceType;
    }

    return {
      ...term,
      translations: transMap,
      translationsMeta: metaMap,
      rawTranslations: translations,
    };
  }

  async createTerm(dto: CreateTermDto, operator: string) {
    return await this.db.transaction(async (tx: any) => {
      const [term] = await tx
        .insert(schema.terms)
        .values({
          versionId: dto.versionId,
          kw: dto.kw,
          zhCn: dto.zhCn,
          context: dto.context,
          ownerComponent: dto.ownerComponent,
          maxChars: dto.maxChars,
          isLocked: dto.isLocked,
          sortOrder: dto.sortOrder,
          updatedBy: operator,
        })
        .returning();

      // 插入多语种子表行
      const langEntries = Object.entries(dto.translations || {});
      if (langEntries.length > 0) {
        await tx.insert(schema.termTranslations).values(
          langEntries.map(([lang, text]) => ({
            termId: term.id,
            languageCode: lang,
            translationText: text,
            sourceType: 'human',
            updatedBy: operator,
          }))
        );
      }

      return term;
    });
  }

  async updateTerm(termId: string, dto: UpdateTermDto, operator: string) {
    const updateValues: Record<string, any> = {
      updatedBy: operator,
      updatedAt: new Date(),
    };

    if (dto.zhCn !== undefined) updateValues.zhCn = dto.zhCn;
    if (dto.context !== undefined) updateValues.context = dto.context;
    if (dto.ownerComponent !== undefined) updateValues.ownerComponent = dto.ownerComponent;
    if (dto.maxChars !== undefined) updateValues.maxChars = dto.maxChars;
    if (dto.isLocked !== undefined) updateValues.isLocked = dto.isLocked;
    if (dto.sortOrder !== undefined) updateValues.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(schema.terms)
      .set(updateValues)
      .where(eq(schema.terms.id, termId))
      .returning();

    return updated;
  }

  async deleteTerm(termId: string) {
    const [deleted] = await this.db
      .delete(schema.terms)
      .where(eq(schema.terms.id, termId))
      .returning();
    return deleted;
  }

  async upsertTranslation(
    termId: string,
    languageCode: string,
    translationText: string,
    sourceType: string,
    operator: string
  ) {
    return await this.db.transaction(async (tx: any) => {
      // 检查是否已存在该语种行
      const existing = await tx
        .select()
        .from(schema.termTranslations)
        .where(
          and(
            eq(schema.termTranslations.termId, termId),
            eq(schema.termTranslations.languageCode, languageCode)
          )
        )
        .limit(1);

      let record;
      if (existing.length > 0) {
        const [updated] = await tx
          .update(schema.termTranslations)
          .set({
            translationText,
            sourceType,
            updatedBy: operator,
            updatedAt: new Date(),
          })
          .where(eq(schema.termTranslations.id, existing[0].id))
          .returning();
        record = updated;
      } else {
        const [inserted] = await tx
          .insert(schema.termTranslations)
          .values({
            termId,
            languageCode,
            translationText,
            sourceType,
            updatedBy: operator,
          })
          .returning();
        record = inserted;
      }

      // 同步更新主表的 updatedAt 与 updatedBy
      await tx
        .update(schema.terms)
        .set({ updatedAt: new Date(), updatedBy: operator })
        .where(eq(schema.terms.id, termId));

      return record;
    });
  }

  async queryTermsByVersion(versionId: string, query: QueryTermsDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(schema.terms.versionId, versionId)];

    if (query.keyword) {
      const kwPattern = `%${query.keyword}%`;
      conditions.push(
        or(
          ilike(schema.terms.kw, kwPattern),
          ilike(schema.terms.zhCn, kwPattern),
          ilike(schema.terms.context, kwPattern)
        )!
      );
    }

    if (query.subsystem) {
      conditions.push(eq(schema.terms.ownerComponent, query.subsystem));
    }

    if (query.isLocked !== undefined) {
      conditions.push(eq(schema.terms.isLocked, query.isLocked));
    }

    const whereClause = and(...conditions);

    // 查询总数
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.terms)
      .where(whereClause);
    const totalCount = countResult[0]?.count || 0;

    // 分页查询主表数据
    const termRows = await this.db
      .select()
      .from(schema.terms)
      .where(whereClause)
      .orderBy(asc(schema.terms.sortOrder), desc(schema.terms.updatedAt))
      .limit(pageSize)
      .offset(offset);

    if (termRows.length === 0) {
      return { items: [], total: totalCount, page, pageSize };
    }

    // 聚合查询所选词条的各语种翻译
    const termIds = termRows.map((t: any) => t.id);
    const translationRows = await this.db
      .select()
      .from(schema.termTranslations)
      .where(sql`${schema.termTranslations.termId} IN ${termIds}`);

    const transByTermId = new Map<string, { trans: Record<string, string>; meta: Record<string, string> }>();
    for (const t of translationRows) {
      if (!transByTermId.has(t.termId)) {
        transByTermId.set(t.termId, { trans: {}, meta: {} });
      }
      const entry = transByTermId.get(t.termId)!;
      entry.trans[t.languageCode] = t.translationText;
      entry.meta[t.languageCode] = t.sourceType;
    }

    const items = termRows.map((t: any) => {
      const child = transByTermId.get(t.id) || { trans: {}, meta: {} };
      return {
        ...t,
        translations: child.trans,
        translationsMeta: child.meta,
      };
    });

    return {
      items,
      total: totalCount,
      page,
      pageSize,
    };
  }
}
