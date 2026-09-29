import { AIGatewayService } from '../../../src/modules/ai-gateway/gateway.service.js';
import { ITranslationProvider, TranslationPromptContext, TranslationResult } from '../../../src/modules/ai-gateway/providers/provider.interface.js';

async function runGatewayTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-501】多供应商直连网关与故障熔断降级调度单元测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  // 1. 测试常规主通道翻译
  console.log('▶ 测试 1: 主通道 (DeepSeek-V3) 直连与思维链输出');
  const gateway = new AIGatewayService();
  const res1 = await gateway.translate({
    sourceText: '结束骑行',
    sourceLang: 'zh-cn',
    targetLang: 'de',
    hardwareType: 'C606 智能码表',
    maxChars: 15,
  });

  console.log('  翻译结果:', JSON.stringify(res1));
  if (res1.provider !== 'DeepSeek' || !res1.translatedText.includes('Fahrt beenden')) {
    throw new Error('主通道翻译未生效');
  }
  if (!res1.reasoningText) {
    throw new Error('未返回 reasoningText 思维链文本');
  }
  console.log('  ✔ 主通道翻译成功返回结果并包含 CoT 思维链内容');

  // 2. 模拟主通道抛出 500 异常，自动无缝降级到 Claude
  console.log('\n▶ 测试 2: 主通道异常 (HTTP 500) 自动故障降级至备用通道');
  let mockDeepSeekCalls = 0;
  const failingDeepSeek: ITranslationProvider = {
    name: 'MockDeepSeek',
    model: 'mock-v3',
    async translate(_ctx: TranslationPromptContext): Promise<TranslationResult> {
      mockDeepSeekCalls++;
      throw new Error('500 Internal Server Error (Upstream Model Overloaded)');
    },
  };

  const healthyClaude: ITranslationProvider = {
    name: 'MockClaude',
    model: 'claude-3.5',
    async translate(_ctx: TranslationPromptContext): Promise<TranslationResult> {
      return {
        translatedText: 'Fahrt beenden [Claude-Fallback]',
        provider: 'MockClaude',
        model: 'claude-3.5',
        latencyMs: 35,
        reasoningText: 'Claude fallback response',
      };
    },
  };

  const fallbackGateway = new AIGatewayService({
    failureThreshold: 2,
    coolingPeriodMs: 200, // 测试中设为 200ms
    timeoutMs: 1000,
    providers: [failingDeepSeek, healthyClaude],
  });

  const resFallback = await fallbackGateway.translate({
    sourceText: '结束骑行',
    sourceLang: 'zh-cn',
    targetLang: 'de',
  });

  console.log('  降级结果:', JSON.stringify(resFallback));
  if (resFallback.provider !== 'MockClaude') {
    throw new Error('未能正确降级至备用通道 MockClaude');
  }
  console.log('  ✔ 成功在主通道故障时无缝降级至 MockClaude');

  // 3. 验证熔断器机制 (连续失败达到阈值后直接开启 OPEN 状态，跳过调用)
  console.log('\n▶ 测试 3: 熔断器开启与熔断保护 (Circuit Breaker OPEN)');
  // 再次触发一次失败使得总失败数达到 failureThreshold = 2
  await fallbackGateway.translate({ sourceText: '测试', sourceLang: 'zh', targetLang: 'en' });

  const status1 = fallbackGateway.getProviderStatus();
  console.log('  当前 MockDeepSeek 状态:', status1['MockDeepSeek']);
  if (status1['MockDeepSeek'].status !== 'OPEN') {
    throw new Error('连续失败未触发 OPEN 熔断状态');
  }
  console.log('  ✔ 连续失败达到阈值，MockDeepSeek 成功进入 OPEN 熔断状态');

  // 此时再发请求，MockDeepSeek 应该直接被跳过，不再被调用
  const prevCalls = mockDeepSeekCalls;
  await fallbackGateway.translate({ sourceText: '测试跳过', sourceLang: 'zh', targetLang: 'en' });
  if (mockDeepSeekCalls !== prevCalls) {
    throw new Error('熔断开启期间依然执行了请求，熔断器拦截失效！');
  }
  console.log('  ✔ 熔断开启期间零延迟直接跳过故障节点，保护上游与客户端');

  // 4. 验证半开状态与自动恢复
  console.log('\n▶ 测试 4: 冷却期过后半开状态 (HALF_OPEN)');
  await new Promise((r) => setTimeout(r, 250)); // 等待 250ms > 200ms
  // 替换 failing 为恢复后的 provider
  let mockRecovered = false;
  failingDeepSeek.translate = async () => {
    mockRecovered = true;
    return {
      translatedText: 'Recovered!',
      provider: 'MockDeepSeek',
      model: 'mock-v3',
      latencyMs: 15,
    };
  };

  const resRecovered = await fallbackGateway.translate({ sourceText: '恢复探测', sourceLang: 'zh', targetLang: 'en' });
  if (!mockRecovered || resRecovered.provider !== 'MockDeepSeek') {
    throw new Error('半开恢复试探未生效');
  }
  console.log('  ✔ 冷却结束后半开探测成功，自动恢复为 CLOSED 状态');

  console.log('\n================================================================================');
  console.log('   🎉  【TASK-501】AIGatewayService 故障熔断降级网关全部通过！');
  console.log('================================================================================\n');
}

runGatewayTests().catch((err) => {
  console.error('❌ TASK-501 测试失败:', err);
  process.exit(1);
});
