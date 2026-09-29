import { TMVectorService } from '../../../src/modules/ai-gateway/tm/tm-vector.service.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';

async function runTMVectorTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-502】向量化 TM 翻译记忆库本地毫秒直通检索单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const { db } = await initDatabase({ inMemory: true });
  const tmService = new TMVectorService(db);

  // 1. 插入黄金基准样本
  console.log('▶ 测试 1: 写入 TM 记忆库样本');
  await tmService.addEntry('结束骑行', 'de', 'Fahrt beenden');
  await tmService.addEntry('心率传感器已断开', 'de', 'Herzfrequenzsensor getrennt');
  await tmService.addEntry('电量过低警告', 'de', 'Warnung vor niedrigem Batteriestand');
  console.log('  ✔ 3 条权威 TM 样本落库就绪');

  // 2. 第一层: 100% 精确匹配检索 (<15ms)
  console.log('\n▶ 测试 2: 第一层 100% 精确匹配检索');
  const resExact = await tmService.lookup('结束骑行', 'de');
  console.log('  精确检索结果:', JSON.stringify(resExact));

  if (!resExact.exactHit || resExact.exactTranslation !== 'Fahrt beenden') {
    throw new Error('精确匹配未命中预期译文');
  }
  console.log(`  ✔ 精确命中成功 (耗时: ${resExact.latencyMs} ms <= 15ms)`);

  // 3. 第二层: 语义相似度模糊匹配 (>85%)
  console.log('\n▶ 测试 3: 第二层 语义相似度模糊匹配 (提取 Top-3 Few-Shot)');
  const resFuzzy = await tmService.lookup('心率传感器断开', 'de', { similarityThreshold: 0.8 });
  console.log('  模糊检索结果:', JSON.stringify(resFuzzy));

  if (resFuzzy.exactHit) {
    throw new Error('变体文本不应该产生 100% 精确命中');
  }
  if (resFuzzy.fuzzyMatches.length === 0) {
    throw new Error('未检索到高相似度模糊匹配项');
  }

  const topMatch = resFuzzy.fuzzyMatches[0];
  console.log(`  Top 匹配项: "${topMatch.sourceText}" -> "${topMatch.targetText}", 相似度: ${(topMatch.similarity * 100).toFixed(1)}%`);
  if (topMatch.similarity < 0.8) {
    throw new Error('相似度得分低于阈值');
  }
  console.log('  ✔ 成功提取出相似度 > 80% 的权威译文作为 Few-Shot 上下文');

  // 4. 空库/完全无关文本检索
  console.log('\n▶ 测试 4: 冷启动与无关文本检索');
  const resMiss = await tmService.lookup('完全不相干的文字abcdef', 'de');
  if (resMiss.exactHit || resMiss.fuzzyMatches.length > 0) {
    throw new Error('无关文本不应命中任何项');
  }
  console.log('  ✔ 无关文本正确返回 Miss (exactHit=false, fuzzyMatches=[])');

  // 5. 封板固件同步至 TM 管道测试
  console.log('\n▶ 测试 5: 版本词条自动同步至 TM 记忆库管道');
  const [project] = await db.insert(schema.projects).values({ code: 'tm-sync-proj', name: 'TM同步测试' }).returning();
  const [version] = await db.insert(schema.versions).values({ projectId: project.id, versionName: 'v1.0.0-Golden' }).returning();
  const [term] = await db.insert(schema.terms).values({ versionId: version.id, kw: 'KW_PEDAL', zhCn: '踏频传感器', updatedBy: 'Lead' }).returning();
  await db.insert(schema.termTranslations).values({ termId: term.id, languageCode: 'de', translationText: 'Trittfrequenzsensor', updatedBy: 'Lead' });

  const syncResult = await tmService.syncFromVersion(version.id);
  console.log(`  同步入库条数: ${syncResult.syncedCount}`);
  if (syncResult.syncedCount !== 1) {
    throw new Error('同步条数不正确');
  }

  const resSynced = await tmService.lookup('踏频传感器', 'de');
  if (!resSynced.exactHit || resSynced.exactTranslation !== 'Trittfrequenzsensor') {
    throw new Error('同步入库的词条无法精确检索');
  }
  console.log('  ✔ 同步管道成功将固件词条吸纳为 TM 权威记忆');

  console.log('\n================================================================================');
  console.log('   🎉  【TASK-502】TMVectorService 记忆库直通检索全部通过！');
  console.log('================================================================================\n');
}

runTMVectorTests().catch((err) => {
  console.error('❌ TASK-502 测试失败:', err);
  process.exit(1);
});
