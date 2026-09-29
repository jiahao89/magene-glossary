import fs from 'node:fs';
import path from 'node:path';

export interface ExtractedMacro {
  kw: string;
  zhCn: string;
  maxChars?: number;
  filePath: string;
  lineNumber: number;
  rawComment?: string;
}

export interface ScanResult {
  totalScannedFiles: number;
  extractedMacros: ExtractedMacro[];
  duplicatesIgnored: number;
}

/**
 * C Language Macro Scanner (TASK-801)
 * Parses C/C++ source and header files for KW_* macros and Chinese comment annotations
 */
export class CMacroScanner {
  // Regex to match KW macros: #define KW_[A-Z0-9_]+
  private static readonly MACRO_REGEX = /#define\s+(KW_[A-Z0-9_]+)\b/g;

  // Regex to extract [max_chars: N] or max_chars=N
  private static readonly MAX_CHARS_REGEX = /\[?max_chars[:=]\s*(\d+)\]?/i;

  /**
   * Scan single file content string
   */
  public scanContent(content: string, filePath = 'memory.c'): ExtractedMacro[] {
    const lines = content.split(/\r?\n/);
    const results: ExtractedMacro[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = /#define\s+(KW_[A-Z0-9_]+)\b/.exec(line);
      if (!match) continue;

      const kw = match[1];
      const lineNumber = i + 1;

      // Extract comment from previous line or current line
      let comment = '';
      if (line.includes('//')) {
        comment = line.substring(line.indexOf('//') + 2).trim();
      } else if (line.includes('/*') && line.includes('*/')) {
        const start = line.indexOf('/*') + 2;
        const end = line.indexOf('*/');
        comment = line.substring(start, end).trim();
      } else if (i > 0) {
        // Look at previous line
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith('//')) {
          comment = prevLine.substring(2).trim();
        } else if (prevLine.startsWith('/*') && prevLine.endsWith('*/')) {
          comment = prevLine.substring(2, prevLine.length - 2).trim();
        }
      }

      // Parse max_chars from comment if present
      let maxChars: number | undefined;
      const maxCharsMatch = CMacroScanner.MAX_CHARS_REGEX.exec(comment);
      if (maxCharsMatch) {
        maxChars = parseInt(maxCharsMatch[1], 10);
        // Strip [max_chars: N] from comment to get clean zhCn
        comment = comment.replace(maxCharsMatch[0], '').trim();
      }

      // Clean comment of leading/trailing symbols
      let zhCn = comment.replace(/^[\s\-–—:：]+|[\s\-–—:：]+$/g, '').trim();
      if (!zhCn) {
        zhCn = kw; // Fallback to kw name if no Chinese comment provided
      }

      results.push({
        kw,
        zhCn,
        maxChars,
        filePath,
        lineNumber,
        rawComment: comment,
      });
    }

    return results;
  }

  /**
   * Scan directory recursively for C/C++ files (.c, .h, .cpp, .hpp)
   */
  public scanDirectory(dirPath: string): ScanResult {
    const extractedMacros: ExtractedMacro[] = [];
    const seenKws = new Set<string>();
    let totalScannedFiles = 0;
    let duplicatesIgnored = 0;

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.c', '.h', '.cpp', '.hpp', '.cc'].includes(ext)) {
            totalScannedFiles++;
            const content = fs.readFileSync(fullPath, 'utf-8');
            const macros = this.scanContent(content, fullPath);

            for (const m of macros) {
              if (seenKws.has(m.kw)) {
                duplicatesIgnored++;
              } else {
                seenKws.add(m.kw);
                extractedMacros.push(m);
              }
            }
          }
        }
      }
    };

    walk(dirPath);

    return {
      totalScannedFiles,
      extractedMacros,
      duplicatesIgnored,
    };
  }
}
