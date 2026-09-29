import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';
import { DiffService } from '../../../src/modules/diff/diff.service.js';

async function runDiffServiceTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-402】固件双版本三维差分计算与多语种下钻过滤单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();
  const diffService = new DiffService(db);

  // 1. 初始化项目与两固件版本 (v1.9.0 vs v2.0.0)
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'c606-diff-proj', name: 'C606 差分工程' })
    .returning();

  const [vBase] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v1.9.0' })
    .returning();

  const [vTarget] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v2.0.0' })
    .returning();

  // 2. 插入测试词条
  // (1) 删除词条 (仅在基准版本 v1.9.0)
  const [termDel] = await db
    .insert(schema.terms)
    .values({ versionId: vBase.id, kw: 'KW_LEGACY_GPS_SETUP', zhCn: '旧GPS设置', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values({
    termId: termDel.id,
    languageCode: 'en',
    translationText: 'Legacy GPS Setup',
    updatedBy: 'Tester',
  });

  // (2) 新增词条 (仅在目标版本 v2.0.0)
  const [termAdd] = await db
    .insert(schema.terms)
    .values({ versionId: vTarget.id, kw: 'KW_RADAR_ALERT', zhCn: '后方雷达预警', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values({
    termId: termAdd.id,
    languageCode: 'de',
    translationText: 'Radar-Warnung von hinten',
    updatedBy: 'Tester',
  });

  // (3) 修改词条 (德语变动，英语不变)
  const [termModBase] = await db
    .insert(schema.terms)
    .values({ versionId: vBase.id, kw: 'KW_STOP_RIDE', zhCn: '停止骑行', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values([
    { termId: termModBase.id, languageCode: 'en', translationText: 'Stop Ride', updatedBy: 'Tester' },
    { termId: termModBase.id, languageCode: 'de', translationText: 'Fahrt beenden und aufzeichnen?', updatedBy: 'Tester' },
  ]);

  const [termModTarget] = await db
    .insert(schema.terms)
    .values({ versionId: vTarget.id, kw: 'KW_STOP_RIDE', zhCn: '停止骑行', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values([
    { termId: termModTarget.id, languageCode: 'en', translationText: 'Stop Ride', updatedBy: 'Tester' },
    { termId: termModTarget.id, languageCode: 'de', translationText: 'Fahrt beenden?', updatedBy: 'Tester' },
  ]);

  // (4) 假差异词条 (全角冒号与直角冒号)
  const [termFalseBase] = await db
    .insert(schema.terms)
    .values({ versionId: vBase.id, kw: 'KW_SYSTEM_SETTING', zhCn: '系统设置： ', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values({
    termId: termFalseBase.id,
    languageCode: 'en',
    translationText: 'System Settings： ',
    updatedBy: 'Tester',
  });

  const [termFalseTarget] = await db
    .insert(schema.terms)
    .values({ versionId: vTarget.id, kw: 'KW_SYSTEM_SETTING', zhCn: '系统设置:', updatedBy: 'Tester' })
    .returning();
  await db.insert(schema.termTranslations).values({
    termId: termFalseTarget.id,
    languageCode: 'en',
    translationText: 'System Settings:',
    updatedBy: 'Tester',
  });

  // 3. 执行全量 Diff 计算 (hideFalseDiff = true)
  console.log('▶ 测试 1: 执行双版本全量差分对账 (带假差异屏蔽)');
  const diffResult = await diffService.compareVersions({
    baseVersionId: vBase.id,
    targetVersionId: vTarget.id,
    hideFalseDiff: true,
  });

  console.log('  Diff 摘要统计:', JSON.stringify(diffResult.summary));
  if (
    diffResult.summary.addCount !== 1 ||
    diffResult.summary.delCount !== 1 ||
    diffResult.summary.modCount !== 1 ||
    diffResult.summary.falseDiffSuppressed !== 1
  ) {
    throw new Error('Diff KPI 统计与预期不符！');
  }
  console.log('  ✔ Diff KPI 精准匹配: ADD=1, DEL=1, MOD=1, 假差异屏蔽=1');

  // 4. 测试单语种下钻过滤 (onlyLang=de)
  console.log('\n▶ 测试 2: 单语种下钻 (onlyLang=de)');
  const deDrillDown = await diffService.compareVersions({
    baseVersionId: vBase.id,
    targetVersionId: vTarget.id,
    onlyLang: 'de',
    hideFalseDiff: true,
  });

  console.log(`  德语下钻命中词条数: ${deDrillDown.items.length}`);
  const kws = deDrillDown.items.map((i) => i.kw);
  console.log('  命中 KW 列表:', kws);
  if (!kws.includes('KW_STOP_RIDE') || !kws.includes('KW_RADAR_ALERT') || kws.includes('KW_LEGACY_GPS_SETUP')) {
    throw new Error('单语种下钻过滤逻辑错误');
  }
  console.log('  ✔ 成功下钻过滤只包含德语发生实质变动的词条 (KW_STOP_RIDE & KW_RADAR_ALERT)');

  // 5. 测试 REST 路由: GET /api/v2/diff/compare
  console.log('\n▶ 测试 3: GET /api/v2/diff/compare 端点');
  const res = await app.inject({
    method: 'GET',
    url: `/api/v2/diff/compare?baseVersionId=${vBase.id}&targetVersionId=${vTarget.id}&hideFalseDiff=true`,
  });

  if (res.statusCode !== 200) {
    throw new Error(`API 请求失败: ${res.statusCode} ${res.body}`);
  }
  const apiData = JSON.parse(res.body);
  if (apiData.summary.totalDiffCount !== 3) {
    throw new Error('API 返回总差异数不匹配');
  }
  console.log('  ✔ GET /api/v2/diff/compare 契约响应正常 (200 OK)');

  // 6. 边界测试: 相同版本比对
  console.log('\n▶ 测试 4: 边界用例 - 相同版本自比对');
  const selfDiff = await diffService.compareVersions({
    baseVersionId: vBase.id,
    targetVersionId: vBase.id,
  });
  if (selfDiff.summary.totalDiffCount !== 0) {
    throw new Error('相同版本比对应该无任何差异');
  }
  console.log('  ✔ 相同版本比对差异总数为 0');

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-402】DiffEngineService 双版本三维差分测试全部通过！');
  console.log('================================================================================\n');
}

runDiffServiceTests().catch((err) => {
  console.error('❌ TASK-402 测试失败:', err);
  process.exit(1);
});
