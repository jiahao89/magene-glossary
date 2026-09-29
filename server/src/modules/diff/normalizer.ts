/**
 * 假差异智能归一化清洗管道 (FalseDiffNormalizer)
 * 剔除由于换行符差异 (\r\n vs \n)、零宽不可见字符 (\u200B, \uFEFF)、
 * 中文全角/半角标点、弯直引号以及多余空白字符引起的无意义无损差异。
 */

const RE_CRLF = /\r\n|\r/g;
const RE_INVISIBLE = /[\u200B\uFEFF]/g;
const RE_NBSP = /\u00A0/g;
const RE_DOUBLE_QUOTES = /[“”]/g;
const RE_SINGLE_QUOTES = /[‘’]/g;
const RE_FULL_COLON = /：/g;
const RE_FULL_COMMA = /，/g;
const RE_FULL_SEMICOLON = /；/g;
const RE_FULL_QUESTION = /？/g;
const RE_FULL_EXCLAMATION = /！/g;
const RE_ELLIPSIS = /…|\.{3,}/g;
const RE_MULTI_SPACES = /[ \t]+/g;

export class FalseDiffNormalizer {
  /**
   * 对输入文本执行全管道规范化清洗
   */
  static normalize(text?: string | null): string {
    if (text === null || text === undefined) {
      return '';
    }

    let s = text;

    // 1. 换行与回车对齐
    s = s.replace(RE_CRLF, '\n');

    // 2. 剔除零宽字符与 BOM，普通化 NBSP
    s = s.replace(RE_INVISIBLE, '').replace(RE_NBSP, ' ');

    // 3. 引号对齐
    s = s.replace(RE_DOUBLE_QUOTES, '"').replace(RE_SINGLE_QUOTES, "'");

    // 4. 全角标点对齐
    s = s
      .replace(RE_FULL_COLON, ':')
      .replace(RE_FULL_COMMA, ',')
      .replace(RE_FULL_SEMICOLON, ';')
      .replace(RE_FULL_QUESTION, '?')
      .replace(RE_FULL_EXCLAMATION, '!');

    // 5. 省略号对齐
    s = s.replace(RE_ELLIPSIS, '...');

    // 6. 空白折叠与首尾修剪
    s = s.replace(RE_MULTI_SPACES, ' ').trim();

    return s;
  }

  /**
   * 判断两个字符串在排除假差异后是否存在实质性变动
   */
  static hasRealDiff(a?: string | null, b?: string | null): boolean {
    return this.normalize(a) !== this.normalize(b);
  }

  /**
   * 比较并返回详细的归一化分析元数据
   */
  static analyzeDiff(a?: string | null, b?: string | null): {
    isRealDiff: boolean;
    isFalseDiff: boolean;
    normalizedA: string;
    normalizedB: string;
  } {
    const rawA = a ?? '';
    const rawB = b ?? '';

    const normA = this.normalize(rawA);
    const normB = this.normalize(rawB);

    if (rawA === rawB) {
      return {
        isRealDiff: false,
        isFalseDiff: false,
        normalizedA: normA,
        normalizedB: normB,
      };
    }

    if (normA === normB) {
      return {
        isRealDiff: false,
        isFalseDiff: true,
        normalizedA: normA,
        normalizedB: normB,
      };
    }

    return {
      isRealDiff: true,
      isFalseDiff: false,
      normalizedA: normA,
      normalizedB: normB,
    };
  }
}
