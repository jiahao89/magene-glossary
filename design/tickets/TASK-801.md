# 【TASK-801】glossa-cli 架构与 C 源码宏静态扫描 (`glossa push`)

*   **工单编号**：`TASK-801`
*   **所属 Epic**：`Epic 8: 研发工程闭环与 glossa-cli 命令行`
*   **冲刺归属**：`Sprint 5 (Milestone 5)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：CLI 架构师 / 嵌入式工具链工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-202`](./TASK-202.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 嵌入式固件 C 语言研发工程师，  
> **我需要** 在终端本地直接执行 `glossa push --dir=./src/ui`，静态扫描 C 源码中的 `KW_[A-Z0-9_]+` 宏及关联的中文注释，一键增量推送到云端版本库，  
> **以便于** 告别过去每次新增功能都需要切出 IDE、手动登录 Web 网页复制粘贴词条宏名的断裂操作，实现“代码编写即词条同步”的顺畅工程体验。

---

## 2. 涉及代码文件清单 (Target Files)
*   `cli/bin/glossa.ts` (基于 Commander 的 CLI 入口程序)
*   `cli/src/commands/push.ts` (推送命令实现)
*   `cli/src/scanners/c-macro-scanner.ts` (C 语言源码正则与 AST 解析器)
*   `cli/test/scanners/c-macro-scanner.test.ts` (扫描准确率单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 C 宏扫描规则
识别如下形态的宏声明与注释：
```c
// 功率目标区间超限报警 [max_chars: 18]
#define KW_POWER_ZONE_ALERT 1042
```
解析输出：
```typescript
interface ExtractedMacro {
  kw: 'KW_POWER_ZONE_ALERT';
  zhCn: '功率目标区间超限报警';
  maxChars: 18;
  filePath: string;
  lineNumber: number;
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 在测试 C 语言工程目录下执行 `npx glossa push`，成功扫描识别全部宏定义及中文注释；
- [ ] 调用后端增量接口，新宏成功落库，已存在的宏自动跳过不覆写（幂等保护）；
- [ ] 终端清晰打印扫描汇总报告（新增 N 条，跳过 N 条）。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:cli-scanner
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试覆盖各类 C 源码注释风格；
2. CLI 运行退出码规范（成功 0，异常非 0）。
