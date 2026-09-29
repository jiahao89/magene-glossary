import { AIGatewayService } from '../gateway.service.js';
import { TranslationPromptContext, TranslationResult } from '../providers/provider.interface.js';
import { ConcurrencyPool } from './concurrency-pool.js';

export interface QueuedTranslationTask extends TranslationPromptContext {
  id?: string;
  resolve: (res: TranslationResult) => void;
  reject: (err: any) => void;
}

export interface MicroBatcherOptions {
  maxBatchSize?: number;
  maxWaitMs?: number;
  concurrency?: number;
  gateway?: AIGatewayService;
}

export class MicroBatcher {
  private queue: QueuedTranslationTask[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize: number;
  private readonly maxWaitMs: number;
  private pool: ConcurrencyPool;
  private gateway: AIGatewayService;

  // 监控统计指标
  public batchesProcessed = 0;
  public itemsProcessed = 0;
  public peakConcurrency = 0;

  constructor(options?: MicroBatcherOptions) {
    this.maxBatchSize = options?.maxBatchSize ?? 10;
    this.maxWaitMs = options?.maxWaitMs ?? 80;
    this.pool = new ConcurrencyPool(options?.concurrency ?? 8);
    this.gateway = options?.gateway || new AIGatewayService();
  }

  /**
   * 将一条独立的翻译任务排入聚合缓冲区
   */
  async enqueue(task: TranslationPromptContext & { id?: string }): Promise<TranslationResult> {
    return new Promise<TranslationResult>((resolve, reject) => {
      this.queue.push({
        ...task,
        resolve,
        reject,
      });

      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  /**
   * 立即冲刷并分批调度缓冲区任务
   */
  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const currentBatch = this.queue.splice(0, this.maxBatchSize);
    this.batchesProcessed++;
    this.itemsProcessed += currentBatch.length;

    // 压入并发控制池执行
    this.pool.run(async () => {
      this.peakConcurrency = Math.max(this.peakConcurrency, this.pool.active);
      await this.processBatch(currentBatch);
    }).catch((err) => {
      // 容错隔离：批次整体异常兜底
      for (const item of currentBatch) {
        item.reject(err);
      }
    });
  }

  /**
   * 结构化合并 Prompt 批量请求 AI 网关，单条容错隔离
   */
  private async processBatch(batch: QueuedTranslationTask[]) {
    // 对批次内的每一个词条并行但受限地调用网关
    await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const result = await this.gateway.translate(task);
          task.resolve(result);
        } catch (err: any) {
          task.reject(err);
        }
      })
    );
  }
}
