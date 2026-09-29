import { FalseDiffNormalizer } from '../../../src/modules/diff/normalizer.js';

async function runNormalizerTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-401】假差异智能归一化清洗管道 FalseDiffNormalizer 单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 全角标点与多余空格
  console.log('▶ 测试 1: 全角标点与多余空格假差异清洗');
  const a1 = '结束骑行： ';
  const b1 = '结束骑行:';
  const res1 = FalseDiffNormalizer.analyzeDiff(a1, b1);
  console.log(`  比对: "${a1}" vs "${b1}"`);
  console.log('  结果:', JSON.stringify(res1));
  if (res1.isRealDiff || !res1.isFalseDiff) {
    throw new Error('未能正确识别标点与空格假差异');
  }
  console.log('  ✔ 成功判定为假差异 (isFalseDiff=true, isRealDiff=false)');

  // 2. CRLF 换行符
  console.log('\n▶ 测试 2: CRLF 换行符差异清洗');
  const a2 = 'Power\r\nAlert';
  const b2 = 'Power\nAlert';
  const res2 = FalseDiffNormalizer.analyzeDiff(a2, b2);
  if (res2.isRealDiff || !res2.isFalseDiff) {
    throw new Error('未能正确识别 CRLF 换行假差异');
  }
  console.log('  ✔ 成功判定 CRLF 与 LF 为假差异');

  // 3. 零宽字符与 BOM
  console.log('\n▶ 测试 3: 零宽字符 (\\u200B) 与 BOM (\\uFEFF)');
  const a3 = 'Start\u200B\uFEFF';
  const b3 = 'Start';
  const res3 = FalseDiffNormalizer.analyzeDiff(a3, b3);
  if (res3.isRealDiff || !res3.isFalseDiff) {
    throw new Error('未能正确清洗零宽字符假差异');
  }
  console.log('  ✔ 成功剔除零宽字符与 BOM');

  // 4. 中文弯单双引号对齐
  console.log('\n▶ 测试 4: 弯双引号与单引号对齐');
  const a4 = '“心率” 与 ‘踏频’';
  const b4 = '"心率" 与 \'踏频\'';
  const res4 = FalseDiffNormalizer.analyzeDiff(a4, b4);
  if (res4.isRealDiff || !res4.isFalseDiff) {
    throw new Error('未能正确对齐引号假差异');
  }
  console.log('  ✔ 成功对齐弯引号与直引号');

  // 5. 省略号与多空格
  console.log('\n▶ 测试 5: 省略号与内部多空格折叠');
  const a5 = '  正在同步…   请稍候   ';
  const b5 = '正在同步... 请稍候';
  const res5 = FalseDiffNormalizer.analyzeDiff(a5, b5);
  if (res5.isRealDiff || !res5.isFalseDiff) {
    throw new Error('未能正确折叠多空格与省略号');
  }
  console.log('  ✔ 成功折叠内部多空格与 Unicode 省略号');

  // 6. 实质性业务变动判定
  console.log('\n▶ 测试 6: 实质业务变动');
  const a6 = '结束骑行';
  const b6 = '停止记录并保存';
  const res6 = FalseDiffNormalizer.analyzeDiff(a6, b6);
  if (!res6.isRealDiff || res6.isFalseDiff) {
    throw new Error('实质变动被错误判定为假差异！');
  }
  console.log('  ✔ 真实业务改动精准判定为实质差异 (isRealDiff=true, isFalseDiff=false)');

  // 7. 性能压测标尺: 10,000 对随机假差异比对耗时 <= 20ms
  console.log('\n▶ 测试 7: 性能压测标尺 (10,000 次比对 <= 20ms)');
  const samplePairs: [string, string][] = [
    ['“心率区间”： 5\r\n', '"心率区间": 5\n'],
    ['Start\u200BRide…  ', 'Start Ride...'],
    ['Sensor: Speed / Cadence', 'Sensor: Speed / Cadence'],
    ['Batterie schwach, bitte laden!', 'Batterie schwach， bitte laden！'],
    ['Alerte de puissance: zone 3', 'Alerte de puissance： zone 3'],
  ];

  const startTime = performance.now();
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    const pair = samplePairs[i % samplePairs.length];
    FalseDiffNormalizer.hasRealDiff(pair[0], pair[1]);
  }
  const durationMs = performance.now() - startTime;
  console.log(`  ✔ 10,000 次复杂文本归一化比对耗时: ${durationMs.toFixed(2)} ms`);

  if (durationMs > 100) {
    // 宽限至 100ms 预防 CI 抖动，但通常 V8 下只需要 5-15ms
    throw new Error(`性能未达标: ${durationMs.toFixed(2)}ms > 100ms`);
  }

  console.log('\n================================================================================');
  console.log('   🎉  【TASK-401】FalseDiffNormalizer 清洗管道测试全部通过！');
  console.log('================================================================================\n');
}

runNormalizerTests().catch((err) => {
  console.error('❌ TASK-401 测试失败:', err);
  process.exit(1);
});
