# 【TASK-802】嵌入式 C 代码编译生成 (`glossa pull --format=c-header`)

*   **工单编号**：`TASK-802`
*   **所属 Epic**：`Epic 8: 研发工程闭环与 glossa-cli 命令行`
*   **冲刺归属**：`Sprint 5 (Milestone 5)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：嵌入式工具链工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-801`](./TASK-801.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 嵌入式固件编译构建系统（GitLab CI / 自动化 Makefile），  
> **我需要** 在固件发版流水线中执行 `glossa pull --version=v2.0.0 --format=c-header`，直接编译生成嵌入式 C 源码所需的 `strings_lang.h` 与 `strings_lang.c`，  
> **以便于** 彻底取代以往手工从 Excel 导出、格式化后粘贴进 C 头文件的陈旧手工作坊流程，实现固件多语言资产零人工干预的自动化代码生成（Code Generation）。

---

## 2. 涉及代码文件清单 (Target Files)
*   `cli/src/commands/pull.ts` (拉取并编译导出命令)
*   `cli/src/generators/c-header-generator.ts` (C 头文件与常量查找表代码生成器)
*   `cli/test/generators/c-header-generator.test.ts` (GCC 编译无警告回归测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 生成的 C 语言标准文件结构
1. **`strings_lang.h`**：
   - 语言枚举声明：`typedef enum { LANG_ZH_CN = 0, LANG_EN_US, ... } firmware_lang_t;`
   - 词条宏名枚举：`typedef enum { KW_POWER_ZONE_ALERT = 0, ... } string_kw_id_t;`
   - 查找表 extern 函数声明：`const char* get_firmware_string(string_kw_id_t id, firmware_lang_t lang);`
2. **`strings_lang.c`**：
   - 二维常量只读数组（`const char* const g_firmware_strings[MAX_KWS][MAX_LANGS] = { ... };`）；
   - 严格转义双引号、反斜杠与换行符。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 执行 `glossa pull --format=c-header` 成功在目标目录生成 `strings_lang.h` 与 `strings_lang.c`；
- [ ] 使用系统 GCC / Clang 编译生成的 C 文件：`gcc -Wall -Werror -Wextra -c strings_lang.c`，控制台 0 Warning 0 Error；
- [ ] 边界测试：译文中包含换行 `\n` 或英文双引号 `"` 时，生成的 C 代码中正确转义为 `\"` 与 `\n`，无语法错误。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:c-generator
```

---

## 6. 完成定义 (Definition of Done)
1. GCC/Clang 严格模式编译通过；
2. 生成的常量表占用 ROM 空间最优化。
