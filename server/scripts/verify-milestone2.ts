import { execSync } from 'child_process';

const testSuites = [
  { id: 'TASK-201', name: 'Fastify 4.x/5.x 脚手架与 RFC 7807 全局错误处理', script: 'server/test/core/server-scaffold.test.ts' },
  { id: 'TASK-202', name: 'TermService 业务服务与防篡改加锁/封板防御', script: 'server/test/modules/term/term.service.test.ts' },
  { id: 'TASK-203', name: 'Legacy API Facade 向后兼容适配门面', script: 'server/test/compat/legacy-facade.test.ts' },
  { id: 'TASK-301', name: 'ChangeAuditService 字段级变更审计与 Myers Diff', script: 'server/test/modules/audit/audit.service.test.ts' },
  { id: 'TASK-302', name: 'SnapshotService 不可变快照生成与后悔药备份', script: 'server/test/modules/audit/snapshot.service.test.ts' },
  { id: 'TASK-303', name: 'TimeMachineRollbackService 时光机回退与二次撤销', script: 'server/test/modules/audit/rollback.service.test.ts' },
  { id: 'TASK-401', name: 'FalseDiffNormalizer 假差异智能归一化清洗管道', script: 'server/test/modules/diff/normalizer.test.ts' },
  { id: 'TASK-402', name: 'DiffEngineService 固件双版本 3D 差分与多语种下钻', script: 'server/test/modules/diff/diff.service.test.ts' },
  { id: 'TASK-403', name: 'SelectiveApplyDiffService 选择性增量合并同步', script: 'server/test/modules/diff/apply-diff.service.test.ts' },
  { id: 'TASK-404', name: 'ExcelJS 差异色块高亮持久化导出报表', script: 'server/test/modules/export/excel-diff-exporter.test.ts' },
];

console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║   ⭐ GlossaHub Milestone 2: 核心服务与双引擎 (Sprint 2) 全量验收测试集           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
const startTime = Date.now();

for (const suite of testSuites) {
  process.stdout.write(`⏳ 正在执行 [${suite.id}] ${suite.name} ... `);
  const suiteStart = Date.now();
  try {
    execSync(`npx tsx ${suite.script}`, { stdio: 'pipe', encoding: 'utf-8' });
    const duration = Date.now() - suiteStart;
    console.log(`✔ 通过 (${duration}ms)`);
    passCount++;
  } catch (err: any) {
    console.log(`❌ 失败!`);
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log('\n==================================================================================');
console.log(`🎉 恭喜！Milestone 2 (Sprint 2) 全部 ${passCount}/${testSuites.length} 个核心工单测试 100% 验收通过！总耗时: ${totalDuration}s`);
console.log('==================================================================================\n');
