# 【TASK-202】词条核心服务 TermService 与加锁防篡改用例

*   **工单编号**：`TASK-202`
*   **所属 Epic**：`Epic 2: 服务底座与向后兼容垫片层`
*   **冲刺归属**：`Sprint 2 (Milestone 2)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`4d (32h)`
*   **责任角色**：后端高级工程师
*   **当前状态**：`[READY]`
*   **前置依赖**：[`TASK-201`](./TASK-201.md)

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 本地化协调员或固件工程师，  
> **我需要** 对词条核心元数据（KW 宏键名、中文原文、物理屏幕 max_chars 字符上限）及各单语种细粒度译文进行关系化增删改查、排序与批量同步，  
> **以便于** 平台彻底告别旧系统单列 JSON 并发覆写的脏写痛点，且当词条被锁定（`is_locked=true`）或版本已封板（`is_sealed=true`）时，任何写操作均被强一致性拦截，保护已发布的量产固件零劣化。

---

## 2. 涉及代码文件清单 (Target Files)
*   `server/src/modules/term/term.schema.ts` (TypeBox / Zod 请求与响应契约)
*   `server/src/modules/term/term.repository.ts` (基于 Drizzle ORM 的事务化数据读写仓储)
*   `server/src/modules/term/term.service.ts` (核心领域用例：创建、更新、加锁、封板校验、批量同步)
*   `server/src/modules/term/term.controller.ts` (HTTP 请求解析与响应调度)
*   `server/src/modules/term/term.routes.ts` (Fastify 路由注册：`/api/v2/terms`)
*   `server/test/modules/term/term.service.test.ts` (核心业务单元测试)

---

## 3. 技术契约与详细设计 (Technical Specification)

### 3.1 核心服务接口契约
```typescript
// server/src/modules/term/term.service.ts
export interface CreateTermDto {
  versionId: string;
  kw: string;
  zhCn: string;
  contextDesc?: string;
  maxChars?: number;
  sortOrder?: number;
  translations?: Record<string, string>; // 可选初始翻译
}

export interface UpdateTermDto {
  zhCn?: string;
  contextDesc?: string;
  maxChars?: number;
  isLocked?: boolean;
  sortOrder?: number;
}

export interface UpsertTranslationDto {
  termId: string;
  languageCode: string;
  translationText: string;
  sourceType?: 'human' | 'ai' | 'tm';
  operatorId?: string;
}
```

### 3.2 封板与加锁防御规则 (Locking Invariant)
在执行任何 `updateTerm`、`deleteTerm`、`upsertTranslation` 操作前，必须在单一事务中执行：
1. **版本封板检查**：
   ```sql
   SELECT is_sealed FROM versions WHERE id = :versionId;
   -- 若 is_sealed = true，立即抛出 SealedVersionError("固件版本已封板归档，禁止修改")
   ```
2. **词条加锁检查**：
   ```sql
   SELECT is_locked FROM terms WHERE id = :termId;
   -- 若 is_locked = true，立即抛出 LockViolationError("词条已被人工加锁锁定，禁止覆写")
   ```

---

## 4. 验收条件清单 (Acceptance Criteria Checklist)
- [ ] 创建新词条：成功在 `terms` 表生成记录，并正确插入 `term_translations` 子表行；
- [ ] KW 唯一性保护：在同一 `version_id` 下插入重复 KW，返回 409 Conflict 异常；
- [ ] 单语种更新原子性：更新德语翻译时，仅更新 `term_translations` 中 `language_code='de'` 的行，其余 15+ 语种数据行完全不动；
- [ ] 封板版本防御：将 `version.is_sealed` 置为 `true` 后，无论是调用修改词条还是插入翻译，均返回 403 明确封板拦截；
- [ ] 词条加锁防御：将 `term.is_locked` 置为 `true` 后，后续翻译覆写请求返回 403 明确加锁拦截；
- [ ] 批量词条查询：`GET /api/v2/versions/:versionId/terms` 支持关键词模糊搜索与分页，1000 条词条响应耗时 $\le 40\text{ms}$。

---

## 5. 验证命令 (Verification Command)
```bash
npm run test:term-service
# 或运行独立测试
npx tsx server/test/modules/term/term.service.test.ts
```

---

## 6. 完成定义 (Definition of Done)
1. 单元测试与集成测试 100% 通过；
2. 覆盖并发更新与加锁拦截场景；
3. TypeScript 类型完全推导，无任何 `any`。
