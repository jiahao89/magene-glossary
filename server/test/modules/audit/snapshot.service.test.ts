import { SnapshotService } from '../../../src/modules/audit/snapshot.service.js';
import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';

async function runSnapshotTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-302】不可变快照生成与“后悔药”自动备份机制测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db, pglite } = await initDatabase();
  const snapshotService = new SnapshotService(db);

  // 1. 初始化测试数据
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'snapshot-proj', name: '快照测试工程' })
    .returning();

  const [version] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v2.2.0' })
    .returning();

  const [term] = await db
    .insert(schema.terms)
    .values({
      versionId: version.id,
      kw: 'KW_BATTERY_LOW',
      zhCn: '电量不足，请充电',
      maxChars: 20,
      updatedBy: 'Dev (OP-101)',
    })
    .returning();

  await db.insert(schema.termTranslations).values([
    {
      termId: term.id,
      languageCode: 'en',
      translationText: 'Battery low, please charge',
      sourceType: 'human',
      updatedBy: 'Dev (OP-101)',
    },
    {
      termId: term.id,
      languageCode: 'de',
      translationText: 'Batterie schwach, bitte laden',
      sourceType: 'human',
      updatedBy: 'Dev (OP-101)',
    },
  ]);

  // 2. 测试生成常规快照
  console.log('▶ 测试 1: 生成词条不可变快照');
  const snap1 = await snapshotService.createSnapshot({
    termId: term.id,
    operatorId: 'OP-101',
    operatorName: 'Dev',
    reason: 'MANUAL_EDIT',
  });

  console.log('  ✔ 快照 1 创建成功，ID:', snap1.id);
  const state1 = snap1.snapshotState as any;
  if (state1.kw !== 'KW_BATTERY_LOW' || state1.translations.en?.text !== 'Battery low, please charge') {
    throw new Error('快照全量数据镜像不正确');
  }
  console.log('  ✔ 快照全量镜像包含全部字段与多语种');

  // 3. 测试后悔药自动备份
  console.log('\n▶ 测试 2: 后悔药备份机制 (captureRegretBackup)');
  const regretSnap = await snapshotService.captureRegretBackup(term.id, {
    id: 'OP-999',
    name: 'RollbackOperator',
  });

  if (regretSnap.reason !== 'ROLLBACK_BACKUP') {
    throw new Error('后悔药备份标记不正确');
  }
  console.log('  ✔ 成功生成带有 ROLLBACK_BACKUP 标记的后悔药快照，ID:', regretSnap.id);

  // 4. 测试快照 API 查询
  console.log('\n▶ 测试 3: GET /api/v2/audit/terms/:termId/snapshots 历史拉取');
  const resList = await app.inject({
    method: 'GET',
    url: `/api/v2/audit/terms/${term.id}/snapshots`,
  });

  if (resList.statusCode !== 200) {
    throw new Error(`查询快照列表失败: ${resList.statusCode}`);
  }
  const listData = JSON.parse(resList.body);
  console.log(`  ✔ 拉取到历史快照数: ${listData.items.length}`);
  if (listData.items.length < 2) {
    throw new Error('快照数量不足');
  }

  // 5. 测试快照不可变性 (Immutability Defense)
  console.log('\n▶ 测试 4: 数据库触发器防御测试 (禁止 UPDATE / DELETE term_snapshots)');
  let updateBlocked = false;
  try {
    if (pglite) {
      await pglite.exec(`UPDATE term_snapshots SET reason = 'HACKED' WHERE id = '${snap1.id}'`);
    } else {
      await db.execute(`UPDATE term_snapshots SET reason = 'HACKED' WHERE id = '${snap1.id}'`);
    }
  } catch (err: any) {
    updateBlocked = true;
    console.log('  ✔ 成功拦截非法 UPDATE 快照尝试:', err.message);
  }

  if (!updateBlocked) {
    throw new Error('安全防线失效：快照表居然允许执行 UPDATE！');
  }

  let deleteBlocked = false;
  try {
    if (pglite) {
      await pglite.exec(`DELETE FROM term_snapshots WHERE id = '${snap1.id}'`);
    } else {
      await db.execute(`DELETE FROM term_snapshots WHERE id = '${snap1.id}'`);
    }
  } catch (err: any) {
    deleteBlocked = true;
    console.log('  ✔ 成功拦截非法 DELETE 快照尝试:', err.message);
  }

  if (!deleteBlocked) {
    throw new Error('安全防线失效：快照表居然允许执行 DELETE！');
  }

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-302】SnapshotService 不可变快照与后悔药备份全部通过！');
  console.log('================================================================================\n');
}

runSnapshotTests().catch((err) => {
  console.error('❌ TASK-302 测试失败:', err);
  process.exit(1);
});
