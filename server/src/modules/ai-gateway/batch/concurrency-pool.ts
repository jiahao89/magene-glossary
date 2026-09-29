/**
 * 轻量级并发控制池 (基于 Promise 计数器与滑动队列)
 * 限制最大并发数 (如 concurrency = 8)，避免打爆下游大模型 API 造成 HTTP 429
 */
export class ConcurrencyPool {
  private activeCount = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number = 8) {}

  /**
   * 将任务压入并发池并受限调度执行
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.limit) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }

  get active(): number {
    return this.activeCount;
  }

  get pending(): number {
    return this.queue.length;
  }
}
