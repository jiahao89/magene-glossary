import ExcelJS from 'exceljs';
import { ExcelDiffExporter } from '../../../src/modules/export/excel-diff-exporter.js';
import { DiffCompareResult } from '../../../src/modules/diff/diff.service.js';
import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';

async function runExcelExporterTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-404】ExcelJS 差异色块高亮持久化导出管道单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 构造一个包含 ADD, MOD, DEL 的 3D 差异结构
  const mockDiffResult: DiffCompareResult = {
    summary: {
      totalDiffCount: 3,
      addCount: 1,
      modCount: 1,
      delCount: 1,
      falseDiffSuppressed: 0,
    },
    items: [
      {
        kw: 'KW_NEW_METRIC',
        diffType: 'ADD',
        targetTerm: { id: 'term-1', zhCn: '左右平衡指标', maxChars: 18 },
        hasMetaDiff: true,
        languageDiffs: {
          de: { status: 'ADD', newText: 'L/R Balance (DE)', isFalseDiff: false },
          en: { status: 'ADD', newText: 'L/R Balance', isFalseDiff: false },
        },
      },
      {
        kw: 'KW_EXISTING_RIDE',
        diffType: 'MOD',
        baseTerm: { id: 'term-2', zhCn: '骑行模式', maxChars: 12 },
        targetTerm: { id: 'term-2', zhCn: '智能骑行模式', maxChars: 15 },
        hasMetaDiff: true,
        languageDiffs: {
          en: { status: 'UNCHANGED', oldText: 'Ride Mode', newText: 'Ride Mode', isFalseDiff: false },
          de: { status: 'MOD', oldText: 'Fahrmodus V1', newText: 'Smarter Fahrmodus V2', isFalseDiff: false },
        },
      },
      {
        kw: 'KW_LEGACY_DELETE',
        diffType: 'DEL',
        baseTerm: { id: 'term-3', zhCn: '旧协议模式', maxChars: 10 },
        hasMetaDiff: true,
        languageDiffs: {
          en: { status: 'DEL', oldText: 'Legacy Protocol', isFalseDiff: false },
        },
      },
    ],
  };

  // 2. 测试 Excel 渲染与 Buffer 生成
  console.log('▶ 测试 1: 生成 Excel 文件 Buffer 并验证格式');
  const buffer = await ExcelDiffExporter.exportDiffToExcel(mockDiffResult, {
    baseVersionName: 'v1.0.0-Base',
    targetVersionName: 'v2.0.0-Target',
  });

  if (!buffer || buffer.length === 0) {
    throw new Error('生成的 Excel Buffer 为空');
  }

  // 校验 zip/xlsx 文件的魔数: PK (0x50, 0x4B)
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('导出的文件并非合法的 .xlsx 格式文件');
  }
  console.log(`  ✔ Excel Buffer 生成成功，大小: ${(buffer.length / 1024).toFixed(2)} KB (包含标准 PK 压缩魔数)`);

  // 3. 读取并验证 Excel 样式与内容完整性
  console.log('\n▶ 测试 2: 重新载入 Excel 校验工作表与色块填充');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.getWorksheet('固件版本对账差异报表');
  if (!sheet) {
    throw new Error('未找到对应名称的对账工作表');
  }
  console.log('  ✔ 成功提取工作表: "固件版本对账差异报表"');

  // 校验新增行 (Row 5 - ADD)
  const addRow = sheet.getRow(5);
  const addCellFill = (addRow.getCell(1).fill as any)?.fgColor?.argb;
  if (addCellFill !== 'FFE8F5E9') {
    throw new Error(`新增词条行背景色未应用浅绿色! 当前: ${addCellFill}`);
  }
  console.log('  ✔ 新增词条整行应用浅绿底色 (FFE8F5E9)');

  // 校验删除行 (Row 7 - DEL)
  const delRow = sheet.getRow(7);
  const delCellFill = (delRow.getCell(1).fill as any)?.fgColor?.argb;
  const isStrike = delRow.getCell(1).font?.strike;
  if (delCellFill !== 'FFFFEBEE' || !isStrike) {
    throw new Error(`删除词条行未应用浅红底色或中划线! strike=${isStrike}, fill=${delCellFill}`);
  }
  console.log('  ✔ 删除词条整行应用浅红底色 (FFFFEBEE) 且字体带中划线');

  // 校验修改行中变动的单元格 (Row 6 - MOD)
  const modRow = sheet.getRow(6);
  // 中文发生变更 -> cell 4 (目标中文) 应为黄色
  const zhCellFill = (modRow.getCell(4).fill as any)?.fgColor?.argb;
  if (zhCellFill !== 'FFFFF9C4') {
    throw new Error(`修改词条变动单元格未显示黄色高亮! 当前: ${zhCellFill}`);
  }
  console.log('  ✔ 变更单元格精准高亮为浅黄色 (FFFFF9C4)');

  // 4. 测试 HTTP API 下载端点: GET /api/v2/diff/export/excel
  console.log('\n▶ 测试 3: GET /api/v2/diff/export/excel 端点下载');
  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();

  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'export-proj', name: '导出工程' })
    .returning();

  const [vBase] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'vBase' })
    .returning();

  const [vTarget] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'vTarget' })
    .returning();

  const resExport = await app.inject({
    method: 'GET',
    url: `/api/v2/diff/export/excel?baseVersionId=${vBase.id}&targetVersionId=${vTarget.id}`,
  });

  if (resExport.statusCode !== 200) {
    throw new Error(`导出端点请求失败: ${resExport.statusCode}`);
  }

  const contentType = resExport.headers['content-type'];
  if (contentType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new Error(`Content-Type 响应头不符合 xlsx 规范: ${contentType}`);
  }
  console.log('  ✔ API 成功返回 Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-404】ExcelJS 差异色块持久化导出测试全部通过！');
  console.log('================================================================================\n');
}

runExcelExporterTests().catch((err) => {
  console.error('❌ TASK-404 测试失败:', err);
  process.exit(1);
});
