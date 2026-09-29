# 【TASK-803】移动端多语言资产编译输出 (Android XML & iOS Strings)

*   **工单编号**：`TASK-803`
*   **所属 Epic**：`Epic 8: 研发工程闭环与 glossa-cli 命令行`
*   **冲刺归属**：`Sprint 5 (Milestone 5)`
*   **优先级**：`P1 (High)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：移动端 / 全栈工程师
*   **当前状态**：`[DONE]`
*   **前置依赖**：[`TASK-802`](./TASK-802.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 迈金配套骑行手机 App（Android / iOS）研发团队，  
> **我需要** 执行 `glossa pull --format=android-xml` 与 `glossa pull --format=ios-strings` 自动生成对应的多语言文件，  
> **以便于** 智能硬件与配套 App 保持同源、绝对一致的专有名词与多语言表述，消除软硬件用词脱节的用户体验问题。

---

## 2. 涉及代码文件清单 (Target Files)
*   `cli/src/generators/android-generator.ts` (生成 `res/values-*/strings.xml`)
*   `cli/src/generators/ios-generator.ts` (生成 `*.lproj/Localizable.strings`)
*   `cli/test/generators/mobile-generators.test.ts` (转义与多语言规范测试)

---

## 3. 技术契约与详细设计 (Technical Specification)
- **Android XML**：处理转义符（`'` 转为 `\'`，`&` 转为 `&amp;`，`%s` 保持不变）；
- **iOS Strings**：输出 `"KW_NAME" = "Translated String";`，换行与双引号严格转义。

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 生成的 Android `strings.xml` 可直接被 Android Studio 解析，无 XML 语法报错；
- [ ] 生成的 iOS `Localizable.strings` 可直接被 Xcode 识别并编译通过；
- [ ] 占位符转换：支持根据移动端习惯规范化处理参数占位。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:mobile-generators
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试覆盖各类转义字符场景；
2. 移动端构建测试通过。
