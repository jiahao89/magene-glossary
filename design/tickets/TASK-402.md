# 【TASK-402】固件双版本三维差分计算与多语种下钻过滤

*   **工单编号**：`TASK-402`
*   **所属 Epic**：`Epic 4: 固件版本对比 Diff 引擎`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`4d (32h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-401`](./TASK-401.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 跨国多语言项目负责人，  
> **我需要** 选择任意两个固件版本（如基准版 `v1.9.0` 与目标版 `v2.0.0`），计算词条级别的三维状态（`ADD`/`MOD`/`DEL`/`UNCHANGED`），并支持按单语种下钻筛选（如“只看德语发生修改的词条”），  
> **以便于** 在多达 16+ 语言、数千词条的庞大固件工程中，秒级定位德语等重点风险语种的变更范围，大幅压缩测试与走查工时。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/diff/diff.service.ts` (双版本三维差分与过滤算法)
*   `server/src/modules/diff/diff.controller.ts` (API 控制器)
*   `server/src/modules/diff/diff.routes.ts` (路由：`GET /api/v2/diff/compare`)
*   `server/test/modules/diff/diff.service.test.ts` (多语种下钻与差分算法单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 差分计算维度矩阵
对于每一个词条 KW：
1. **`ADD` (新增)**：仅在源版本存在，基准版本不存在；
2. **`DEL` (删除)**：仅在基准版本存在，源版本不存在；
3. **`MOD` (修改)**：两版本均存在，但经 `FalseDiffNormalizer` 清洗后存在真实业务差异：
   - 细粒度子状态：标记是 `zh_cn` 原文修改、`max_chars` 修改、还是具体哪一个 `language_code` 的译文修改；
4. **`UNCHANGED` (未变)**：两版本均存在，且清洗后 100% 相同。

### 3.2 请求与响应契约
```typescript
// GET /api/v2/diff/compare?baseVersionId=...&targetVersionId=...&onlyLang=de&hideFalseDiff=true
export interface DiffCompareResult {
  summary: {
    totalDiffCount: number;
    addCount: number;
    modCount: number;
    delCount: number;
    falseDiffSuppressed: number;
  };
  items: Array<{
    kw: string;
    diffType: 'ADD' | 'MOD' | 'DEL';
    baseTerm?: { zhCn: string; maxChars?: number };
    targetTerm?: { zhCn: string; maxChars?: number };
    languageDiffs: Record<string, {
      status: 'ADD' | 'MOD' | 'DEL' | 'UNCHANGED';
      oldText?: string;
      newText?: string;
      isFalseDiff: boolean;
    }>;
  }>;
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 调用比对接口，返回整体 Diff KPI 汇总统计（新增、修改、删除及假差异屏蔽数量）；
- [ ] 传入 `onlyLang=de`，准确只返回德语发生实质变动的词条，排除德语未变但法语变动的词条；
- [ ] 传入 `hideFalseDiff=true`，标点与换行假差异词条自动归为 `UNCHANGED` 并从结果中过滤；
- [ ] 性能标尺：对两个各自包含 2500 条词条（总计 40,000+ 语言单元格）的固件版本执行比对，总耗时 $\le 80\text{ms}$。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:diff-service
# 或运行独立测试
npx tsx server/test/modules/diff/diff.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试与基准性能测试全部通过；
2. 边界用例（空版本、相同版本、完全不同版本比对）均正确处理并返回 200。
