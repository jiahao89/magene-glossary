# 【TASK-701】HeroUI Pro 3-Pane 沉浸式 CAT 工作台与快捷键流

*   **工单编号**：`TASK-701`
*   **所属 Epic**：`Epic 7: 沉浸式 CAT 译员工作台与硬件上下文`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`4d (32h)`
*   **责任角色**：前端高级工程师 / UI 工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-604`](./TASK-604.md), [`TASK-601`](./TASK-601.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 专业多语言本地化译员，  
> **我需要** 一个深度吸收 HeroUI Pro **`Mail Template`** 范式的 3-Pane 沉浸式翻译工作台（左栏分类目录与过滤、中栏虚拟高密度词条列表、右栏沉浸式主体翻译与 AI 辅助坞），并支持纯键盘快捷键流（`J`/`K` 上下步进、`Ctrl+Enter` 保存并跳转下一条、`Alt+1/2` 采纳推荐），  
> **以便于** 在不需要频繁移动鼠标的情况下，实现双手专注在键盘上的“心流式（Flow State）”高通量翻译作业。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/pages/CatStudioPage.tsx` (CAT 工作台整页路由)
*   `client/src/components/cat/CatStudioThreePane.tsx` (三栏式核心容器组件)
*   `client/src/components/cat/AICopilotDock.tsx` (右侧 AI 推理与 TM 辅助坞)
*   `client/src/hooks/useKeyboardShortcuts.ts` (W3C 全局键盘流监听器)
*   `client/test/components/cat-studio.test.tsx` (三栏联动与快捷键自动化测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 三栏布局同构标准
```
+---------------------------------------------------------------------------------------------------------+
|                                    GLOSSA CAT STUDIO THREE-PANE LAYOUT                                  |
+---------------------+-----------------------------+-----------------------------------------------------+
| [Pane 1: 分类与漏斗] | [Pane 2: 高密度导航列表]      | [Pane 3: 沉浸式编辑与 AI 辅助坞]                       |
| (300px 固定宽)      | (380px 固定宽)               | (1fr 自适应主视窗)                                   |
| • 语种选择 Tab      | • J/K 上下快捷键盘导航         | • 中文基准原文卡片 (zh-CN)                           |
| • 模块分组 (骑行/传感器)| • 词条 KW 宏名与中文摘要     | • 目标语言译文编辑卡片 (带动态光标)                  |
| • 状态筛选 (待办/QA) | • 字符上限预警 Chip           | • HardwareConstraintMeter (防截断仪表盘)             |
|                     | • 虚拟平滑滚动               | • 码表真机点阵屏幕拟真视窗                           |
|                     |                             | • 右侧 AICopilotDock (CoT 思维链折叠 + TM 记忆库)     |
+---------------------+-----------------------------+-----------------------------------------------------+
```

### 3.2 键盘快捷键流映射表
- `J` / `K`：中栏词条列表快速步进；
- `Ctrl + Enter`：保存当前翻译，自动触发 QA 检查并跳转至下一条；
- `Alt + 1`：采纳 TM 记忆库第一条建议；
- `Alt + 2`：采纳 AI 大模型第一条候选；
- `Alt + H`：滑出变更历史审计抽屉。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 三栏自适应布局在 1280px+ 办公分辨率下完整呈现，低于 1024px 时右栏辅助坞自动折叠为侧滑抽屉；
- [ ] 键盘按下 `J` / `K`，列表光标流畅切换，中栏编辑区内容秒级无刷新更新；
- [ ] 编辑译文后按 `Ctrl + Enter`，当前项保存成功，列表光标自动跳转到下一项未翻译词条；
- [ ] 按下 `Alt + 1`，TM 推荐内容直接填充至当前输入框并高亮提示。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:cat-studio
```

---

## 6. 完成定义 (Definition of Done)
1. 纯键盘操作流程通过 Playwright 自动化端到端测试；
2. 界面视觉严格对齐 `design.md` 中的规范蓝图。
