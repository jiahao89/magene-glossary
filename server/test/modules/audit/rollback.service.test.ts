import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';
import { SnapshotService } from '../../../src/modules/audit/snapshot.service.js';
import { ChangeAuditService } from '../../../src/modules/audit/audit.service.js';
import { TimeMachineRollbackService } from '../../../src/modules/audit/rollback.service.js';
import { eq } from 'drizzle-orm';

async function runRollbackTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-303】时光机一键回退事务与二次撤销后悔药安全保障测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();
  const snapshotService = new SnapshotService(db);
  const auditService = new ChangeAuditService(db);
  const rollbackService = new TimeMachineRollbackService(snapshotService, auditService, db);

  // 1. 初始化测试数据 (项目与开板版本)
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'rollback-proj', name: '时光机回退测试' })
    .returning();

  const [activeVersion] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v3.0.0-Active', isSealed: false })
    .returning();

  const [sealedVersion] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v2.9.0-Sealed', isSealed: true })
    .returning();

  // 2. 创建状态 0: 词条初始黄金状态
  console.log('▶ 测试 1: 准备词条初始黄金状态与拍摄 Snapshot_0');
  const [term] = await db
    .insert(schema.terms)
    .values({
      versionId: activeVersion.id,
      kw: 'KW_RIDE_FINISH',
      zhCn: '结束骑行并保存？',
      maxChars: 16,
      sortOrder: 1,
      updatedBy: 'Lead (OP-001)',
    })
    .returning();

  await db.insert(schema.termTranslations).values([
    {
      termId: term.id,
      languageCode: 'en',
      translationText: 'Finish and save ride?',
      sourceType: 'human',
      updatedBy: 'Lead (OP-001)',
    },
    {
      termId: term.id,
      languageCode: 'de',
      translationText: 'Fahrt beenden und speichern?',
      sourceType: 'human',
      updatedBy: 'Lead (OP-001)',
    },
  ]);

  // 拍摄快照 0
  const snap0 = await snapshotService.createSnapshot({
    termId: term.id,
    operatorId: 'OP-001',
    operatorName: 'Lead',
    reason: 'MANUAL_EDIT',
  });
  console.log('  ✔ 状态 0 快照生成就绪，ID:', snap0.id);

  // 3. 产生状态 1: 人工手滑误修改 (中文被改，德语被误清空，英语被改成乱码)
  console.log('\n▶ 测试 2: 模拟手滑误篡改 (产生状态 1)');
  await db
    .update(schema.terms)
    .set({ zhCn: '停止？？？', maxChars: 5 })
    .where(eq(schema.terms.id, term.id));

  await db
    .update(schema.termTranslations)
    .set({ translationText: 'Wrong Gibberish' })
    .where(eq(schema.termTranslations.termId, term.id));

  // 校验当前为篡改后的状态
  const [tamperedTerm] = await db.select().from(schema.terms).where(eq(schema.terms.id, term.id));
  if (tamperedTerm.zhCn !== '停止？？？') {
    throw new Error('模拟篡改写入失败');
  }
  console.log('  ✔ 词条已被篡改为破坏状态:', tamperedTerm.zhCn);

  // 4. 执行时光机一键回退到 Snapshot_0
  console.log('\n▶ 测试 3: POST /api/v2/audit/snapshots/:id/rollback 执行一键回退');
  const resRollback = await app.inject({
    method: 'POST',
    url: `/api/v2/audit/snapshots/${snap0.id}/rollback`,
    headers: {
      'x-operator-id': 'OP-999',
      'x-operator-name': 'EmergencyAdmin',
    },
  });

  if (resRollback.statusCode !== 200) {
    throw new Error(`回退请求失败: ${resRollback.statusCode} ${resRollback.body}`);
  }

  const rollbackResult = JSON.parse(resRollback.body);
  console.log('  ✔ 回退响应成功:', rollbackResult.message);
  console.log('  ✔ 自动生成的后悔药快照 ID:', rollbackResult.regretBackupSnapshotId);

  // 校验词条已精准恢复到状态 0
  const [restoredTerm] = await db.select().from(schema.terms).where(eq(schema.terms.id, term.id));
  if (restoredTerm.zhCn !== '结束骑行并保存？' || restoredTerm.maxChars !== 16) {
    throw new Error(`词条未正确恢复! 当前 zhCn=${restoredTerm.zhCn}, maxChars=${restoredTerm.maxChars}`);
  }
  console.log('  ✔ 主表属性完整恢复: zhCn="结束骑行并保存？", maxChars=16');

  // 校验多语言表也精准恢复
  const restoredTranslations = await db
    .select()
    .from(schema.termTranslations)
    .where(eq(schema.termTranslations.termId, term.id));

  const deTrans = restoredTranslations.find((t: any) => t.languageCode === 'de');
  if (deTrans?.translationText !== 'Fahrt beenden und speichern?') {
    throw new Error(`德语译文未恢复! 当前: ${deTrans?.translationText}`);
  }
  console.log('  ✔ 多语种子表精准恢复: de="Fahrt beenden und speichern?"');

  // 5. 测试后悔药二次撤销 (Double-Undo)
  console.log('\n▶ 测试 4: 后悔药二次回退 (反悔回退操作，100% 恢复到回退前时刻)');
  const resUndo = await app.inject({
    method: 'POST',
    url: `/api/v2/audit/snapshots/${rollbackResult.regretBackupSnapshotId}/rollback`,
    headers: {
      'x-operator-id': 'OP-999',
      'x-operator-name': 'EmergencyAdmin',
    },
  });

  if (resUndo.statusCode !== 200) {
    throw new Error(`后悔药撤销回退失败: ${resUndo.statusCode} ${resUndo.body}`);
  }

  const [undoTerm] = await db.select().from(schema.terms).where(eq(schema.terms.id, term.id));
  if (undoTerm.zhCn !== '停止？？？' || undoTerm.maxChars !== 5) {
    throw new Error(`二次撤销后数据未还原为回退前时刻! zhCn=${undoTerm.zhCn}`);
  }
  console.log('  ✔ 后悔药二次撤销完美生效，数据无缝恢复至回退前瞬间！');

  // 再次回退回黄金状态
  await rollbackService.rollbackToSnapshot(snap0.id, { id: 'OP-001', name: 'Lead' });

  // 6. 测试封板阻断 (Sealed Version Defense)
  console.log('\n▶ 测试 5: 封板固件版本时光机回退阻断');
  const [sealedTerm] = await db
    .insert(schema.terms)
    .values({
      versionId: sealedVersion.id,
      kw: 'KW_SEALED_TEST',
      zhCn: '封板词条',
      updatedBy: 'Lead',
    })
    .returning();

  const sealedSnap = await snapshotService.createSnapshot({
    termId: sealedTerm.id,
    operatorId: 'OP-001',
    operatorName: 'Lead',
    reason: 'MANUAL_EDIT',
  });

  const resSealed = await app.inject({
    method: 'POST',
    url: `/api/v2/audit/snapshots/${sealedSnap.id}/rollback`,
  });

  if (resSealed.statusCode === 403) {
    console.log('  ✔ 成功拦截对已封板固件版本的时光机回退请求 (HTTP 403)');
  } else {
    throw new Error(`未能有效拦截封板回退，返回代码: ${resSealed.statusCode}`);
  }

  // 7. 测试单条防篡改锁阻断 (Lock Violation Defense)
  console.log('\n▶ 测试 6: 人工加锁词条时光机回退阻断');
  await db
    .update(schema.terms)
    .set({ isLocked: true })
    .where(eq(schema.terms.id, term.id));

  let lockBlocked = false;
  try {
    await rollbackService.rollbackToSnapshot(snap0.id, { id: 'OP-001', name: 'Lead' });
  } catch (err: any) {
    if (err.name === 'LockViolationError' || err.statusCode === 403) {
      lockBlocked = true;
      console.log('  ✔ 成功拦截对加锁词条的回滚:', err.message);
    }
  }

  if (!lockBlocked) {
    throw new Error('加锁词条未被拦截回滚！');
  }

  // 解锁以便后续测试
  await db
    .update(schema.terms)
    .set({ isLocked: false })
    .where(eq(schema.terms.id, term.id));

  // 8. 校验向后兼容视图 view_terms_legacy 实时感知
  console.log('\n▶ 测试 7: view_terms_legacy 视图实时感知');
  const legacyRows = await db.execute(`SELECT * FROM view_terms_legacy WHERE id = '${term.id}'`);
  const legacyRow = legacyRows.rows[0] as any;
  if (!legacyRow || !legacyRow.translations?.de) {
    throw new Error('视图未能实时感知回退后的翻译内容');
  }
  console.log(`  ✔ view_terms_legacy 实时感知回退数据，de="${legacyRow.translations.de}"`);

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-303】TimeMachineRollbackService 双向回退与后悔药全部通过！');
  console.log('================================================================================\n');
}

runRollbackTests().catch((err) => {
  console.error('❌ TASK-303 测试失败:', err);
  process.exit(1);
});
