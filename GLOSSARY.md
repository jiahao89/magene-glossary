# Domain Glossary: GlossaHub

本文档定义 GlossaHub 固件多语言协同翻译与术语管理平台的领域模型通用语言（Ubiquitous Language）与核心实体。

---

## 1. 核心实体与概念 (Core Entities)

### Term (词条)
- **定义**: 码表及硬件固件中的最小翻译单元。
- **唯一标识**: 联合主键 `(version_id, kw)`。
- **关键属性**:
  - `kw`: 固件代码引用的常量宏/键名（如 `KW_RIDE_HEART_RATE`）。
  - `zh_cn`: 中文基准源文案。
  - `context`: 所在界面/上下文语境（如“仪表盘页”、“设置菜单”）。
  - `owner`: 负责该词条的固件工程师。
  - `translations`: JSON 映射对象，记录目标语种与翻译文本（如 `{"EN（英文）": "Heart Rate"}`）。
  - `translations_meta`: 来源标记 JSON（`tm`: 术语库直接匹配, `ai`: 大模型生成, `human`: 人工校对）。
  - `status`: 词条审核状态（`DRAFT` 草稿, `APPROVED` 已审核, `REJECTED` 驳回）。
  - `is_locked`: 锁定保护标志。

### Version / Table (数据表 / 固件版本)
- **定义**: 词条集合的容器，代表特定固件分支、硬件型号或发版里程碑（如“C706-v2.1”）。
- **关系**: 属于一个 `Project`，包含多个 `Term`。

### Project (项目)
- **定义**: 多语言工程管理最高作用域（如 `proj-default` 迈金智能骑行码表）。
- **关系**: 拥有独立的目标语种字典配置、成员权限（RBAC）与 AI 翻译引擎配置。

### Glossary Term (专业术语规则)
- **定义**: 迈金官方统一的技术专有名词定义（如“踏频” -> “Cadence”）。
- **作用**: 在 AI 翻译中作为一票否决规则（Full Match Bypass）或 Prompt 上下文强制注入（Partial Match Prompting）。

### Term Snapshot (词条版本快照)
- **定义**: 词条修改时生成的不可变历史状态快照。
- **用途**: 支撑审计日志的 Git 式双列 Diff 差异对比，以及一键安全回退（附带“后悔药”快照）。

### Recycle Bin (数据回收站)
- **定义**: 误删防护层。被删除的数据表及其级联词条进入回收站暂存 30 天，支持一键无损还原。

---

## 2. 关键业务机制 (Business Mechanisms)

### Two-tier Intercept Funnel (两级拦截漏斗)
1. **Full Match Bypass (全匹配短路)**: 若中文词条与本地术语库 100% 精确一致，跳过外部 AI 调用，直接返回权威术语翻译，标记为 `tm`。
2. **Partial Match Prompting (局部匹配规则注入)**: 若词条包含术语库关键词，动态提取相关翻译约束规则注入到 LLM Prompt 中强制模型遵循。

### Multi-engine AI Strategy (多引擎 AI 翻译架构)
1. **大模型直连 (Direct LLM)**: 经由 OpenAI 兼容标准接口直接连接 DeepSeek-V3 / 通义千问 / OpenAI，延迟低且成本可控。
2. **本地离线固件词典 (Offline Dict Fallback)**: 内置迈金高频固件词库，在外部网络故障、超额或超时时 100% 自动兜底。
3. **Dify 工作流模式 (Legacy Agent Adapter)**: 兼容传统 Dify 智能体应用。

### Dual DB Strategy (双数据库策略)
- **本地开发**: 极速免配置 SQLite（`glossahub.db`），自动启用 WAL 模式。
- **妙搭 / 云端部署**: 原生支持 PostgreSQL，通过环境变量 `DATABASE_URL` 自动识别并执行幂等 DDL 初始化。

### Optimistic Concurrency Control (乐观锁)
- 基于 `updated_at` 时间戳进行更新前版本检查。若并发协同人员已保存较新版本，拒绝更新并提示 409 冲突，彻底避免脏写覆盖。
