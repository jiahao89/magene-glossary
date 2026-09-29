# 【TASK-404】ExcelJS 差异色块高亮持久化导出管道

*   **工单编号**：`TASK-404`
*   **所属 Epic**：`Epic 4: 固件版本对比 Diff 引擎`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P1 (High)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：后端 / 全栈工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-402`](./TASK-402.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 跨国本地化合作方与外部审校人员，  
> **我需要** 将固件版本对比出的 3D Diff 差异报表一键导出为带专业色块样式的 Excel 表格（`.xlsx`），其中新增整行浅绿、删除整行浅红并画中划线、修改的具体语言单元格浅黄高亮，  
> **以便于** 离线分发给第三方本地化团队或通过邮件与管理层进行发版审阅对账。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/export/excel-diff-exporter.ts` (基于 ExcelJS 的流式导出构建器)
*   `server/src/modules/export/export.controller.ts` (文件下载控制器)
*   `server/src/modules/export/export.routes.ts` (路由：`GET /api/v2/diff/export/excel`)
*   `server/test/modules/export/excel-diff-exporter.test.ts` (导出文件与样式单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 视觉样式填充规范
```typescript
// server/src/modules/export/excel-diff-exporter.ts
export const EXCEL_DIFF_STYLES = {
  header: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }, // 暗夜蓝
    font: { name: 'Inter', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
  },
  add: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }, // 浅绿底
    font: { color: { argb: 'FF1B5E20' } },
  },
  del: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } }, // 浅红底
    font: { strike: true, color: { argb: 'FFB71C1C' } }, // 中划线
  },
  modCell: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } }, // 浅黄底
    font: { bold: true, color: { argb: 'FFF57F17' } },
  },
};
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 请求 `GET /api/v2/diff/export/excel?baseVersionId=...&targetVersionId=...` 返回流式 Excel 文件（`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`）；
- [ ] 导出的文件使用 Microsoft Excel、WPS 及 macOS Numbers 打开均无格式损坏提示；
- [ ] 表头清晰包含导出时间、基准版本号、目标版本号；
- [ ] 新增词条整行填充淡绿底，删除词条整行淡红且所有文本带中划线，修改单元格精准显示黄色填充；
- [ ] 导出 5000+ 词条时采用流式写入，内存占用峰值 $\le 120\text{MB}$。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:excel-exporter
# 或运行独立测试
npx tsx server/test/modules/export/excel-diff-exporter.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试自动生成 Excel 样本并通过文件合法性校验；
2. 报表在主流办公软件中视觉对账无误。
