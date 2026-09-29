import { execSync } from 'child_process';

const testSuites = [
  { id: 'TASK-501', name: '多供应商直连网关适配器与故障熔断降级调度', script: 'server/test/modules/ai-gateway/gateway.service.test.ts' },
  { id: 'TASK-502', name: '向量化 TM 翻译记忆库本地毫秒直通检索与 Few-Shot', script: 'server/test/modules/ai-gateway/tm-vector.service.test.ts' },
  { id: 'TASK-503', name: '微批聚合 (Micro-Batching) 与并发控制池调度器', script: 'server/test/modules/ai-gateway/micro-batcher.test.ts' },
  { id: 'TASK-504', name: '自动化 L10n QA 质检拦截与自纠错重试引擎', script: 'server/test/modules/ai-gateway/l10n-qa.engine.test.ts' },
];

console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
console.log('║   ⭐ GlossaHub Milestone 3: 直连 AI 网关与 QA 质检 (Sprint 3) 全量验收测试集      ║');
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
console.log(`🎉 恭喜！Milestone 3 (Sprint 3) 全部 ${passCount}/${testSuites.length} 个核心工单测试 100% 验收通过！总耗时: ${totalDuration}s`);
console.log('==================================================================================\n');
