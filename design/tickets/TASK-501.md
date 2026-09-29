# 【TASK-501】多供应商直连网关适配器与故障熔断降级调度

*   **工单编号**：`TASK-501`
*   **所属 Epic**：`Epic 5: 直连多供应商 AI 网关与 QA 质检`
*   **冲刺归属**：`Sprint 3 (Milestone 3)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`4d (32h)`
*   **责任角色**：后端 / AI 工程师
*   **当前状态**：`[BACKLOG]`
*   **前置依赖**：[`TASK-201`](./TASK-201.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 本地化译员与自动化批量翻译流程，  
> **我需要** 系统直连 DeepSeek-V3（主通道）、Claude 3.5 Sonnet（高精度通道）、GPT-4o-mini（极速通道）及私有化 Qwen 2.5，并具备毫秒级超时熔断与自动降级能力，  
> **以便于** 彻底摆脱历史架构依赖 Dify 偶发 504 Gateway Timeout 的不稳定枷锁，在外部某一家大模型发生抖动或超限时，0 停机自动无缝切换到备用模型继续执行。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/ai-gateway/providers/provider.interface.ts` (统一供应商接口)
*   `server/src/modules/ai-gateway/providers/deepseek.provider.ts` (DeepSeek-V3 直连驱动)
*   `server/src/modules/ai-gateway/providers/claude.provider.ts` (Anthropic Claude 3.5 驱动)
*   `server/src/modules/ai-gateway/providers/openai.provider.ts` (OpenAI GPT-4o-mini 驱动)
*   `server/src/modules/ai-gateway/providers/ollama.provider.ts` (本地私有 Qwen 驱动)
*   `server/src/modules/ai-gateway/gateway.service.ts` (网关路由与熔断降级调度器)
*   `server/test/modules/ai-gateway/gateway.service.test.ts` (网关与自动降级模拟测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 供应商接口契约
```typescript
// server/src/modules/ai-gateway/providers/provider.interface.ts
export interface TranslationPromptContext {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  maxChars?: number;
  hardwareType?: string; // 码表 / 心率带 / 功率计
  termContext?: string;
  tmSamples?: Array<{ source: string; target: string }>; // TM Few-Shot
}

export interface TranslationResult {
  translatedText: string;
  provider: string;
  model: string;
  latencyMs: number;
  reasoningText?: string; // CoT 思维链内容 (用于前端折叠展示)
}

export interface ITranslationProvider {
  name: string;
  translate(ctx: TranslationPromptContext): Promise<TranslationResult>;
}
```

### 3.2 熔断降级阶梯表
1. **主通道**：DeepSeek-V3（单次超时阈值 $3500\text{ms}$，首选性价比最优）；
2. **第一备用**：Claude 3.5 Sonnet（高精度，当 DeepSeek 返回 5xx 或超时触发）；
3. **第二备用**：GPT-4o-mini（极速响应）；
4. **兜底私有**：Qwen 2.5 14B（完全内网离线保证可用）。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 正常调用 DeepSeek 直连翻译，P95 响应耗时 $\le 600\text{ms}$；
- [ ] 输出带 `reasoningText`，可提取思考过程供前端 HeroUI Pro Chat 思维链折叠组件展示；
- [ ] 模拟 DeepSeek 抛出 500 异常或超时，网关在 $100\text{ms}$ 内自动无缝切换至 Claude 成功返回结果；
- [ ] 连续 3 次失败自动开启熔断器，冷却 30 秒后自动进入半开状态试探恢复。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:ai-gateway
# 或运行独立测试
npx tsx server/test/modules/ai-gateway/gateway.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试完整覆盖 4 大模型适配器与自动熔断降级链；
2. 提供清晰的 API Key 缺失友好告警与引导。
