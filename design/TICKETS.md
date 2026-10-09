# GlossaHub 下一代企业级固件词条平台 开发工单全景总览 (TICKETS.md)

> **文档标识**：`GLOSSA-AGILE-TICKETS-V2.0`  
> **更新日期**：2026-10-08  
> **归档位置**：`design/TICKETS.md`  
> **工单明细目录**：[`design/tickets/`](./tickets/)  
> **关联架构基准**：
> - [产品需求规格说明书 (PRD.md)](./PRODUCT_REQUIREMENTS_DOCUMENT.md)
> - [系统技术规格说明书 (TECHNICAL_SPECIFICATION.md)](./TECHNICAL_SPECIFICATION.md)
> - [前端设计规范与 HeroUI 架构标准 (design.md)](./design.md)
> - [开发任务分解总览 (DEVELOPMENT_TASKS_SPECIFICATION.md)](./DEVELOPMENT_TASKS_SPECIFICATION.md)

> **架构校准声明 (2026-10-09)**：
> 早期规划中曾探索过将后端重构为 Fastify / Drizzle ORM 以及将前端改为 3-Pane CAT 工作台的实验性分支 (`TASK-101` ~ `TASK-1402`)。
> 经业务评审与实际需求对齐，该探索方案背离了团队最核心的“高密度矩阵数据大表 (Airtable/Bitable 体验)”与“妙搭平台 PostgreSQL 一键直连部署”的核心定位。
> **当前唯一有效、正在执行的企业级敏捷工单清单已迁移至标准跟踪目录**：[`.scratch/tickets/`](../.scratch/tickets/)
> - `001-backend-ai-service-decoupling.md` [DONE]
> - `002-repository-data-layer.md` [DONE]
> - `003-frontend-hooks-refactoring.md` [DONE]
> - `004-excel-and-batch-services.md` [DONE]
> - `005-ai-direct-engine-and-miaoda-pg.md` [DONE]
> 下文收录的 `TASK-101` ~ `TASK-1402` 仅作为研发原型归档，不再作为交付依赖。

---

## 1. 敏捷开发冲刺总览与看板 (Agile Sprint Board & Burndown)

系统按照敏捷垂直切片（Tracer-bullet Vertical Slices）与严格的单向依赖拓扑，将全量 **14 大 Epic、44 个细粒度子任务** 划分为 **8 个开发冲刺阶段 (Sprints)**：
- **Sprint 1 ~ 5 (已全部通过自动化测试闭环验收 100% DONE)**
- **Sprint 6 ~ 8 (后续全栈联调、硬件约束增强与企业生产部署落地 TODO)**

```mermaid
kanban
  Sprint 1 [M1: 数据底座与兼容视图 - 100% DONE]
    [✔] TASK-101: Docker PG16 + pgvector 环境
    [✔] TASK-102: Drizzle ORM 7大表模型
    [✔] TASK-103: 存量数据无损迁移与对账
    [✔] TASK-104: 向后兼容视图 view_terms_legacy
  Sprint 2 [M2: 核心服务与双引擎 - 100% DONE]
    [✔] TASK-201: Fastify 整洁脚手架与异常
    [✔] TASK-202: 词条核心服务 TermService
    [✔] TASK-203: Legacy API Facade 垫片
    [✔] TASK-301: 字段级变更捕获服务
    [✔] TASK-302: 不可变快照与后悔药备份
    [✔] TASK-303: 时光机双向回退事务
    [✔] TASK-401: 假差异清洗器 Normalizer
    [✔] TASK-402: 固件 3D Diff 差分引擎
    [✔] TASK-403: 选择性增量合并 ApplyDiff
    [✔] TASK-404: ExcelJS 差异色块导出
  Sprint 3 [M3: 直连 AI 网关与 QA 质检 - 100% DONE]
    [✔] TASK-501: 多供应商直连适配网关
    [✔] TASK-502: 向量 TM 本地毫秒直通
    [✔] TASK-503: 微批聚合与并发控制
    [✔] TASK-504: L10n QA 质检与自纠错
  Sprint 4 [M4: HeroUI 前端大网格与 CAT 工作台 - 100% DONE]
    [✔] TASK-601: Design Tokens 与暗黑科技主题
    [✔] TASK-602: TanStack Query + Zustand 状态
    [✔] TASK-603: 万级数据 TanStack Virtual 网格
    [✔] TASK-604: 单元格局部原子隔离打字零重绘
    [✔] TASK-701: HeroUI Pro 3-Pane CAT 工作台
    [✔] TASK-702: 硬件屏幕 max_chars 动态仪表盘
    [✔] TASK-703: 真机 LCD/OLED 点阵拟真视窗
    [✔] TASK-704: Git 风格红绿 Diff 抽屉与安全模态
  Sprint 5 [M5: CLI 工具链与上线割接 - 100% DONE]
    [✔] TASK-801: glossa-cli 与 C 源码宏扫描
    [✔] TASK-802: 嵌入式 C 头文件 strings_lang 编译
    [✔] TASK-803: 移动端 XML 与 Strings 资产输出
    [✔] TASK-901: 75+ 存量 Golden Master 回归
    [✔] TASK-902: 灰度切流与 3 分钟应急回滚演练
  Sprint 6 [M6: 前后端全量联调与持久化 - 100% DONE]
    [✔] TASK-1001: TanStack Query 全量对接 Fastify API
    [✔] TASK-1002: 单元格防抖乐观更新与审计联动
    [✔] TASK-1003: 拖拽导入 Excel/CSV 与 Diff 预检
    [✔] TASK-1004: 主题与多语言视图偏好持久化
  Sprint 7 [M7: 硬件真机热区与约束增强 - 100% DONE]
    [✔] TASK-1101: 硬件截图热区联动标注与 SVG 映射
    [✔] TASK-1102: 固件点阵字体像素级字宽估算引擎
    [✔] TASK-1201: 轻量企业身份鉴权与操作人注入
    [✔] TASK-1202: 接口请求频次限制与 AI 防刷守卫
  Sprint 8 [M8: 生产部署与工程化落地 - 100% DONE]
    [✔] TASK-1301: 生产级 Dockerfile 多阶段构建
    [✔] TASK-1302: GitHub Actions CI/CD 与宏编译
    [✔] TASK-1303: 生产就绪健康检查探针与 Nginx
    [✔] TASK-1401: Playwright E2E 自动化端到端测试
    [✔] TASK-1402: 生产环境冷启动与真实种子数据注入
```

---

## 2. 全量开发工单索引表 (Master Ticket Directory)

| 工单编号 (Ticket ID) | 冲刺 (Sprint) | 模块所属 | 任务名称与交付重点 | 优先级 | 估算工时 | 责任角色 | 当前状态 |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| [`TASK-101`](./tickets/TASK-101.md) | Sprint 1 | Epic 1: 数据层 | Docker PG16 + pgvector 环境搭建 | P0 | 2d | DevOps/后端 | **[DONE]** |
| [`TASK-102`](./tickets/TASK-102.md) | Sprint 1 | Epic 1: 数据层 | Drizzle ORM 7 大核心表 Schema 建模与复合索引 | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-103`](./tickets/TASK-103.md) | Sprint 1 | Epic 1: 数据层 | 存量数据无损迁移与对账校验脚本 | P0 | 3d | 数据/后端 | **[DONE]** |
| [`TASK-104`](./tickets/TASK-104.md) | Sprint 1 | Epic 1: 数据层 | 挂载向后兼容视图 `view_terms_legacy` 与双向验证 | P0 | 2d | 后端 | **[DONE]** |
| [`TASK-201`](./tickets/TASK-201.md) | Sprint 2 | Epic 2: 服务底座 | Fastify 4.x + TS 5.x 分层整洁脚手架与全局异常拦截 | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-202`](./tickets/TASK-202.md) | Sprint 2 | Epic 2: 服务底座 | 词条核心服务 TermService 与加锁防篡改用例 | P0 | 4d | 后端 | **[DONE]** |
| [`TASK-203`](./tickets/TASK-203.md) | Sprint 2 | Epic 2: 服务底座 | 历史 API 兼容垫片层 Legacy API Facade | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-301`](./tickets/TASK-301.md) | Sprint 2 | Epic 3: 变更审计 | 字段级变更精准捕获服务 ChangeAuditService | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-302`](./tickets/TASK-302.md) | Sprint 2 | Epic 3: 变更审计 | 不可变快照生成与“后悔药”自动备份机制 | P0 | 2d | 后端 | **[DONE]** |
| [`TASK-303`](./tickets/TASK-303.md) | Sprint 2 | Epic 3: 变更审计 | 时光机一键回退事务与二次撤销安全保障 | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-401`](./tickets/TASK-401.md) | Sprint 2 | Epic 4: Diff 引擎 | 假差异智能归一化清洗管道 FalseDiffNormalizer | P0 | 3d | 后端/算法 | **[DONE]** |
| [`TASK-402`](./tickets/TASK-402.md) | Sprint 2 | Epic 4: Diff 引擎 | 固件双版本三维差分计算与多语种下钻过滤 | P0 | 4d | 后端 | **[DONE]** |
| [`TASK-403`](./tickets/TASK-403.md) | Sprint 2 | Epic 4: Diff 引擎 | 一键选择性增量合并同步 Selective Apply Diff | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-404`](./tickets/TASK-404.md) | Sprint 2 | Epic 4: Diff 引擎 | ExcelJS 差异色块高亮持久化导出管道 | P1 | 2d | 后端/全栈 | **[DONE]** |
| [`TASK-501`](./tickets/TASK-501.md) | Sprint 3 | Epic 5: AI 质检 | 多供应商直连网关适配器与故障熔断降级调度 | P0 | 4d | 后端/AI | **[DONE]** |
| [`TASK-502`](./tickets/TASK-502.md) | Sprint 3 | Epic 5: AI 质检 | 向量化 TM 翻译记忆库本地毫秒直通检索 | P1 | 3d | 后端/算法 | **[DONE]** |
| [`TASK-503`](./tickets/TASK-503.md) | Sprint 3 | Epic 5: AI 质检 | 微批聚合 (Micro-Batching) 与并发控制调度器 | P0 | 3d | 后端 | **[DONE]** |
| [`TASK-504`](./tickets/TASK-504.md) | Sprint 3 | Epic 5: AI 质检 | 自动化 L10n QA 质检拦截与自纠错引擎 | P0 | 3d | 后端/算法 | **[DONE]** |
| [`TASK-601`](./tickets/TASK-601.md) | Sprint 4 | Epic 6: 前端网格 | HeroUI v3 + Tailwind v4 Design Tokens 样式引擎 | P1 | 2d | 前端 | **[DONE]** |
| [`TASK-602`](./tickets/TASK-602.md) | Sprint 4 | Epic 6: 前端网格 | 前端状态管理架构 (TanStack Query + Zustand) | P0 | 3d | 前端 | **[DONE]** |
| [`TASK-603`](./tickets/TASK-603.md) | Sprint 4 | Epic 6: 前端网格 | 万级数据量零卡顿虚拟网格 (TanStack Virtual) | P0 | 4d | 前端 | **[DONE]** |
| [`TASK-604`](./tickets/TASK-604.md) | Sprint 4 | Epic 6: 前端网格 | 单元格局部原子状态隔离与打字零重绘 | P0 | 2d | 前端 | **[DONE]** |
| [`TASK-701`](./tickets/TASK-701.md) | Sprint 4 | Epic 7: CAT 工作台 | HeroUI Pro 3-Pane 沉浸式 CAT 工作台与快捷键流 | P0 | 4d | 前端 | **[DONE]** |
| [`TASK-702`](./tickets/TASK-702.md) | Sprint 4 | Epic 7: CAT 工作台 | 硬件屏幕 max_chars 动态三色仪表盘指示器 | P0 | 2d | 前端 | **[DONE]** |
| [`TASK-703`](./tickets/TASK-703.md) | Sprint 4 | Epic 7: CAT 工作台 | 真机点阵拟真视窗与截图高亮热区映射组件 | P1 | 3d | 前端 | **[DONE]** |
| [`TASK-704`](./tickets/TASK-704.md) | Sprint 4 | Epic 7: CAT 工作台 | Git 风格红绿 Diff 抽屉与具备后悔药的安全模态窗 | P0 | 3d | 前端 | **[DONE]** |
| [`TASK-801`](./tickets/TASK-801.md) | Sprint 5 | Epic 8: 研发工具 | glossa-cli 架构与 C 源码宏静态扫描 (`glossa push`) | P0 | 3d | CLI/嵌入式 | **[DONE]** |
| [`TASK-802`](./tickets/TASK-802.md) | Sprint 5 | Epic 8: 研发工具 | 嵌入式 C 代码编译生成 (`glossa pull --format=c-header`) | P0 | 3d | 嵌入式/C | **[DONE]** |
| [`TASK-803`](./tickets/TASK-803.md) | Sprint 5 | Epic 8: 研发工具 | 移动端多语言资产编译输出 (Android XML & iOS Strings) | P1 | 2d | 移动端/全栈 | **[DONE]** |
| [`TASK-901`](./tickets/TASK-901.md) | Sprint 5 | Epic 9: 测试切流 | 75+ 存量 Golden Master 回归契约测试网 | P0 | 3d | QA/测试 | **[DONE]** |
| [`TASK-902`](./tickets/TASK-902.md) | Sprint 5 | Epic 9: 测试切流 | 灰度切流演练与 3 分钟应急回滚预案实操验证 | P0 | 2d | DevOps/SRE | **[DONE]** |
| [`TASK-1001`](./tickets/TASK-1001.md) | Sprint 6 | Epic 10: 联调持久化 | 前端 TanStack Query 全量对接 Fastify 后端 REST API | P0 | 3d | 前端/全栈 | **[DONE]** |
| [`TASK-1002`](./tickets/TASK-1002.md) | Sprint 6 | Epic 10: 联调持久化 | 单元格内联编辑防抖、乐观更新与实时审计联动 | P0 | 2d | 前端 | **[DONE]** |
| [`TASK-1003`](./tickets/TASK-1003.md) | Sprint 6 | Epic 10: 联调持久化 | 批量导入导出交互：拖拽上传 Excel/CSV 与 Diff 预检 | P1 | 3d | 前端/全栈 | **[DONE]** |
| [`TASK-1004`](./tickets/TASK-1004.md) | Sprint 6 | Epic 10: 联调持久化 | 用户界面个性化偏好持久化：浅色/深色模式与展示列恢复 | P2 | 1d | 前端 | **[DONE]** |
| [`TASK-1101`](./tickets/TASK-1101.md) | Sprint 7 | Epic 11: 硬件约束增强 | 硬件真机截图热区联动标注与 SVG 归一化矩形映射 | P1 | 3d | 前端/UI | **[DONE]** |
| [`TASK-1102`](./tickets/TASK-1102.md) | Sprint 7 | Epic 11: 硬件约束增强 | 固件嵌入式点阵字体像素级物理字宽估算引擎 | P2 | 2d | 算法/前端 | **[DONE]** |
| [`TASK-1201`](./tickets/TASK-1201.md) | Sprint 7 | Epic 12: 企业内网安全 | 轻量级企业身份鉴权与操作人上下文自动注入 | P1 | 2d | 后端 | **[DONE]** |
| [`TASK-1202`](./tickets/TASK-1202.md) | Sprint 7 | Epic 12: 企业内网安全 | 接口请求频次限制与 AI 外部网关防刷保护 | P2 | 1.5d | 后端/DevOps | **[DONE]** |
| [`TASK-1301`](./tickets/TASK-1301.md) | Sprint 8 | Epic 13: 生产部署CI/CD | 生产级 Dockerfile 多阶段构建与 docker-compose.prod.yml | P0 | 2d | DevOps | **[DONE]** |
| [`TASK-1302`](./tickets/TASK-1302.md) | Sprint 8 | Epic 13: 生产部署CI/CD | GitHub Actions CI/CD 流水线与固件 Release 宏编译触发 | P0 | 2.5d | DevOps/全栈 | **[DONE]** |
| [`TASK-1303`](./tickets/TASK-1303.md) | Sprint 8 | Epic 13: 生产部署CI/CD | 生产就绪健康检查探针与 Nginx 反向代理配置 | P1 | 1.5d | SRE/后端 | **[DONE]** |
| [`TASK-1401`](./tickets/TASK-1401.md) | Sprint 8 | Epic 14: E2E 自动化 | Playwright E2E 自动化端到端测试套件 | P1 | 3d | QA/全栈 | **[DONE]** |
| [`TASK-1402`](./tickets/TASK-1402.md) | Sprint 8 | Epic 14: E2E 自动化 | 生产环境冷启动与真实业务种子数据一键注入 | P1 | 1.5d | 数据/后端 | **[DONE]** |

---

## 3. 工单认领与执行协议 (Ticket Execution Protocol for Agents & Engineers)

为确保开发过程具备严格的工业级可维护性与测试驱动质量，任何工程师或 AI 代理在领单执行时，必须严格遵守以下契约：

1. **领单前置依赖检查**：
   - 必须确认该工单的“前置依赖工单（Dependencies）”均已标记为 `[DONE]`；
   - 运行前置依赖的验证命令，确保开发基线处于 100% 绿色可用状态。
2. **测试驱动开发 (TDD First)**：
   - 优先根据工单中的“验收条件 (AC Checklist)”编写自动化测试脚本或单元测试用例（Red 阶段）；
   - 实现业务代码直至测试全部通过（Green 阶段）；
   - 执行重构与性能调优（Refactor 阶段）。
3. **保持向后兼容承诺**：
   - 涉及数据修改或接口变动的工单，必须保证 `view_terms_legacy` 视图与 `/api/tables/:id/sync` 契约不被破坏。
4. **交付即验收 (DoD 契约)**：
   - 运行工单中明确指明的“验证命令 (Verification Command)”；
   - 确保 `npm run build` 零 Warning 零 Error；
   - 在工单列表中更新状态为 `[DONE]`。

---

## 4. 全量里程碑交付状态：Sprint 1 ~ Sprint 5 全线竣工 (100% DONE)

全部 5 个核心里程碑共 9 大 Epic、31 个工单已 100% 开发完成，并通过自动化端到端测试与 Golden Master 契约验证：

- **Milestone 1 (Sprint 1: 基础设施与数据底座)**：[`verify:m1`](../server/scripts/verify-milestone1.ts) [100% PASS]
  - PostgreSQL 16 + pgvector Docker 环境、Drizzle ORM 7 大核心表、无损迁移与兼容视图 `view_terms_legacy`。
- **Milestone 2 (Sprint 2: 核心服务与双引擎)**：[`verify:m2`](../server/scripts/verify-milestone2.ts) [100% PASS]
  - Fastify 5.x 脚手架、TermService 防篡改加锁、Legacy API Facade 垫片、ChangeAuditService 字段级 Myers Diff、不可变快照与时光机回退、FalseDiffNormalizer 假差异清洗器、3D Diff 引擎、选择性合并与 ExcelJS 导出。
- **Milestone 3 (Sprint 3: 直连 AI 网关与 QA 质检)**：[`verify:m3`](../server/scripts/verify-milestone3.ts) [100% PASS]
  - 多模型熔断降级 AI 网关、TM 向量/编辑距离毫秒直通检索、微批聚合与并发控制调度器、L10n QA 质检自纠错。
- **Milestone 4 (Sprint 4: HeroUI 前端大网格与 CAT 工作台)**：[`verify:m4`](../server/scripts/verify-milestone4.ts) [100% PASS]
  - HeroUI v3 + Tailwind v4 Design Tokens 样式引擎、TanStack Query + Zustand 状态流、万级虚拟网格零重绘局部编辑、HeroUI Pro 3-Pane CAT 工作台与全键盘流、硬件 max_chars 动态仪表盘、C606 LCD/OLED 拟真点阵视窗、Git 风格红绿 Diff 抽屉与安全模态窗。
- **Milestone 5 (Sprint 5: 研发工程闭环与上线割接)**：[`verify:m5`](../server/scripts/verify-milestone5.ts) [100% PASS]
  - `glossa push` C 源码宏扫描、`glossa pull --format=c-header` 嵌入式 C 头文件编译 (Clang 0 Error 0 Warning 验证)、Android XML & iOS Strings 资产生成、75+ 存量 Golden Master 回归网、3 分钟灰度切流与应急回滚演练。

**全量测试网验证基线**：
```bash
npm test # 执行 verify:all (M1 + M2 + M3 + M4 + M5)
npx tsc --noEmit # 静态类型安全检查 (0 Errors)
npm run build:client # 前端构建耗时 < 200ms
```
