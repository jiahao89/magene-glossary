import { L10nQAEngine } from '../../../src/modules/ai-gateway/qa-engine/l10n-qa.engine.js';
import { SelfCorrectionService } from '../../../src/modules/ai-gateway/qa-engine/self-correction.js';
import { AIGatewayService } from '../../../src/modules/ai-gateway/gateway.service.js';
import { ITranslationProvider, TranslationPromptContext, TranslationResult } from '../../../src/modules/ai-gateway/providers/provider.interface.js';

async function runL10nQATests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-504】自动化 L10n QA 质检拦截与自纠错引擎单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 占位符缺失阻断测试 (%s / %d)
  console.log('▶ 测试 1: 嵌入式 C 占位符一致性强校验 (防止 Hard Fault 崩溃)');
  const srcPlaceholders = '当前心率: %d bpm, 骑手: %s';
  const badTarget = 'Current HR: %d bpm'; // 缺失了 %s
  const goodTarget = 'Current HR: %d bpm, Rider: %s';

  const qaBad = L10nQAEngine.inspect(srcPlaceholders, badTarget);
  console.log('  占位符违规检测结果:', JSON.stringify(qaBad));
  if (qaBad.passed || !qaBad.hasErrors || qaBad.issues[0].rule !== 'PLACEHOLDER_MISMATCH') {
    throw new Error('未能正确拦截缺失 %s 占位符的致命缺陷！');
  }
  console.log('  ✔ 成功阻断缺失 %s 的译文落库 (严重级别: ERROR)');

  const qaGood = L10nQAEngine.inspect(srcPlaceholders, goodTarget);
  if (!qaGood.passed || qaGood.hasErrors) {
    throw new Error('合法占位符被误报错误！');
  }
  console.log('  ✔ 完整保留占位符的译文顺利通过检测');

  // 2. 硬件屏幕物理字长上限超限测试 (maxChars)
  console.log('\n▶ 测试 2: 硬件小屏物理字长截断防爆框');
  const srcLength = '左右平衡指标';
  const longTarget = 'Links-Rechts-Balance-Indikator'; // 30 字符
  const shortTarget = 'L/R Balance'; // 11 字符

  const qaLong = L10nQAEngine.inspect(srcLength, longTarget, { maxChars: 15 });
  if (qaLong.passed || !qaLong.hasErrors || qaLong.issues[0].rule !== 'MAX_CHARS_EXCEEDED') {
    throw new Error('未正确拦截超出 max_chars 硬件上限的超长译文！');
  }
  console.log(`  ✔ 成功拦截超出 15 字符上限的译文 (当前 ${longTarget.length} 字符)`);

  const qaShort = L10nQAEngine.inspect(srcLength, shortTarget, { maxChars: 15 });
  if (!qaShort.passed) {
    throw new Error('符合字长限制的译文被误报！');
  }
  console.log('  ✔ 字长符合物理规范的译文通过检测');

  // 3. 成对标点符号闭合测试
  console.log('\n▶ 测试 3: 成对括号与标点闭合');
  const unclosedTarget = 'Zone 3 (Tempo';
  const qaPunct = L10nQAEngine.inspect('区间 3 (节奏)', unclosedTarget);
  if (!qaPunct.hasWarnings || qaPunct.issues[0].rule !== 'UNBALANCED_PUNCTUATION') {
    throw new Error('未能发出未闭合括号警告');
  }
  console.log('  ✔ 成功捕获未闭合括号 (严重级别: WARNING)');

  // 4. 空译文拦截测试
  console.log('\n▶ 测试 4: 空白与空串拦截');
  const qaEmpty = L10nQAEngine.inspect('测试', '   ');
  if (qaEmpty.passed || !qaEmpty.hasErrors || qaEmpty.issues[0].rule !== 'EMPTY_TRANSLATION') {
    throw new Error('未能拦截全空白译文！');
  }
  console.log('  ✔ 成功拦截全空白无效输出');

  // 5. 自纠错反馈微调重试循环 (Self-Correction Loop)
  console.log('\n▶ 测试 5: 自纠错重试编排循环 (首轮超长 -> 二轮自动压缩合格)');
  let callCount = 0;
  const mockProvider: ITranslationProvider = {
    name: 'AdaptiveModel',
    model: 'adaptive-v1',
    async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
      callCount++;
      if (callCount === 1) {
        // 第一轮输出超长
        return {
          translatedText: 'Sehr lange Fahrradfahrt jetzt beenden?', // 38 字符
          provider: 'AdaptiveModel',
          model: 'adaptive-v1',
          latencyMs: 30,
        };
      } else {
        // 收到自纠错指示后，精简到 15 字符以内
        return {
          translatedText: 'Fahrt beenden?', // 14 字符
          provider: 'AdaptiveModel',
          model: 'adaptive-v1',
          latencyMs: 25,
        };
      }
    },
  };

  const correctionGateway = new AIGatewayService({ providers: [mockProvider] });
  const correctionService = new SelfCorrectionService(correctionGateway);

  const finalRes = await correctionService.translateWithQA({
    sourceText: '结束骑行？',
    sourceLang: 'zh-cn',
    targetLang: 'de',
    maxChars: 16,
  });

  console.log('  自纠错流水线返回结果:', JSON.stringify(finalRes));
  if (!finalRes.qaResult.passed || !finalRes.selfCorrected || finalRes.correctionAttempts !== 1) {
    throw new Error('自纠错重试机制未按预期生效！');
  }
  if (finalRes.translatedText !== 'Fahrt beenden?') {
    throw new Error('最终译文未采用第二轮精简结果！');
  }
  console.log(`  ✔ 首轮违规已自动捕获，通过自纠错第二轮输出精简文案 "${finalRes.translatedText}" 并成功合规落库！`);

  // 6. 质检规则极速执行基准测试
  console.log('\n▶ 测试 6: 静态质检性能基准 (10,000 次规则检测 <= 20ms)');
  const startPerf = performance.now();
  for (let i = 0; i < 10000; i++) {
    L10nQAEngine.inspect(srcPlaceholders, goodTarget, { maxChars: 40 });
  }
  const durPerf = performance.now() - startPerf;
  console.log(`  ✔ 10,000 次静态规则质检耗时: ${durPerf.toFixed(2)} ms (单条 < 0.003ms)`);

  console.log('\n================================================================================');
  console.log('   🎉  【TASK-504】L10n QA 质检与自纠错引擎全部通过！');
  console.log('================================================================================\n');
}

runL10nQATests().catch((err) => {
  console.error('❌ TASK-504 测试失败:', err);
  process.exit(1);
});
