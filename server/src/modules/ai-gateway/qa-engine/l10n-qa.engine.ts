export type QASeverity = 'ERROR' | 'WARNING';

export interface QAIssue {
  rule: 'PLACEHOLDER_MISMATCH' | 'MAX_CHARS_EXCEEDED' | 'UNBALANCED_PUNCTUATION' | 'EMPTY_TRANSLATION';
  severity: QASeverity;
  message: string;
  expected?: any;
  actual?: any;
}

export interface QACheckResult {
  passed: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: QAIssue[];
}

export class L10nQAEngine {
  // 匹配 printf 风格占位符 (如 %s, %d, %02d, %.1f) 以及花括号占位符 {0}, {name}
  private static readonly RE_PLACEHOLDER = /%[-+0-9.]*[a-zA-Z]|(?:\{[0-9a-zA-Z_]+\})|(?:\$\{[0-9a-zA-Z_]+\})/g;

  /**
   * 对翻译结果执行毫秒级多规则静态质检
   */
  static inspect(
    sourceText: string,
    targetText: string,
    options?: { maxChars?: number }
  ): QACheckResult {
    const issues: QAIssue[] = [];

    // 1. 空译文与乱码拦截
    if (!targetText || targetText.trim().length === 0) {
      issues.push({
        rule: 'EMPTY_TRANSLATION',
        severity: 'ERROR',
        message: '译文为空字符串或全空白字符',
      });
      return {
        passed: false,
        hasErrors: true,
        hasWarnings: false,
        issues,
      };
    }

    // 2. 占位符一致性强校验 (防止嵌入式 C 源码 Hard Fault 崩溃)
    const sourcePlaceholders = (sourceText.match(this.RE_PLACEHOLDER) || []).sort();
    const targetPlaceholders = (targetText.match(this.RE_PLACEHOLDER) || []).sort();

    const isPlaceholdersEqual =
      sourcePlaceholders.length === targetPlaceholders.length &&
      sourcePlaceholders.every((val, idx) => val === targetPlaceholders[idx]);

    if (!isPlaceholdersEqual) {
      issues.push({
        rule: 'PLACEHOLDER_MISMATCH',
        severity: 'ERROR',
        message: `占位符缺失或不一致！原文需包含 [${sourcePlaceholders.join(', ')}]，译文实际为 [${targetPlaceholders.join(', ')}]`,
        expected: sourcePlaceholders,
        actual: targetPlaceholders,
      });
    }

    // 3. 硬件屏幕物理字长上限校验 (防爆框截断)
    const maxChars = options?.maxChars ?? 0;
    if (maxChars > 0 && targetText.length > maxChars) {
      issues.push({
        rule: 'MAX_CHARS_EXCEEDED',
        severity: 'ERROR',
        message: `译文字符数 (${targetText.length}) 超出硬件物理上限 (${maxChars})，将导致固件排版爆框！`,
        expected: maxChars,
        actual: targetText.length,
      });
    }

    // 4. 成对标点闭合校验 (引号、括号)
    const openParen = (targetText.match(/\(/g) || []).length;
    const closeParen = (targetText.match(/\)/g) || []).length;
    const openBracket = (targetText.match(/\[/g) || []).length;
    const closeBracket = (targetText.match(/\]/g) || []).length;

    if (openParen !== closeParen || openBracket !== closeBracket) {
      issues.push({
        rule: 'UNBALANCED_PUNCTUATION',
        severity: 'WARNING',
        message: '译文中括号未正确成对闭合',
      });
    }

    const hasErrors = issues.some((i) => i.severity === 'ERROR');
    const hasWarnings = issues.some((i) => i.severity === 'WARNING');

    return {
      passed: !hasErrors,
      hasErrors,
      hasWarnings,
      issues,
    };
  }
}
