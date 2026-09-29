# 【TASK-603】万级数据量零卡顿虚拟网格 (TanStack Virtual)

*   **工单编号**：`TASK-603`
*   **所属 Epic**：`Epic 6: 前端设计系统与虚拟大网格`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`4d (32h)`
*   **责任角色**：前端高级工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-602`](./TASK-602.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 查看与管理全硬件产品线数万词条的工程师，  
> **我需要** 词条表格即使加载 10,000+ 条多语言数据，依然能够维持 60FPS 极速滚动与流畅操作，且支持前置固定列（锁定、KW 宏、中文原文）粘性冻结，  
> **以便于** 彻底解决传统前端一次性渲染数万 DOM 节点导致浏览器卡死崩溃的顽疾。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/components/grid/VirtualizedTermGrid.tsx` (虚拟滚动大网格主容器)
*   `client/src/components/grid/TermRowItem.tsx` (单行渲染与动态高度计算)
*   `client/src/components/grid/StickyHeader.tsx` (带毛玻璃效果的置顶表头)
*   `client/test/components/virtual-grid.test.tsx` (DOM 节点限制与虚拟滚动测试)

---

## 3. 技术契约与详细设计 (Technical Specification)
- 集成 `@tanstack/react-virtual` 的 `useVirtualizer`；
- 视口上下预加载缓冲行设为 10 行（`overscan: 10`）；
- 无论数据量是 1,000 条还是 100,000 条，真实驻留在浏览器 DOM 树中的行节点恒定在 30 个以内；
- 左侧前置三列粘性固定（`position: sticky; left: ...; z-index: 10`），配合 `ScrollShadow` 实现横向滚动边缘渐变阴影。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 注入 10,000 条真实测试词条，使用 Chrome DevTools Performance 录制快速上下滚动，帧率稳定在 58~60 FPS；
- [ ] 检查 DOM 元素总数，视口内渲染行节点保持在 35 个以内；
- [ ] 横向滚动 16+ 语言列时，左侧 KW 宏名与中文基准原文严格粘性冻结在视口左侧，层级无穿透；
- [ ] 窗口尺寸改变时，网格自适应重计算高度与列宽。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:virtual-grid
```

---

## 6. 完成定义 (Definition of Done)
1. 性能测试录屏验证达标（60 FPS）；
2. 自动化组件测试通过。
