const ExcelJS = require('exceljs');
const { db } = require('../config/db.cjs');
const { TARGET_LANGUAGES, LEGACY_TO_NEW_LANG_MAP } = require('../config/constants.cjs');
const { parseJsonField } = require('../utils/jsonFields.cjs');

const ALIASES_BY_CANONICAL = Object.entries(LEGACY_TO_NEW_LANG_MAP).reduce((acc, [legacy, canonical]) => {
  (acc.get(canonical) || acc.set(canonical, []).get(canonical)).push(legacy);
  return acc;
}, new Map());

/**
 * 导出 Excel (.xlsx) 表格数据 (支持高亮标记)
 * @param {string} tableId 目标版本 ID
 * @param {object} options 额外配置项 { highlightIds: string[]|Set, modifiedCells: object }
 * @returns {Promise<{ buffer: Buffer, fileName: string, rawFileName: string }>}
 */
async function buildExcelExport(tableId, options = {}) {
  const highlightIdsList = options.highlightIds || [];
  const highlightIds = highlightIdsList instanceof Set ? highlightIdsList : new Set(highlightIdsList);
  const modifiedCells = options.modifiedCells || {};

  const version = await db.queryOne('SELECT version_name FROM versions WHERE id = $1', [tableId]);
  const terms = await db.query('SELECT * FROM terms WHERE version_id = $1 ORDER BY sort_order ASC, created_at ASC', [tableId]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GlossaHub';
  workbook.created = new Date();

  const sheetName = (version?.version_name || tableId || 'Sheet1').slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
  const worksheet = workbook.addWorksheet(sheetName);

  const headers = ['KW', 'CN（中文）', '所在页面', '字号类别', ...TARGET_LANGUAGES];
  const headerRow = worksheet.addRow(headers);

  // Header styling
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' } // Dark gray/slate
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });

  for (const term of terms) {
    const trans = parseJsonField(term.translations);

    const rowValues = [
      term.kw && term.kw.startsWith('__EMPTY_KW_') ? '' : (term.kw || ''),
      term.zh_cn || '',
      term.context || '',
      term.owner || ''
    ];

    TARGET_LANGUAGES.forEach(lang => {
      let val = trans[lang];
      if (val === undefined || val === null || String(val).trim() === '') {
        const aliases = ALIASES_BY_CANONICAL.get(lang);
        if (aliases) {
          for (const alias of aliases) {
            const candidate = trans[alias];
            if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
              val = candidate;
              break;
            }
          }
        }
      }
      if (val === undefined || val === null) val = '';
      rowValues.push(val);
    });

    const row = worksheet.addRow(rowValues);
    row.height = 20;

    // Determine highlight status
    const termMod = modifiedCells[term.id] || modifiedCells[term.kw];
    const isHighlighted = highlightIds.has(term.id) || highlightIds.has(term.kw) || !!termMod;
    const isAdded = termMod?.isAdded;

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };

      if (isHighlighted) {
        if (isAdded) {
          // Light green highlight for newly added terms
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' } // Tailwind green-100
          };
        } else if (termMod && typeof termMod === 'object') {
          // Check specific language or general modification
          if (colNumber >= 5) {
            const lang = TARGET_LANGUAGES[colNumber - 5];
            if (termMod[lang] || termMod.isModified) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF3C7' } // Tailwind amber/yellow-100
              };
            }
          } else if (termMod.isModified) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF3C7' }
            };
          }
        } else {
          // General highlight
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }
          };
        }
      }
    });
  }

  // Adjust column widths
  worksheet.columns.forEach((column, index) => {
    let maxLen = headers[index] ? headers[index].length * 2 : 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const str = cell.value ? String(cell.value) : '';
      const len = str.length;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.min(Math.max(maxLen + 3, 12), 45);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const rawFileName = `GlossaHub_${version?.version_name || tableId}_Export.xlsx`;
  const fileName = encodeURIComponent(rawFileName);

  return { buffer, fileName, rawFileName };
}

/**
 * 导出 CSV 表格数据 (删除“所在页面”和“字号类别”列)
 * @param {string} tableId 目标版本 ID
 * @returns {Promise<{ csvContent: string, fileName: string, rawFileName: string }>}
 */
async function buildCsvExport(tableId) {
  const version = await db.queryOne('SELECT version_name FROM versions WHERE id = $1', [tableId]);
  const terms = await db.query('SELECT * FROM terms WHERE version_id = $1 ORDER BY sort_order ASC, created_at ASC', [tableId]);

  // CSV 表头：删除“所在页面”和“字号类别”列，其他字段和顺序不变
  const headers = ['KW', 'CN（中文）', ...TARGET_LANGUAGES];

  const escapeCsvCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [];
  lines.push(headers.map(escapeCsvCell).join(','));

  for (const term of terms) {
    const trans = parseJsonField(term.translations);
    const rowValues = [
      term.kw && term.kw.startsWith('__EMPTY_KW_') ? '' : (term.kw || ''),
      term.zh_cn || ''
    ];

    TARGET_LANGUAGES.forEach(lang => {
      let val = trans[lang];
      if (val === undefined || val === null || String(val).trim() === '') {
        const aliases = ALIASES_BY_CANONICAL.get(lang);
        if (aliases) {
          for (const alias of aliases) {
            const candidate = trans[alias];
            if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
              val = candidate;
              break;
            }
          }
        }
      }
      if (val === undefined || val === null) val = '';
      rowValues.push(val);
    });

    lines.push(rowValues.map(escapeCsvCell).join(','));
  }

  // UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const rawFileName = `GlossaHub_${version?.version_name || tableId}_Export.csv`;
  const fileName = encodeURIComponent(rawFileName);

  return { csvContent, fileName, rawFileName };
}

module.exports = {
  buildExcelExport,
  buildCsvExport
};
