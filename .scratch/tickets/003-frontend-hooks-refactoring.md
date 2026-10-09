---
id: "003"
title: "前端核心矩阵状态解耦 (Frontend Custom Hooks Refactoring)"
status: "done"
labels: ["ready-for-agent", "refactor", "frontend"]
---

# Ticket 003: 前端核心矩阵状态解耦 (Custom Hooks)

## 目标
给庞大的 `src/components/TranslationTab.jsx` 减负，将混杂的状态机剥离为易测试、高复用的 Custom Hooks：
1. **抽离 `useTermsManager.js`**：
   - 集中接管：词条数据拉取、分页计算、筛选过滤、排序、未保存标记追踪。
2. **抽离 `useOptimisticTerm.js`**：
   - 集中接管：单元格双击内联编辑、乐观更新、向后请求、409 并发冲突捕获与回滚。
3. **保持 UI 体验零衰减**：
   - 视觉样式、热键支持、批量操作、弹窗响应 100% 保持完全一致。
   - 所有前端自动化测试通过，组件代码量精简 50% 以上。

## 任务清单
- [x] 编写 `src/hooks/useTermsManager.js`
- [x] 编写 `src/hooks/useOptimisticTerm.js`
- [x] 重构 `src/components/TranslationTab.jsx` 接入 Custom Hooks
- [x] 运行 `npx vitest run` & `npm run build` 验证前端功能与构建 100% 通过

