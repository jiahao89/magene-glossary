import { eq, inArray } from 'drizzle-orm';
import { initDatabase, schema } from '../../common/database/db.client.js';
import { EntityNotFoundError } from '../../common/errors/domain-errors.js';
import { FalseDiffNormalizer } from './normalizer.js';

export interface DiffCompareParams {
  baseVersionId: string;
  targetVersionId: string;
  onlyLang?: string;
  hideFalseDiff?: boolean;
}

export interface LanguageDiffItem {
  status: 'ADD' | 'MOD' | 'DEL' | 'UNCHANGED';
  oldText?: string;
  newText?: string;
  isFalseDiff: boolean;
}

export interface TermDiffItem {
  kw: string;
  diffType: 'ADD' | 'MOD' | 'DEL' | 'UNCHANGED';
  baseTerm?: { id: string; zhCn: string; maxChars?: number | null };
  targetTerm?: { id: string; zhCn: string; maxChars?: number | null };
  hasMetaDiff: boolean;
  languageDiffs: Record<string, LanguageDiffItem>;
}

export interface DiffCompareResult {
  summary: {
    totalDiffCount: number;
    addCount: number;
    modCount: number;
    delCount: number;
    falseDiffSuppressed: number;
  };
  items: TermDiffItem[];
}

interface InternalTermData {
  id: string;
  kw: string;
  zhCn: string;
  maxChars?: number | null;
  translations: Map<string, string>;
}

export class DiffService {
  constructor(private dbClient?: any) {}

  private async getDb() {
    if (this.dbClient) return this.dbClient;
    const { db } = await initDatabase();
    return db;
  }

  /**
   * 双固件版本 3D 差异计算引擎
   */
  async compareVersions(params: DiffCompareParams): Promise<DiffCompareResult> {
    const db = await this.getDb();
    const hideFalseDiff = params.hideFalseDiff ?? true;

    // 1. 验证基准版本与目标版本均存在
    const [baseVersion] = await db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.id, params.baseVersionId));
    if (!baseVersion) {
      throw new EntityNotFoundError('基准版本 (baseVersion)', params.baseVersionId);
    }

    const [targetVersion] = await db
      .select()
      .from(schema.versions)
      .where(eq(schema.versions.id, params.targetVersionId));
    if (!targetVersion) {
      throw new EntityNotFoundError('目标版本 (targetVersion)', params.targetVersionId);
    }

    // 2. 并行加载两个版本的词条与译文
    const [baseTermsMap, targetTermsMap] = await Promise.all([
      this.loadVersionTerms(params.baseVersionId, db),
      this.loadVersionTerms(params.targetVersionId, db),
    ]);

    // 3. 构建全量 KW 集合
    const allKws = new Set<string>([
      ...baseTermsMap.keys(),
      ...targetTermsMap.keys(),
    ]);

    let addCount = 0;
    let modCount = 0;
    let delCount = 0;
    let falseDiffSuppressed = 0;
    const diffItems: TermDiffItem[] = [];

    for (const kw of allKws) {
      const base = baseTermsMap.get(kw);
      const target = targetTermsMap.get(kw);

      if (!base && target) {
        // 新增 (ADD)
        const langDiffs: Record<string, LanguageDiffItem> = {};
        for (const [lang, text] of target.translations.entries()) {
          langDiffs[lang] = {
            status: 'ADD',
            oldText: undefined,
            newText: text,
            isFalseDiff: false,
          };
        }

        const item: TermDiffItem = {
          kw,
          diffType: 'ADD',
          baseTerm: undefined,
          targetTerm: { id: target.id, zhCn: target.zhCn, maxChars: target.maxChars },
          hasMetaDiff: true,
          languageDiffs: langDiffs,
        };

        if (this.matchesLangFilter(item, params.onlyLang, hideFalseDiff)) {
          addCount++;
          diffItems.push(item);
        }
      } else if (base && !target) {
        // 删除 (DEL)
        const langDiffs: Record<string, LanguageDiffItem> = {};
        for (const [lang, text] of base.translations.entries()) {
          langDiffs[lang] = {
            status: 'DEL',
            oldText: text,
            newText: undefined,
            isFalseDiff: false,
          };
        }

        const item: TermDiffItem = {
          kw,
          diffType: 'DEL',
          baseTerm: { id: base.id, zhCn: base.zhCn, maxChars: base.maxChars },
          targetTerm: undefined,
          hasMetaDiff: true,
          languageDiffs: langDiffs,
        };

        if (this.matchesLangFilter(item, params.onlyLang, hideFalseDiff)) {
          delCount++;
          diffItems.push(item);
        }
      } else if (base && target) {
        // 两版本均存在，进行细粒度三维差异对账
        const zhAnalysis = FalseDiffNormalizer.analyzeDiff(base.zhCn, target.zhCn);
        const maxCharsChanged = (base.maxChars ?? 0) !== (target.maxChars ?? 0);

        let termHasFalseDiff = zhAnalysis.isFalseDiff;
        let termHasRealDiff = zhAnalysis.isRealDiff || maxCharsChanged;

        const langDiffs: Record<string, LanguageDiffItem> = {};
        const allLangs = new Set<string>([
          ...base.translations.keys(),
          ...target.translations.keys(),
        ]);

        for (const lang of allLangs) {
          const oldT = base.translations.get(lang);
          const newT = target.translations.get(lang);

          if (oldT === undefined && newT !== undefined) {
            langDiffs[lang] = { status: 'ADD', newText: newT, isFalseDiff: false };
            termHasRealDiff = true;
          } else if (oldT !== undefined && newT === undefined) {
            langDiffs[lang] = { status: 'DEL', oldText: oldT, isFalseDiff: false };
            termHasRealDiff = true;
          } else if (oldT !== undefined && newT !== undefined) {
            const lAnalysis = FalseDiffNormalizer.analyzeDiff(oldT, newT);
            if (lAnalysis.isRealDiff) {
              langDiffs[lang] = { status: 'MOD', oldText: oldT, newText: newT, isFalseDiff: false };
              termHasRealDiff = true;
            } else if (lAnalysis.isFalseDiff) {
              langDiffs[lang] = {
                status: hideFalseDiff ? 'UNCHANGED' : 'MOD',
                oldText: oldT,
                newText: newT,
                isFalseDiff: true,
              };
              termHasFalseDiff = true;
            } else {
              langDiffs[lang] = { status: 'UNCHANGED', oldText: oldT, newText: newT, isFalseDiff: false };
            }
          }
        }

        if (termHasFalseDiff && !termHasRealDiff) {
          falseDiffSuppressed++;
        }

        // 判定该词条是否保留
        const effectiveRealDiff = hideFalseDiff ? termHasRealDiff : termHasRealDiff || termHasFalseDiff;

        if (effectiveRealDiff) {
          const item: TermDiffItem = {
            kw,
            diffType: 'MOD',
            baseTerm: { id: base.id, zhCn: base.zhCn, maxChars: base.maxChars },
            targetTerm: { id: target.id, zhCn: target.zhCn, maxChars: target.maxChars },
            hasMetaDiff: (hideFalseDiff ? zhAnalysis.isRealDiff : zhAnalysis.isRealDiff || zhAnalysis.isFalseDiff) || maxCharsChanged,
            languageDiffs: langDiffs,
          };

          if (this.matchesLangFilter(item, params.onlyLang, hideFalseDiff)) {
            modCount++;
            diffItems.push(item);
          }
        }
      }
    }

    return {
      summary: {
        totalDiffCount: addCount + modCount + delCount,
        addCount,
        modCount,
        delCount,
        falseDiffSuppressed,
      },
      items: diffItems,
    };
  }

  /**
   * 过滤单语种下钻逻辑
   */
  private matchesLangFilter(item: TermDiffItem, onlyLang?: string, hideFalseDiff: boolean = true): boolean {
    if (!onlyLang) return true;

    // 若指定了单语种（如 onlyLang = 'de'）
    const langDiff = item.languageDiffs[onlyLang];
    if (!langDiff) return false;

    if (langDiff.status === 'UNCHANGED') {
      return false;
    }

    if (hideFalseDiff && langDiff.isFalseDiff) {
      return false;
    }

    return true;
  }

  /**
   * 高性能批量装载版本全量词条与多语言映射表
   */
  private async loadVersionTerms(versionId: string, db: any): Promise<Map<string, InternalTermData>> {
    const termRows = await db
      .select({
        id: schema.terms.id,
        kw: schema.terms.kw,
        zhCn: schema.terms.zhCn,
        maxChars: schema.terms.maxChars,
      })
      .from(schema.terms)
      .where(eq(schema.terms.versionId, versionId));

    if (termRows.length === 0) {
      return new Map();
    }

    const termIds = termRows.map((t: any) => t.id);
    const transRows = await db
      .select({
        termId: schema.termTranslations.termId,
        lang: schema.termTranslations.languageCode,
        text: schema.termTranslations.translationText,
      })
      .from(schema.termTranslations)
      .where(inArray(schema.termTranslations.termId, termIds));

    const transByTermId = new Map<string, Map<string, string>>();
    for (const tr of transRows) {
      if (!transByTermId.has(tr.termId)) {
        transByTermId.set(tr.termId, new Map());
      }
      transByTermId.get(tr.termId)!.set(tr.lang, tr.text);
    }

    const resultMap = new Map<string, InternalTermData>();
    for (const t of termRows) {
      resultMap.set(t.kw, {
        id: t.id,
        kw: t.kw,
        zhCn: t.zhCn,
        maxChars: t.maxChars,
        translations: transByTermId.get(t.id) || new Map(),
      });
    }

    return resultMap;
  }
}
