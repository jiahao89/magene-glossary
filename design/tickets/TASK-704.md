# 【TASK-704】Git 风格红绿 Diff 抽屉与具备后悔药的安全模态窗

*   **工单编号**：`TASK-704`
*   **所属 Epic**：`Epic 7: 沉浸式 CAT 译员工作台与硬件上下文`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：前端高级工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-301`](./TASK-301.md), [`TASK-701`](./TASK-701.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 词条审校与发版管理人员，  
> **我需要** 按下 `Alt+H` 从屏幕右侧平滑滑出历史审计抽屉（Git 风格左侧红色删除线、右侧绿色新增高亮显示变动详情），并在执行时光机回退时弹出严格遵循 WAI-ARIA 规范且内置“后悔药安全告知”的模态弹窗（`GlossaModalV2`），  
> **以便于** 用户在执行任何敏感操作时心智负担降至最低，明确知晓每一次操作都有可逆的安全底网兜底。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/components/common/GlossaModalV2.tsx` (统一具备后悔药告知的安全模态窗)
*   `client/src/components/audit/AuditHistoryDrawer.tsx` (右侧滑出式时间轴与行内 Diff 抽屉)
*   `client/test/components/glossa-modal.test.tsx` (焦点捕获、防穿透与后悔药通知测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 GlossaModalV2 核心硬化规范
- **焦点捕获陷阱 (Focus Trap)**：弹窗打开后，键盘焦点锁死在内部，`Tab`/`Shift+Tab` 循环不穿透至底层；
- **页面防滚 (Body Scroll Lock)**：底层表格背景绝对静止，杜绝移动端/桌面端穿透滑动；
- **长事务安全锁定**：当 `isPending=true` 时，`isDismissable={false}`，禁用 ESC 退出与遮罩层点击，防止长操作半途被误关闭；
- **后悔药安全告知条**：显式展示绿色安全 Alert：`"双向后悔药保障机制已激活：系统将在执行覆盖前，自动备份一份当前最新数据的独立快照。若误操作，可随时在时光机中一键恢复。"`。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 按下 `Alt+H`，右侧平滑滑出抽屉，清晰展示该词条所有历史修改时间轴与 Myers 字符级红绿 Diff；
- [ ] 点击时光机“回退”按钮，呼出 `GlossaModalV2`，显式提示后悔药保护文案；
- [ ] 焦点循环测试：连续按下 `Tab` 键，焦点在“取消”与“确认回退”按钮之间循环，绝对不穿透至背景网格；
- [ ] 异步执行回退期间，弹窗确认按钮呈加载 Loading 态，且无法通过点击遮罩或按 ESC 强退。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:glossa-modal
```

---

## 6. 完成定义 (Definition of Done)
1. W3C WAI-ARIA 2.1 规范无障碍自动化测试通过；
2. 抽屉与弹窗动画帧率 60FPS。
