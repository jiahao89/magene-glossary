# 【TASK-601】HeroUI v3 + Tailwind v4 Design Tokens 样式引擎

*   **工单编号**：`TASK-601`
*   **所属 Epic**：`Epic 6: 前端设计系统与虚拟大网格`
*   **冲刺归属**：`Sprint 4 (Milestone 4)`
*   **优先级**：`P1 (High)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：前端 UI/UX 架构师
*   **当前状态**：`[DONE]` (已在阶段一设计重构中提前交付就绪)
*   **前置依赖**：无

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 前端开发工程师与产品设计师，  
> **我需要** 工业级、全色阶、全语义的 OKLCH 设计令牌系统（迈金橙 Primary 50-950、极光青 Accent 50-950、冷调石板灰 Slate 50-950、3D Diff 专有语义差分色、屏幕仿真色），并支持 Figma Tokens Studio 与 Tailwind CSS v4 原生 `@theme` 自动补全，  
> **以便于** 前端页面构建时享有 100% 类型安全与设计一致性，消除硬编码魔法颜色，在暗黑与明亮模式下均满足 WCAG AAA 对比度标准。

---

## 2. 涉及代码文件清单 (Target Files)
*   [`client/src/styles/design-tokens.css`](file:///Users/jacko/Projects/magene-glossary/client/src/styles/design-tokens.css) (Tailwind v4 `@theme` 变量与 CSS 原生变量)
*   [`client/src/styles/tokens.ts`](file:///Users/jacko/Projects/magene-glossary/client/src/styles/tokens.ts) (TypeScript 类型定义、常量与辅助计算函数)
*   [`design/tokens.json`](file:///Users/jacko/Projects/magene-glossary/design/tokens.json) (W3C DTCG / Figma Tokens Studio 导入规范)
*   [`design/design.md`](file:///Users/jacko/Projects/magene-glossary/design/design.md) (详细设计标准与色阶文档)

---

## 3. 技术契约与详细设计 (Technical Specification)
- 采用 OKLCH 色彩空间，定义全色阶语义变量；
- 专有固件 3D Diff 令牌：`--diff-add-*`, `--diff-mod-*`, `--diff-del-*`, `--diff-false-*`；
- 硬件物理仪表盘刻度与屏幕拟真令牌：`--gauge-safe-*`, `--screen-lcd-*`, `--screen-oled-*`；
- 前端 TypeScript 辅助函数：`getDiffBadgeConfig()`, `evaluateHardwareGauge()`, `getSourceBadgeConfig()`。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [x] 在 JSX 中可直接使用 `bg-primary-500`、`text-accent-500`、`bg-surface-1`、`shadow-glow-primary` 等原子类；
- [x] 导入 `tokens.ts`，TypeScript 自动推导所有颜色标尺与间距类型，无编译报错；
- [x] 在 Figma 中成功通过 Tokens Studio 加载 `design/tokens.json` 并生成本地变量；
- [x] `npm run build` 静态类型编译通过。

---

## 5. 验证命令 (Verification Command)
```bash
npm run build
```

---

## 6. 完成定义 (Definition of Done)
1. CSS 变量与 TS 常量定义完全一致；
2. 自动化构建与测试通过。
