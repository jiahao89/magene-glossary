import { ITranslationProvider, TranslationPromptContext, TranslationResult } from './providers/provider.interface.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import { ClaudeProvider } from './providers/claude.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  successes: number;
}

export interface AIGatewayOptions {
  failureThreshold?: number;
  coolingPeriodMs?: number;
  timeoutMs?: number;
  providers?: ITranslationProvider[];
}

export class AIGatewayService {
  private providers: ITranslationProvider[];
  private breakerStates: Map<string, CircuitBreakerState> = new Map();
  private failureThreshold: number;
  private coolingPeriodMs: number;
  private timeoutMs: number;

  constructor(options?: AIGatewayOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.coolingPeriodMs = options?.coolingPeriodMs ?? 30000;
    this.timeoutMs = options?.timeoutMs ?? 3500;

    this.providers = options?.providers || [
      new DeepSeekProvider(),
      new ClaudeProvider(),
      new OpenAIProvider(),
      new OllamaProvider(),
    ];

    for (const p of this.providers) {
      this.breakerStates.set(p.name, {
        status: 'CLOSED',
        failures: 0,
        lastFailureTime: 0,
        successes: 0,
      });
    }
  }

  /**
   * 带有自动熔断降级阶梯的翻译请求分派
   */
  async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      const state = this.getBreakerState(provider.name);

      // 检查熔断器状态
      const now = Date.now();
      if (state.status === 'OPEN') {
        if (now - state.lastFailureTime > this.coolingPeriodMs) {
          // 冷却期已过，进入半开状态试探
          state.status = 'HALF_OPEN';
        } else {
          // 熔断中，直接跳过当前供应商
          continue;
        }
      }

      try {
        const result = await this.executeWithTimeout(provider.translate(ctx), this.timeoutMs);

        // 成功，恢复熔断器
        this.recordSuccess(provider.name);
        return result;
      } catch (err: any) {
        this.recordFailure(provider.name);
        const errMsg = `[${provider.name}] 调用失败: ${err.message}`;
        errors.push(errMsg);
        console.warn(`⚠️ AI 网关自动降级: ${errMsg} -> 切换至备用供应商`);
      }
    }

    throw new Error(`所有 AI 翻译供应商全部降级失败:\n${errors.join('\n')}`);
  }

  private getBreakerState(name: string): CircuitBreakerState {
    if (!this.breakerStates.has(name)) {
      this.breakerStates.set(name, {
        status: 'CLOSED',
        failures: 0,
        lastFailureTime: 0,
        successes: 0,
      });
    }
    return this.breakerStates.get(name)!;
  }

  private recordSuccess(name: string) {
    const state = this.getBreakerState(name);
    state.failures = 0;
    state.successes++;
    state.status = 'CLOSED';
  }

  private recordFailure(name: string) {
    const state = this.getBreakerState(name);
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.failureThreshold || state.status === 'HALF_OPEN') {
      state.status = 'OPEN';
      console.warn(`🚨 触发熔断保护: 供应商 [${name}] 已开启熔断，冷却时间 ${this.coolingPeriodMs}ms`);
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`请求超时 (耗时超过 ${timeoutMs}ms)`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * 查看当前各供应商的熔断健康状态
   */
  getProviderStatus(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {};
    for (const [name, state] of this.breakerStates.entries()) {
      result[name] = { ...state };
    }
    return result;
  }
}
