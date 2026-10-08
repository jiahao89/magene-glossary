/**
 * AI 外部网关每日预算与频次熔断守卫 (TASK-1202)
 */

export interface QuotaGuardOptions {
  maxDailyRequests?: number;
  maxDailyTokens?: number;
}

export class TokenQuotaGuard {
  private dailyRequests = 0;
  private dailyEstimatedTokens = 0;
  private lastResetDate: string;

  constructor(
    private maxDailyRequests = 1000,
    private maxDailyTokens = 500000
  ) {
    this.lastResetDate = new Date().toISOString().split('T')[0];
  }

  private checkAndReset() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailyRequests = 0;
      this.dailyEstimatedTokens = 0;
      this.lastResetDate = today;
    }
  }

  public canExecute(estimatedTokens = 100): { allowed: boolean; reason?: string } {
    this.checkAndReset();

    if (this.dailyRequests >= this.maxDailyRequests) {
      return {
        allowed: false,
        reason: `已达到单日调用请求上限 (${this.maxDailyRequests} 次/日)，系统已自动熔断保护`,
      };
    }

    if (this.dailyEstimatedTokens + estimatedTokens > this.maxDailyTokens) {
      return {
        allowed: false,
        reason: `已达到单日 Token 预算上限 (${this.maxDailyTokens} Tokens/日)，系统已自动熔断保护`,
      };
    }

    return { allowed: true };
  }

  public recordUsage(tokensUsed = 100) {
    this.checkAndReset();
    this.dailyRequests += 1;
    this.dailyEstimatedTokens += tokensUsed;
  }

  public getStats() {
    this.checkAndReset();
    return {
      dailyRequests: this.dailyRequests,
      maxDailyRequests: this.maxDailyRequests,
      dailyEstimatedTokens: this.dailyEstimatedTokens,
      maxDailyTokens: this.maxDailyTokens,
      lastResetDate: this.lastResetDate,
    };
  }
}

export const globalTokenQuotaGuard = new TokenQuotaGuard();
