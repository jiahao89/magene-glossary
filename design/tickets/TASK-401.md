# 【TASK-401】假差异智能归一化清洗管道 FalseDiffNormalizer

*   **工单编号**：`TASK-401`
*   **所属 Epic**：`Epic 4: 固件版本对比 Diff 引擎`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`3d (24h)`
*   **责任角色**：后端/算法工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-202`](./TASK-202.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 固件版本发版工程师，  
> **我需要** 在比对两个固件版本时，系统能自动过滤由于换行符差异（`\r\n` vs `\n`）、零宽不可见字符（`\u200B`）、中文弯单双引号与直引号、全角/半角标点符号及首尾多余空格引起的“假差异（False Diff）”，  
> **以便于** 研发与本地化团队不再被成百上千条无意义的无损格式差异分散精力，将宝贵的人力集中在真正的业务文案增删改查上。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/diff/normalizer.ts` (假差异清洗管道核心类)
*   `server/test/modules/diff/normalizer.test.ts` (全边界假差异清洗单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 归一化清洗规则明细表
| 清洗阶段 | 输入特征 | 归一化目标规范 | 典型示例 |
| :--- | :--- | :--- | :--- |
| 1. 换行与回车 | `\r\n`, `\r` | 统一替换为 `\n` | `Hello\r\nWorld` ➔ `Hello\nWorld` |
| 2. 不可见控制符 | `\u200B` (零宽空格), `\uFEFF` (BOM), `\u00A0` | 剔除或替换为普通空格 | `Start\u200B` ➔ `Start` |
| 3. 引号对齐 | 中文弯引号 `“”‘’` | 统一替换为半角直引号 `"'` | `“心率”` ➔ `"心率"` |
| 4. 标点符号对齐 | 全角冒号 `：`、全角逗号 `，`、全角分号 `；` | 统一对齐为半角冒号 `:`、逗号 `,`、分号 `;` | `设置：开` ➔ `设置:开` |
| 5. 省略号对齐 | 连续点号 `...`、Unicode 省略号 `…` | 统一替换为半角 `...` | `加载中…` ➔ `加载中...` |
| 6. 空白字符修剪 | 首尾空格、连续多空格 | 修剪首尾空白，连续空格折叠为单空格 | `  Power  Zone ` ➔ `Power Zone` |

### 3.2 接口契约
```typescript
// server/src/modules/diff/normalizer.ts
export class FalseDiffNormalizer {
  /** 对输入字符串执行规范化清洗 */
  static normalize(text?: string | null): string;

  /** 判断两个字符串在排除假差异后是否存在实质性变动 */
  static hasRealDiff(a?: string | null, b?: string | null): boolean;

  /** 比较并返回详细的归一化元数据 */
  static analyzeDiff(a?: string | null, b?: string | null): {
    isRealDiff: boolean;
    isFalseDiff: boolean;
    normalizedA: string;
    normalizedB: string;
  };
}
```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 比对 `"结束骑行： "` 与 `"结束骑行:"`，判定为无实质变动（`hasRealDiff === false`，`isFalseDiff === true`）；
- [ ] 比对 `"Power\r\nAlert"` 与 `"Power\nAlert"`，判定为无实质变动；
- [ ] 比对包含 `\u200B` 零宽字符的文本与干净文本，判定为无实质变动；
- [ ] 真实业务变动（如 `"结束骑行"` vs `"停止记录"`），精准判定为存在实质差异（`hasRealDiff === true`）；
- [ ] 性能标尺：对 10,000 对随机注入假差异的字符串进行清洗与比对测试，执行耗时 $\le 20\text{ms}$。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:normalizer
# 或运行独立测试
npx tsx server/test/modules/diff/normalizer.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 包含所有 6 类标点与控制符场景的单元测试全部通过；
2. 零外部重型依赖，完全基于纯正则与原生 JS 字符串编译优化。
