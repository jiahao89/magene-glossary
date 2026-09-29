# 【TASK-503】微批聚合 (Micro-Batching) 与并发控制调度器

*   **工单编号**：`TASK-503`
*   **所属 Epic**：`Epic 5: 直连多供应商 AI 网关与 QA 质检`
*   **冲刺归属**：`Sprint 3 (Milestone 3)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[BACKLOG]`
*   **前置依赖**：[`TASK-501`](./TASK-501.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 操作整表或多选词条“一键批量 AI 翻译”的业务人员，  
> **我需要** 系统将高频零散的翻译请求在 100ms 窗口期内自动聚合为微批（Micro-Batch）发送给大模型，并由基于 `p-limit` 的并发控制池动态限速（并发度 8），  
> **以便于** 将 50 条词条的整体批量翻译耗时从历史的 3 分钟以上压缩到 4 秒以内，且跑满带宽的同时绝不触发上游 API 提供商的 HTTP 429 Rate Limit。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/ai-gateway/batch/micro-batcher.ts` (基于时间窗口与最大容量的微批收集器)
*   `server/src/modules/ai-gateway/batch/concurrency-pool.ts` (基于 p-limit 的并发滑动窗口)
*   `server/test/modules/ai-gateway/micro-batcher.test.ts` (微批聚合与吞吐量基准测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 聚合缓冲区设计
```typescript
// server/src/modules/ai-gateway/batch/micro-batcher.ts
export class MicroBatcher {
  private queue: TranslationTask[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 10;
  private readonly maxWaitMs = 80;

  async enqueue(task: TranslationTask): Promise<TranslationResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...task, resolve, reject });
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const currentBatch = this.queue.splice(0, this.maxBatchSize);
    if (currentBatch.length === 0) return;

    // 结构化合并 Prompt 单次请求大模型
    await this.processBatch(currentBatch);
  }
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 连续触发 10 次单条词条翻译请求，微批收集器成功合并为单次批量 Prompt 发送；
- [ ] 并发压力测试：同时提交 100 条词条翻译请求，系统并发请求数严格控制在 8 以内，无 HTTP 429 报错；
- [ ] 吞吐量指标：50 条固件短句翻译端到端耗时 $\le 4500\text{ms}$；
- [ ] 容错隔离：批次中单条翻译失败，不影响同批次内其他有效词条的正常解析与落库。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:micro-batcher
# 或运行独立测试
npx tsx server/test/modules/ai-gateway/micro-batcher.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 压力测试脚本验证通过，无内存泄漏与未处理 Promise 拒绝；
2. 批量翻译进度支持流式分块通知。
