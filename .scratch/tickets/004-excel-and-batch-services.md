---
id: "004"
title: "提取 Excel 报表与批量事务服务 (Extract Excel & Batch Services)"
status: "done"
labels: ["ready-for-agent", "refactor", "backend"]
---

# Ticket 004: 提取 Excel 报表与批量事务服务

## 目标
进一步解决 `server/routes/terms.cjs` 剩余 1600+ 行的代码臃肿问题：
1. **创建 `server/services/termExcelService.cjs`**：
   - 提取 ExcelJS 工作簿构建、单元格样式、高亮色块（新增/修改）标记。
   - 提取 UTF-8 BOM CSV 导出生成器。
2. **创建 `server/services/termBatchService.cjs`**：
   - 提取批量分类修改、批量复制跨表、批量清除翻译、批量审核状态流转。
3. **瘦身 `server/routes/terms.cjs`**：
   - 将路由转变为清晰的控制器分发，彻底移除内部嵌套大函数与大循环。
4. **运行全量自动化测试**：
   - 确保 `vitest` 所有 23 个测试套件 100% 通过。

## 任务清单
- [x] 创建 `server/services/termExcelService.cjs`
- [x] 创建 `server/services/termBatchService.cjs`
- [x] 重构 `server/routes/terms.cjs` 接入服务层
- [x] 运行 `npx vitest run` 验证所有导出与批量操作通过
