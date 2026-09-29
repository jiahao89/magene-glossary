# 【TASK-703】真机点阵拟真视窗与截图高亮热区映射组件

*   **工单编号**：`TASK-703`
*   **所属 Epic**：`Epic 7: 沉浸式 CAT 译员工作台与硬件上下文`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P1 (High)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：前端图形 / 交互工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-701`](./TASK-701.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 本地化译员与硬件体验设计师，  
> **我需要** 在 CAT 工作台中直观看到当前词条在 2.4 英寸点阵 LCD 码表屏幕与 OLED 纯黑屏幕上的点阵像素拟真渲染，并能在真机实拍截图中根据坐标矩形高亮标注选区，  
> **以便于** 彻底告别“脱离真机盲翻”导致的语义误解，直观感知文案在物理设备机身、周围 UI 元素及背光环境下的真实美学与可读性。

---

## 2. 涉及代码文件清单 (Target Files)
*   `client/src/components/cat/HardwareScreenEmulator.tsx` (点阵与 OLED 屏幕拟真视窗)
*   `client/src/components/cat/VisualContextViewer.tsx` (真机截图平移缩放与热区绘制)
*   `client/test/components/screen-emulator.test.tsx` (截图热区坐标变换测试)

---

## 3. 技术契约与详细设计 (Technical Specification)
- **LCD 点阵模式**：采用 `#1c261e` 背景搭配荧光翠绿发光点阵（`#6ee7b7`），带磨砂骑行外壳边框拟真；
- **OLED 省电模式**：纯黑背景（`#000000`）高锐度纯白字符；
- **真机实拍热区映射**：根据后端返回的 `(x, y, width, height)` 绘制平滑呼吸光晕矩形选区，支持鼠标滚轮缩放与平移。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 切换 LCD / OLED 模式，拟真视窗秒级无闪烁切换，字号与行高与真实码表点阵等比缩放；
- [ ] 词条绑定真机截图元数据时，图片中精准呈现发光矩形高亮框，指明物理屏幕展示区域；
- [ ] 点击热区或拖动画布，中栏输入框焦点不受干扰。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:screen-emulator
```

---

## 6. 完成定义 (Definition of Done)
1. 具备硬件外壳拟真还原度；
2. 图像画布缩放流畅无跳变。
