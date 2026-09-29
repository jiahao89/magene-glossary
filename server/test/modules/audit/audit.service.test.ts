import { computeMyersDiff } from '../../../src/modules/audit/myers-diff.js';
import { ChangeAuditService } from '../../../src/modules/audit/audit.service.js';
import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';

async function runAuditTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-301】字段级变更审计与 Myers 字符 Diff 算法全面测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 测试 Myers Diff 字符级算法
  console.log('▶ 测试 1: Myers 字符级 Diff 算法用例');
  const oldText = 'Fahrt beenden und aufzeichnen?';
  const newText = 'Fahrt beenden?';
  const diffChunks = computeMyersDiff(oldText, newText);

  console.log('  Diff Chunks 结果:', JSON.stringify(diffChunks));
  if (
    diffChunks.some((c) => c.type === 'delete' && c.value.includes('und aufzeichnen')) &&
    diffChunks.some((c) => c.type === 'unchanged' && c.value.includes('Fahrt beenden'))
  ) {
    console.log('  ✔ 德语字符串行内细粒度 Diff 正确识别删除分块');
  } else {
    throw new Error('Myers diff 计算不符合预期');
  }

  // 中文场景
  const zhDiff = computeMyersDiff('结束骑行', '停止骑行并保存');
  console.log('  中文 Diff 结果:', JSON.stringify(zhDiff));
  if (zhDiff.some((c) => c.type === 'insert' && c.value.includes('并保存'))) {
    console.log('  ✔ 中文原文行内细粒度 Diff 正确识别增量分块');
  } else {
    throw new Error('中文 Myers diff 计算不符合预期');
  }

  // 2. 初始化数据库与应用
  console.log('\n▶ 测试 2: 审计日志落库与多维度查询 API');
  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();
  const auditService = new ChangeAuditService(db);

  // 准备测试数据
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'audit-proj', name: '审计测试项目' })
    .returning();

  const [version] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v1.0.0' })
    .returning();

  const [term] = await db
    .insert(schema.terms)
    .values({
      versionId: version.id,
      kw: 'KW_AUDIT_TEST',
      zhCn: '心率过高警告',
      updatedBy: 'Tester (OP-888)',
    })
    .returning();

  // 写入一条德语变更审计
  const logged = await auditService.captureChange({
    versionId: version.id,
    termId: term.id,
    kw: term.kw,
    targetLang: 'de',
    action: 'UPDATE',
    oldValue: 'Herzfrequenz zu hoch Warnung!',
    newValue: 'Herzfrequenz-Warnung!',
    operatorId: 'OP-888',
    operatorName: 'Tester',
    sourceType: 'human',
    reason: '根据固件团队评审精简文本',
  });

  console.log('  ✔ 审计落库成功，ID:', logged.id);
  if (!logged.parsedDetails?.charDiff || logged.parsedDetails.charDiff.length === 0) {
    throw new Error('未正确计算 charDiff');
  }
  console.log('  ✔ 审计记录中包含 charDiff 字符级分块');

  // 3. 测试通过 REST API 查询审计日志
  console.log('\n▶ 测试 3: GET /api/v2/audit/logs 组合检索与分页');
  const res = await app.inject({
    method: 'GET',
    url: `/api/v2/audit/logs?versionId=${version.id}&targetLang=de`,
  });

  if (res.statusCode !== 200) {
    throw new Error(`GET /api/v2/audit/logs 响应失败: ${res.statusCode} ${res.body}`);
  }

  const queryResult = JSON.parse(res.body);
  console.log(`  ✔ API 检索返回条数: ${queryResult.total}, 包含记录: ${queryResult.items.length}`);
  if (queryResult.total < 1 || queryResult.items[0].kw !== 'KW_AUDIT_TEST') {
    throw new Error('API 检索结果与写入不匹配');
  }

  // 4. 测试按操作人筛选
  const resOperator = await app.inject({
    method: 'GET',
    url: `/api/v2/audit/logs?operator=OP-888`,
  });
  const opResult = JSON.parse(resOperator.body);
  if (opResult.total < 1) {
    throw new Error('操作人模糊检索未命中');
  }
  console.log('  ✔ 操作人模糊检索匹配成功');

  await app.close();
  console.log('\n================================================================================');
  console.log('   🎉  【TASK-301】ChangeAuditService 单元测试全部通过！');
  console.log('================================================================================\n');
}

runAuditTests().catch((err) => {
  console.error('❌ TASK-301 测试失败:', err);
  process.exit(1);
});
