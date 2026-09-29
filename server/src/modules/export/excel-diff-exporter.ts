import ExcelJS from 'exceljs';
import { DiffCompareResult, TermDiffItem } from '../diff/diff.service.js';

export const EXCEL_DIFF_STYLES = {
  header: {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0F172A' },
    },
    font: { name: 'Inter', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
  },
  add: {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFE8F5E9' },
    },
    font: { name: 'Inter', size: 10, color: { argb: 'FF1B5E20' } },
  },
  del: {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFFFEBEE' },
    },
    font: { name: 'Inter', size: 10, strike: true, color: { argb: 'FFB71C1C' } },
  },
  modCell: {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFFFF9C4' },
    },
    font: { name: 'Inter', size: 10, bold: true, color: { argb: 'FFF57F17' } },
  },
  normal: {
    font: { name: 'Inter', size: 10, color: { argb: 'FF334155' } },
  },
};

export class ExcelDiffExporter {
  /**
   * 将 3D Diff 计算结果渲染并导出为带高亮色块的专业 Excel 文件 (.xlsx)
   */
  static async exportDiffToExcel(
    diffResult: DiffCompareResult,
    meta?: { baseVersionName?: string; targetVersionName?: string }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GlossaHub Engine';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('固件版本对账差异报表');

    // 收集所有出现在 diffResult 中的语言代码
    const langSet = new Set<string>();
    for (const item of diffResult.items) {
      for (const lang of Object.keys(item.languageDiffs)) {
        langSet.add(lang);
      }
    }
    const targetLangs = Array.from(langSet).sort();

    // 1. 构建元信息与 KPI 统计摘要
    sheet.addRow([
      '【固件 3D Diff 差异对账报表】',
      `基准版本: ${meta?.baseVersionName || 'Base'}`,
      `目标版本: ${meta?.targetVersionName || 'Target'}`,
      `导出时间: ${new Date().toISOString()}`,
    ]);
    sheet.addRow([
      `差异总数: ${diffResult.summary.totalDiffCount}`,
      `新增(ADD): ${diffResult.summary.addCount}`,
      `修改(MOD): ${diffResult.summary.modCount}`,
      `删除(DEL): ${diffResult.summary.delCount}`,
      `假差异过滤: ${diffResult.summary.falseDiffSuppressed}`,
    ]);
    sheet.addRow([]); // 空行隔离

    // 2. 表头行
    const headerCols = [
      '变更状态 (Diff Type)',
      '词条宏定义 (KW)',
      '基准中文 (Base)',
      '目标中文 (Target)',
      '字符上限 (Max Chars)',
      ...targetLangs.map((lang) => `语种: [${lang.toUpperCase()}]`),
    ];

    const headerRow = sheet.addRow(headerCols);
    headerRow.eachCell((cell) => {
      cell.fill = EXCEL_DIFF_STYLES.header.fill;
      cell.font = EXCEL_DIFF_STYLES.header.font;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 24;

    // 3. 数据行填充与色块渲染
    for (const item of diffResult.items) {
      const baseZh = item.baseTerm?.zhCn || '';
      const targetZh = item.targetTerm?.zhCn || '';
      const maxChars = item.targetTerm?.maxChars ?? item.baseTerm?.maxChars ?? '-';

      const rowValues: any[] = [
        item.diffType,
        item.kw,
        baseZh,
        targetZh,
        maxChars,
      ];

      for (const lang of targetLangs) {
        const langDiff = item.languageDiffs[lang];
        if (!langDiff) {
          rowValues.push('-');
        } else if (langDiff.status === 'ADD') {
          rowValues.push(langDiff.newText || '');
        } else if (langDiff.status === 'DEL') {
          rowValues.push(langDiff.oldText || '');
        } else if (langDiff.status === 'MOD') {
          rowValues.push(`${langDiff.oldText || ''} ➔ ${langDiff.newText || ''}`);
        } else {
          rowValues.push(langDiff.newText || langDiff.oldText || '');
        }
      }

      const row = sheet.addRow(rowValues);
      row.height = 20;

      if (item.diffType === 'ADD') {
        // 新增：整行淡绿底
        row.eachCell((cell) => {
          cell.fill = EXCEL_DIFF_STYLES.add.fill;
          cell.font = EXCEL_DIFF_STYLES.add.font;
        });
      } else if (item.diffType === 'DEL') {
        // 删除：整行淡红底 + 中划线
        row.eachCell((cell) => {
          cell.fill = EXCEL_DIFF_STYLES.del.fill;
          cell.font = EXCEL_DIFF_STYLES.del.font;
        });
      } else if (item.diffType === 'MOD') {
        // 修改：默认普通字体，特定变动单元格黄色高亮
        row.eachCell((cell) => {
          cell.font = EXCEL_DIFF_STYLES.normal.font;
        });

        // 状态单元格
        row.getCell(1).font = EXCEL_DIFF_STYLES.modCell.font;

        // 如果中文原文发生了变更
        if (baseZh !== targetZh && targetZh !== '') {
          row.getCell(4).fill = EXCEL_DIFF_STYLES.modCell.fill;
          row.getCell(4).font = EXCEL_DIFF_STYLES.modCell.font;
        }

        // 遍历各语言列
        targetLangs.forEach((lang, idx) => {
          const colIdx = 6 + idx;
          const lDiff = item.languageDiffs[lang];
          if (lDiff && lDiff.status === 'MOD' && !lDiff.isFalseDiff) {
            const cell = row.getCell(colIdx);
            cell.fill = EXCEL_DIFF_STYLES.modCell.fill;
            cell.font = EXCEL_DIFF_STYLES.modCell.font;
          }
        });
      }
    }

    // 自动调整列宽
    sheet.columns.forEach((column) => {
      let maxLen = 15;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen) {
          maxLen = Math.min(valStr.length + 3, 50);
        }
      });
      column.width = maxLen;
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
