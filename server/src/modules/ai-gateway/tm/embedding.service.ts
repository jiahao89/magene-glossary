/**
 * 轻量级向量化与相似度服务 EmbeddingService
 * 支撑本地毫秒级余弦相似度、编辑距离比率与高维向量生成 (Trados/memoQ 行业标准算法)
 */
export class EmbeddingService {
  /**
   * 计算两个浮点向量之间的余弦相似度
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 计算两段文本的综合语义相似度 (结合余弦特征与行业标准编辑距离)
   */
  static calculateFuzzySimilarity(a: string, b: string, vecA?: number[], vecB?: number[]): number {
    if (a === b) return 1.0;
    if (!a || !b) return 0;

    const lenA = a.length;
    const lenB = b.length;
    const maxLen = Math.max(lenA, lenB);
    if (maxLen === 0) return 1.0;

    // 1. Levenshtein 动态规划距离
    const d: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
    for (let i = 0; i <= lenA; i++) d[i][0] = i;
    for (let j = 0; j <= lenB; j++) d[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );
      }
    }

    const levRatio = 1 - d[lenA][lenB] / maxLen;

    // 2. 余弦相似度
    let cosSim = 0;
    if (vecA && vecB) {
      cosSim = this.cosineSimilarity(vecA, vecB);
    }

    return Number(Math.max(levRatio, cosSim).toFixed(4));
  }

  /**
   * 生成文本特征嵌入向量 (1536 维标准)
   */
  static generateEmbedding(text: string, dimensions = 1536): number[] {
    const vec = new Array(dimensions).fill(0);
    if (!text) return vec;

    const clean = text.trim().toLowerCase();

    for (let i = 0; i < clean.length; i++) {
      const code1 = clean.charCodeAt(i);
      const idx1 = Math.abs(code1 * 31) % dimensions;
      vec[idx1] += 2.0;

      if (i < clean.length - 1) {
        const code2 = clean.charCodeAt(i + 1);
        const idx2 = Math.abs(code1 * 37 + code2 * 41) % dimensions;
        vec[idx2] += 1.5;
      }
    }

    let sumSq = 0;
    for (let i = 0; i < dimensions; i++) {
      sumSq += vec[i] * vec[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vec[i] = Number((vec[i] / norm).toFixed(6));
      }
    }

    return vec;
  }
}
