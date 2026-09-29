# 【TASK-602】前端状态管理架构 (TanStack Query + Zustand)

*   **工单编号**：`TASK-602`
*   **所属 Epic**：`Epic 6: 前端设计系统与虚拟大网格`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：前端高级工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-202`](./TASK-202.md), [`TASK-601`](./TASK-601.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 前端开发团队与终极用户，  
> **我需要** 将“服务端异步数据（词条列表、版本列表、审计流、Diff 数据）”由 TanStack Query v5 统一纳管，将“客户端高频 UI 状态（当前选中词条、激活过滤器、打字实时字数、快捷键焦点）”由 Zustand 局部 Store 分离治理，  
> **以便于** 在进行高频翻译录入时，前端绝不发生整页无意义重拉或白屏闪烁，实现毫秒级的响应跟手感。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/stores/query-client.ts` (TanStack Query 全局配置与重试策略)
*   `client/src/stores/cat-studio.store.ts` (Zustand CAT 工作台状态 Store)
*   `client/src/stores/grid-selection.store.ts` (大网格多选与活动单元格 Store)
*   `client/src/hooks/useTermsQuery.ts` (词条列表与精准局部缓存更新 Hook)
*   `client/test/stores/cat-studio.store.test.ts` (状态流转单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 状态分层与数据流向
```mermaid
graph LR
    subgraph 服务端状态 (TanStack Query)
        Q1[词条列表 Query]
        Q2[版本列表 Query]
        Q3[审计历史 Query]
    end

    subgraph 客户端瞬时状态 (Zustand)
        Z1[当前激活 KW]
        Z2[多选选中的 KW 列表]
        Z3[折叠侧边栏状态]
    end

    Q1 --> UI[HeroUI 组件树]
    Z1 & Z2 --> UI
    UI -- 保存变更 Mutation --> M[termMutation]
    M -- 乐观更新 / 局部失效 --> Q1
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 词条保存 Mutation 成功后，仅局部静默更新当前词条缓存，无整表重拉白屏；
- [ ] 切换当前选中词条（如键盘 `J`/`K`），Zustand Store 在 $\le 5\text{ms}$ 内完成派发更新；
- [ ] 页面在断网或重连时，TanStack Query 具备健壮的重试与状态指示机制。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:stores
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试覆盖率 $\ge 90\%$；
2. 无全局状态穿透与循环依赖。
