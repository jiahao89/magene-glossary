# 【TASK-101】Docker PostgreSQL 16 与 pgvector 扩展环境搭建

*   **工单编号**：`TASK-101`
*   **所属 Epic**：`Epic 1: 基础设施与数据持久化层`
*   **冲刺归属**：`Sprint 1 (Milestone 1)`
*   **优先级**：`P0 (Blocker)`
*   **估算工时**：`2d (16h)`
*   **责任角色**：DevOps / 后端工程师
*   **当前状态**：`[DONE]` (已在里程碑 1 成功交付并通过验证)
*   **前置依赖**：无

---

## 1. 业务价值与用户故事 (User Story)
> **作为** 平台数据持久化与向量记忆库基础，  
> **我需要** 搭建标准化、高可靠的 PostgreSQL 16 数据库容器与本地离线 PGlite 嵌入式引擎，并预装 `pgvector` 向量扩展插件，  
> **以便于** 支撑万级词条多语言行级拆解存储与亚秒级向量相似度检索，同时保证本地开发测试环境 0 外部依赖极速启动。

---

## 2. 涉及代码文件清单 (Target Files)
*   [`docker-compose.yml`](file:///Users/jacko/Projects/magene-glossary/docker-compose.yml) (PostgreSQL 16 + pgvector 容器编排)
*   [`server/src/common/database/db.client.ts`](file:///Users/jacko/Projects/magene-glossary/server/src/common/database/db.client.ts) (双模数据库客户端：支持在线 PG 与零配置 PGlite)
*   [`server/scripts/verify-milestone1.ts`](file:///Users/jacko/Projects/magene-glossary/server/scripts/verify-milestone1.ts) (自动化环境自检脚本)

---

## 3. 验收条件清单 (Acceptance Criteria Checklist)
- [x] 配置 `docker-compose.yml` 官方 `pgvector/pgvector:pg16` 镜像；
- [x] 提供零配置离线嵌入式 PGlite 引擎兜底，支持无 Docker 环境下秒级拉起真实 Postgres 内核；
- [x] 成功激活 `vector` 向量扩展；
- [x] 运行自检脚本，3秒内完成环境健康核验。

---

## 4. 验证命令 (Verification Command)
```bash
npm run verify:m1
```

---

## 5. 完成定义 (Definition of Done)
- [x] Milestone 1 验收套件全绿通过。
