import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';
import { DiffService } from '../../../src/modules/diff/diff.service.js';
import { ApplyDiffService } from '../../../src/modules/diff/apply-diff.service.js';
import { SnapshotService } from '../../../src/modules/audit/snapshot.service.js';
import { ChangeAuditService } from '../../../src/modules/audit/audit.service.js';
import { eq, and } from 'drizzle-orm';

async function runApplyDiffTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-403】选择性增量合并同步 Selective Apply Diff 单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();
  const snapshotService = new SnapshotService(db);
  const auditService = new ChangeAuditService(db);
  const applyDiffService = new ApplyDiffService(snapshotService, auditService, db);

  // 1. 初始化源版本 (vFeature) 与目标版本 (vMaster)
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'apply-diff-proj', name: '选择性合并测试' })
    .returning();

  const [vFeature] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'vFeature-Branch', isSealed: false })
    .returning();

  const [vMaster] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'vMaster-Main', isSealed: false })
    .returning();

  const [vSealedMaster] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'vMaster-Freeze', isSealed: true })
    .returning();

  // 2. 准备源版本词条数据
  // Term 1: 待同步新增的词条 (KW_NEW_METRIC)
  const [sTerm1] = await db
    .insert(schema.terms)
    .values({
      versionId: vFeature.id,
      kw: 'KW_NEW_METRIC',
      zhCn: '左右平衡指标',
      maxChars: 18,
      updatedBy: 'FeatureDev',
    })
    .returning();
  await db.insert(schema.termTranslations).values([
    { termId: sTerm1.id, languageCode: 'en', translationText: 'L/R Balance', updatedBy: 'FeatureDev' },
    { termId: sTerm1.id, languageCode: 'de', translationText: 'L/R Balance (DE)', updatedBy: 'FeatureDev' },
    { termId: sTerm1.id, languageCode: 'fr', translationText: 'Équilibre G/D', updatedBy: 'FeatureDev' },
  ]);

  // Term 2: 待同步修改的词条 (KW_EXISTING_RIDE)
  const [sTerm2] = await db
    .insert(schema.terms)
    .values({
      versionId: vFeature.id,
      kw: 'KW_EXISTING_RIDE',
      zhCn: '智能骑行模式',
      maxChars: 15,
      updatedBy: 'FeatureDev',
    })
    .returning();
  await db.insert(schema.termTranslations).values([
    { termId: sTerm2.id, languageCode: 'en', translationText: 'Smart Ride Mode', updatedBy: 'FeatureDev' },
    { termId: sTerm2.id, languageCode: 'de', translationText: 'Smarter Fahrmodus V2', updatedBy: 'FeatureDev' },
  ]);

  // Term 3: 不应被同步的词条 (未被勾选)
  await db
    .insert(schema.terms)
    .values({
      versionId: vFeature.id,
      kw: 'KW_UNSELECTED_TERM',
      zhCn: '未勾选特性',
      updatedBy: 'FeatureDev',
    });

  // 3. 准备目标版本数据
  // 目标版本中已存在 KW_EXISTING_RIDE (德语为旧版本，法语存在且不应被覆盖)
  const [tTerm2] = await db
    .insert(schema.terms)
    .values({
      versionId: vMaster.id,
      kw: 'KW_EXISTING_RIDE',
      zhCn: '骑行模式',
      maxChars: 12,
      updatedBy: 'MasterLead',
    })
    .returning();
  await db.insert(schema.termTranslations).values([
    { termId: tTerm2.id, languageCode: 'en', translationText: 'Ride Mode', updatedBy: 'MasterLead' },
    { termId: tTerm2.id, languageCode: 'de', translationText: 'Fahrmodus V1', updatedBy: 'MasterLead' },
    { termId: tTerm2.id, languageCode: 'fr', translationText: 'Mode Vélo Master', updatedBy: 'MasterLead' },
  ]);

  // 4. 执行选择性合并：仅同步 KW_NEW_METRIC 与 KW_EXISTING_RIDE，且仅同步德语 ('de')
  console.log('▶ 测试 1: POST /api/v2/diff/apply 执行选择性增量合并 (指定 selectedLangs=["de"])');
  const resApply = await app.inject({
    method: 'POST',
    url: '/api/v2/diff/apply',
    headers: {
      'x-operator-id': 'OP-MERGE',
      'x-operator-name': 'ReleaseManager',
    },
    payload: {
      sourceVersionId: vFeature.id,
      targetVersionId: vMaster.id,
      selectedKws: ['KW_NEW_METRIC', 'KW_EXISTING_RIDE'],
      selectedLangs: ['de'],
      strategy: 'OVERWRITE',
    },
  });

  if (resApply.statusCode !== 200) {
    throw new Error(`合并请求失败: ${resApply.statusCode} ${resApply.body}`);
  }

  const applyResult = JSON.parse(resApply.body);
  console.log('  合并返回结果:', JSON.stringify(applyResult));
  if (applyResult.insertedCount !== 1 || applyResult.updatedCount !== 1) {
    throw new Error('合并结果计数不正确');
  }
  console.log('  ✔ 精准识别 1 个新增词条与 1 个修改词条');

  // 5. 校验目标版本数据
  console.log('\n▶ 测试 2: 校验目标版本数据落地');
  // (1) 校验新增词条落库，且只插入了 de 译文
  const [syncedNewTerm] = await db
    .select()
    .from(schema.terms)
    .where(and(eq(schema.terms.versionId, vMaster.id), eq(schema.terms.kw, 'KW_NEW_METRIC')));

  if (!syncedNewTerm || syncedNewTerm.zhCn !== '左右平衡指标') {
    throw new Error('新增词条未同步至目标版本');
  }

  const newTermTranslations = await db
    .select()
    .from(schema.termTranslations)
    .where(eq(schema.termTranslations.termId, syncedNewTerm.id));

  if (newTermTranslations.length !== 1 || newTermTranslations[0].languageCode !== 'de') {
    throw new Error('未正确按 selectedLangs=["de"] 限制新增词条语言');
  }
  console.log('  ✔ 新增词条精准增补，且仅同步了 de 德语');

  // (2) 校验已存在词条更新
  const [syncedExistingTerm] = await db
    .select()
    .from(schema.terms)
    .where(and(eq(schema.terms.versionId, vMaster.id), eq(schema.terms.kw, 'KW_EXISTING_RIDE')));

  const existingTranslations = await db
    .select()
    .from(schema.termTranslations)
    .where(eq(schema.termTranslations.termId, syncedExistingTerm.id));

  const deTrans = existingTranslations.find((t: any) => t.languageCode === 'de');
  const frTrans = existingTranslations.find((t: any) => t.languageCode === 'fr');

  if (deTrans?.translationText !== 'Smarter Fahrmodus V2') {
    throw new Error(`德语译文未更新: ${deTrans?.translationText}`);
  }
  if (frTrans?.translationText !== 'Mode Vélo Master') {
    throw new Error(`未被选择的法语译文被意外篡改: ${frTrans?.translationText}`);
  }
  console.log('  ✔ 已存在词条德语已更新为 "Smarter Fahrmodus V2"，法语原汁原味未受影响');

  // (3) 校验未被选中的词条未被引入
  const unselectedInMaster = await db
    .select()
    .from(schema.terms)
    .where(and(eq(schema.terms.versionId, vMaster.id), eq(schema.terms.kw, 'KW_UNSELECTED_TERM')));
  if (unselectedInMaster.length > 0) {
    throw new Error('未选中的词条被错误导入！');
  }
  console.log('  ✔ 未选中的词条完全未进入目标版本');

  // 6. 校验后悔药自动备份快照
  console.log('\n▶ 测试 3: 校验后悔药备份快照生成');
  const snapshots = await db
    .select()
    .from(schema.termSnapshots)
    .where(eq(schema.termSnapshots.termId, tTerm2.id));

  const rollbackBackup = snapshots.find((s: any) => s.reason === 'ROLLBACK_BACKUP');
  if (!rollbackBackup) {
    throw new Error('合并前未自动拍摄后悔药快照');
  }
  console.log('  ✔ 合并前自动为目标版本受影响词条生成了 ROLLBACK_BACKUP 快照');

  // 7. 目标版本封板保护测试
  console.log('\n▶ 测试 4: 目标版本封板写保护');
  const resSealed = await app.inject({
    method: 'POST',
    url: '/api/v2/diff/apply',
    payload: {
      sourceVersionId: vFeature.id,
      targetVersionId: vSealedMaster.id,
      selectedKws: ['KW_NEW_METRIC'],
    },
  });

  if (resSealed.statusCode === 403) {
    console.log('  ✔ 成功拦截对已封板固件版本的合并请求 (HTTP 403)');
  } else {
    throw new Error(`未拦截封板版本合并: ${resSealed.statusCode}`);
  }

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-403】SelectiveApplyDiffService 选择性增量合并全部通过！');
  console.log('================================================================================\n');
}

runApplyDiffTests().catch((err) => {
  console.error('❌ TASK-403 测试失败:', err);
  process.exit(1);
});
