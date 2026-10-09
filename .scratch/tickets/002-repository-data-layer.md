---
id: "002"
title: "提炼统一数据访问层 (Repository Data Access Layer)"
status: "done"
labels: ["ready-for-agent", "refactor", "backend", "database"]
---

# Ticket 002: 提炼统一数据访问层 (Repository Layer)

## 目标
消除各路由直接写 SQL 以及满屏 `if (dbType === 'postgres') ... else ...` 的补丁代码：
1. **创建核心 Repository**：
   - `server/repositories/termRepository.cjs`: 负责词条查询、分页搜索、乐观锁更新、快照写入事务。
   - `server/repositories/versionRepository.cjs`: 负责数据表列表、版本增删改、克隆。
   - `server/repositories/projectRepository.cjs`: 负责项目、RBAC 成员管理及 AI 配置读取。
2. **规范双库方言差异**：
   - 将 SQLite 的 `INTEGER (0/1)` 与 PostgreSQL 的 `BOOLEAN`、`ON CONFLICT` 差异收拢至数据访问层内部，业务层无感知。
3. **保持 100% 数据库兼容性**：
   - 本地 SQLite (`glossahub.db`) 与妙搭 PostgreSQL (`DATABASE_URL`) 均无缝运行并通过全部测试。

## 任务清单
- [x] 创建 `server/repositories/termRepository.cjs`
- [x] 创建 `server/repositories/versionRepository.cjs`
- [x] 创建 `server/repositories/projectRepository.cjs`
- [x] 重构 `server/routes/terms.cjs` 与 `server/routes/versions.cjs` 对接 Repository
- [x] 运行 `npx vitest run` 验证所有数据库与 RBAC 测试 100% 通过

