import { MicroBatcher } from '../../../src/modules/ai-gateway/batch/micro-batcher.js';
import { AIGatewayService } from '../../../src/modules/ai-gateway/gateway.service.js';
import { ITranslationProvider, TranslationPromptContext, TranslationResult } from '../../../src/modules/ai-gateway/providers/provider.interface.js';

async function runMicroBatcherTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-503】微批聚合 (Micro-Batching) 与并发控制池单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 测试单批次满 10 条自动冲刷聚合
  console.log('▶ 测试 1: 10 条连续零散任务聚合为单批次执行');
  const batcher = new MicroBatcher({ maxBatchSize: 10, maxWaitMs: 80, concurrency: 8 });

  const tasks = Array.from({ length: 10 }).map((_, i) =>
    batcher.enqueue({
      id: `task-${i}`,
      sourceText: `功率区间 ${i + 1}`,
      sourceLang: 'zh-cn',
      targetLang: 'de',
    })
  );

  const results = await Promise.all(tasks);
  console.log(`  ✔ 成功收到 10 条翻译结果，已处理批次数: ${batcher.batchesProcessed}`);
  if (results.length !== 10) {
    throw new Error('返回条数不足 10 条');
  }
  if (batcher.batchesProcessed !== 1) {
    throw new Error(`微批未在达到 maxBatchSize=10 时合并! batchesProcessed=${batcher.batchesProcessed}`);
  }
  console.log('  ✔ 连续触发 10 次单条请求被精准聚合为 1 个微批处理');

  // 2. 50 条并发吞吐量与峰值限速测试 (并发度 <= 8)
  console.log('\n▶ 测试 2: 50 条突发翻译并发压力与滑动窗口限流 (限制并发 <= 8)');
  const highLoadBatcher = new MicroBatcher({ maxBatchSize: 10, maxWaitMs: 50, concurrency: 8 });

  const start50 = performance.now();
  const tasks50 = Array.from({ length: 50 }).map((_, i) =>
    highLoadBatcher.enqueue({
      id: `burst-${i}`,
      sourceText: `骑行数据项 ${i + 1}`,
      sourceLang: 'zh-cn',
      targetLang: 'de',
    })
  );

  const results50 = await Promise.all(tasks50);
  const duration50 = performance.now() - start50;
  console.log(`  ✔ 50 条批量翻译全部返回，耗时: ${duration50.toFixed(2)} ms (标尺: <= 4500ms)`);
  console.log(`  ✔ 观测到的最高并发活跃度: ${highLoadBatcher.peakConcurrency} (限额: 8)`);

  if (highLoadBatcher.peakConcurrency > 8) {
    throw new Error(`并发度超出最大限制! peak=${highLoadBatcher.peakConcurrency} > 8`);
  }
  if (duration50 > 4500) {
    throw new Error(`批量翻译耗时超出 4500ms 标尺! 当前耗时: ${duration50.toFixed(2)}ms`);
  }
  console.log('  ✔ 并发严格被截流在 8 以内，端到端吞吐量达标');

  // 3. 容错隔离测试: 批次内偶发单条失败不影响其余任务
  console.log('\n▶ 测试 3: 批次内单条词条异常隔离容错');
  const faultyProvider: ITranslationProvider = {
    name: 'FaultyMock',
    model: 'faulty',
    async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
      if (ctx.sourceText.includes('FATAL_POISON')) {
        throw new Error('毒丸词条模拟解析崩溃！');
      }
      return {
        translatedText: `Translated: ${ctx.sourceText}`,
        provider: 'FaultyMock',
        model: 'faulty',
        latencyMs: 10,
      };
    },
  };

  const faultyGateway = new AIGatewayService({
    providers: [faultyProvider],
  });

  const resilientBatcher = new MicroBatcher({
    maxBatchSize: 5,
    maxWaitMs: 30,
    gateway: faultyGateway,
  });

  const tGood1 = resilientBatcher.enqueue({ sourceText: '正常词条 1', sourceLang: 'zh', targetLang: 'en' });
  const tBad = resilientBatcher.enqueue({ sourceText: 'FATAL_POISON 毒丸', sourceLang: 'zh', targetLang: 'en' });
  const tGood2 = resilientBatcher.enqueue({ sourceText: '正常词条 2', sourceLang: 'zh', targetLang: 'en' });

  const rGood1 = await tGood1;
  const rGood2 = await tGood2;

  let poisonCaught = false;
  try {
    await tBad;
  } catch (err: any) {
    poisonCaught = true;
    console.log('  ✔ 成功捕获毒丸异常:', err.message);
  }

  if (!poisonCaught || !rGood1.translatedText || !rGood2.translatedText) {
    throw new Error('单条词条异常蔓延导致同批次其他有效词条受损！');
  }
  console.log('  ✔ 容错隔离验证通过：故障词条被精准隔离，同批次其他正常词条 100% 成功交付');

  console.log('\n================================================================================');
  console.log('   🎉  【TASK-503】MicroBatcher 微批聚合与并发控制池全部通过！');
  console.log('================================================================================\n');
}

runMicroBatcherTests().catch((err) => {
  console.error('❌ TASK-503 测试失败:', err);
  process.exit(1);
});
