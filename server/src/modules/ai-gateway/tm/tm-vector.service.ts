import { eq, and } from 'drizzle-orm';
import { initDatabase, schema } from '../../../common/database/db.client.js';
import { EmbeddingService } from './embedding.service.js';

export interface FuzzyMatchItem {
  sourceText: string;
  targetText: string;
  similarity: number;
}

export interface TMLookupResult {
  exactHit: boolean;
  exactTranslation?: string;
  fuzzyMatches: FuzzyMatchItem[];
  latencyMs: number;
}

export class TMVectorService {
  constructor(private dbClient?: any) {}

  private async getDb() {
    if (this.dbClient) return this.dbClient;
    const { db } = await initDatabase();
    return db;
  }

  /**
   * 双层漏斗检索: 第一层精确匹配(<15ms) -> 第二层向量余弦检索(>85% Top-3)
   */
  async lookup(
    sourceText: string,
    targetLang: string,
    options?: { similarityThreshold?: number; topK?: number }
  ): Promise<TMLookupResult> {
    const start = performance.now();
    const db = await this.getDb();
    const threshold = options?.similarityThreshold ?? 0.80;
    const topK = options?.topK ?? 3;

    // 1. 第一层: 100% 精确匹配检索
    const exactRows = await db
      .select({
        sourceText: schema.translationMemories.sourceText,
        targetText: schema.translationMemories.targetText,
      })
      .from(schema.translationMemories)
      .where(
        and(
          eq(schema.translationMemories.targetLang, targetLang),
          eq(schema.translationMemories.sourceText, sourceText)
        )
      )
      .limit(1);

    if (exactRows.length > 0) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        exactHit: true,
        exactTranslation: exactRows[0].targetText,
        fuzzyMatches: [],
        latencyMs,
      };
    }

    // 2. 第二层: 向量余弦相似度检索
    const queryVector = EmbeddingService.generateEmbedding(sourceText);

    // 查询该目标语种下的所有记忆库候选
    const candidates = await db
      .select({
        sourceText: schema.translationMemories.sourceText,
        targetText: schema.translationMemories.targetText,
      })
      .from(schema.translationMemories)
      .where(eq(schema.translationMemories.targetLang, targetLang))
      .limit(500);

    const scoredCandidates: FuzzyMatchItem[] = [];
    for (const c of candidates) {
      const cVector = EmbeddingService.generateEmbedding(c.sourceText);
      const similarity = EmbeddingService.calculateFuzzySimilarity(sourceText, c.sourceText, queryVector, cVector);
      if (similarity >= threshold) {
        scoredCandidates.push({
          sourceText: c.sourceText,
          targetText: c.targetText,
          similarity: Number(similarity.toFixed(4)),
        });
      }
    }

    scoredCandidates.sort((a, b) => b.similarity - a.similarity);
    const topMatches = scoredCandidates.slice(0, topK);

    const latencyMs = Number((performance.now() - start).toFixed(2));
    return {
      exactHit: false,
      exactTranslation: undefined,
      fuzzyMatches: topMatches,
      latencyMs,
    };
  }

  /**
   * 写入一条翻译记忆记录
   */
  async addEntry(sourceText: string, targetLang: string, targetText: string) {
    const db = await this.getDb();
    const embedding = EmbeddingService.generateEmbedding(sourceText);
    const [inserted] = await db
      .insert(schema.translationMemories)
      .values({
        sourceText,
        targetLang,
        targetText,
        embedding,
      })
      .returning();

    return inserted;
  }

  /**
   * 将已封板或高可信版本的词条与多语种批量吸纳进 TM 记忆库
   */
  async syncFromVersion(versionId: string): Promise<{ syncedCount: number }> {
    const db = await this.getDb();

    const termsWithTrans = await db
      .select({
        sourceText: schema.terms.zhCn,
        targetLang: schema.termTranslations.languageCode,
        targetText: schema.termTranslations.translationText,
      })
      .from(schema.terms)
      .innerJoin(
        schema.termTranslations,
        eq(schema.terms.id, schema.termTranslations.termId)
      )
      .where(eq(schema.terms.versionId, versionId));

    let count = 0;
    for (const item of termsWithTrans) {
      if (item.sourceText && item.targetText) {
        await this.addEntry(item.sourceText, item.targetLang, item.targetText);
        count++;
      }
    }

    return { syncedCount: count };
  }
}
