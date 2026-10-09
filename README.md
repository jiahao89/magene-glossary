# GlossaHub - 专业码表与硬件词条协同翻译管理平台

> **版本**: v1.2 | **构建目标**: 妙搭 (MiaoDa) & 本地双模部署 | **架构**: React + Tailwind CSS + Express + Dual DB (SQLite / PostgreSQL)

GlossaHub 是专为迈金（Magene）智能骑行码表、车载中控、智能硬件固件及跨国多语言应用打造的**专业级多语言词条协同与翻译管理平台**。平台核心聚焦于**码表词条矩阵翻译、版本差异清洗、专业术语库管控与发布交付**，彻底解决固件开发中多语言分散、键值错漏、无网络时翻译阻断及云端部署门槛高等痛点。

---

## 🌟 核心特色与架构升级

### 1. ⚡ 多引擎 AI 智能翻译服务（解耦单一 Dify 强依赖）
系统不再过度依赖单一外部 Dify 工作流，全面升级为**三模高可用 AI 翻译矩阵**：
* ⚡ **大模型直连模式 (推荐)**：支持 DeepSeek-V3 (`deepseek-chat`)、阿里通义千问 (`qwen-plus`)、OpenAI (`gpt-4o-mini`) 等官方兼容 API，响应时间 < 800ms，性价比极高。
* 🌐 **Dify 智能体模式**：兼容迈金内部 Dify Agent (`night.magene.cn`) 及 Dify 官方云服务，支持复杂提示词工作流与上下文注入。
* 📦 **本地离线固件词典 (零网络/零延迟)**：内置迈金码表 16 国语言高频固件术语库（速度、踏频、功率、心率、导航、电量等）。在断网、未配置 Key 或外部 API 超时限制时，**100% 自动降级兜底**，保证批量翻译与 KW 智能补齐绝不报错中断！

### 2. 🚀 妙搭 (MiaoDa) 平台 1-Click PostgreSQL 原生支持
* **双数据库引擎 (Dual DB Strategy)**：
  * **妙搭/云端生产环境**：自动识别 `DATABASE_URL` 环境变量，无缝连接 PostgreSQL / Supabase。启动时自动执行幂等 DDL 建表、构建多列复合索引、预置项目及管理员账户。
  * **本地极速开发**：未设置 `DATABASE_URL` 时，零配置自动使用本地 SQLite (`glossahub.db`)，开箱即用。
* **一键自检与初始化脚本**：
  ```bash
  npm run db:init:pg
  ```
  自动检测 PostgreSQL 连接、执行 `db_init_pg.sql` 结构定义、校验核心数据表，秒级完成妙搭上线自检。

### 3. 🎨 Web 前卫设计规范与高对比度双主题
* 遵循 HeroUI / Modern Web 设计语言，提供清爽透亮「明亮浅色模式 (Light)」与深邃专业「暗黑极客模式 (Dark)」。
* 拒绝杂乱抽象面板，回归最直观高效的**矩阵大表 + 智能侧边栏/抽屉**布局，信息密度与可读性达到工业级水准。

---

## 🚀 核心功能模块

### 1. 📊 仪表盘看板 (Dashboard)
* **全局 KPI 统计**：动态统计当前版本大表数、中文词条总键数、全覆盖翻译词条数，实时计算全语种翻译完成率。
* **翻译/审核覆盖率双视图**：按语种柱状图展示红（<30%）、黄（30%~80%）、绿（>=80%）三色状态指示。
* **AI Telemetry 用量监控**：监控消耗 Token、调用次数与趋势折线图。
* **语种就绪矩阵**：横向柱状图排布展示 16 种目标语种的就绪比例。

### 2. 🔤 词条协同大表 (Translation Manager)
* **多语种协同大表**：支持单元格直接双击编辑、实时高亮未保存修改、乐观锁防冲突校验。
* **批量 AI 智能预翻译**：勾选任意词条，一键并行调用多引擎 AI 执行 16 国语言翻译，自带进度条与容错重试。
* **智能 KW 键名生成**：根据中文词义智能推荐规范的大写下划线键名（如 `KW_RIDE_HEART_RATE`）。
* **来源标记**：区分 `tm`（专业术语库命中）、`ai`（大模型生成）与 `human`（人工校对）。

### 3. 🔍 版本对比与误报清洗 (Comparison)
* **双版本对齐审计**：源版本与目标版本两两对齐，自动标定新增 (ADD)、删除 (DEL)、修改 (MOD)。
* **假差异字符消除**：智能过滤全半角符号、Unicode 省略号、弯引号、零宽空格等格式引发的假差异。

### 4. 📚 专业词汇库 (Glossary Engine)
* **动态多列 CSV 引擎**：支持解析、保存与还原任意列数和列名的术语库。
* **高保真导出**：一键导出与固件工程格式匹配的 CSV 资源。

### 5. 🕒 协同审计日志与 Git 式回退 (Logs & Rollback)
* 记录所有成员的每一次修改细节，支持历史快照查阅、Diff 对比视图与一键安全回退（附带“后悔药”机制）。

---

## 🛠️ 本地开发与部署运行

### 1. 本地极速启动 (SQLite 模式)
```bash
# 1. 安装依赖
npm install

# 2. 运行自动化测试 (166+ 项测试用例)
npm test

# 3. 启动全栈开发服务 (前端 5173 + 后端 3001)
npm run dev:all
```
浏览器访问：`http://localhost:5173`

默认账号密码：
* **系统管理员**：`admin` / `admin123`（或 `wangzhaoyun` / `magene123`）
* **普通编辑员**：`user1` / `user123`

---

### 2. 妙搭 (MiaoDa) 平台部署指南 (PostgreSQL 模式)

在妙搭平台部署 GlossaHub 极为简单，仅需两步：

1. **配置环境变量**：
   在妙搭应用设置中添加环境变量：
   ```env
   # 妙搭内置或外部 PostgreSQL 连接串
   DATABASE_URL=postgresql://username:password@host:port/dbname
   
   # JWT 密钥
   JWT_SECRET=magene_glossary_secret_key_2026
   
   # AI 翻译大模型 (可选，支持 DeepSeek-V3 直连)
   AI_PROVIDER=openai
   OPENAI_BASE_URL=https://api.deepseek.com/v1
   OPENAI_MODEL=deepseek-chat
   OPENAI_API_KEY=sk-your-deepseek-api-key
   ```

2. **构建与启动命令**：
   * 构建命令 (Build Command)：
     ```bash
     npm run build
     ```
   * 启动命令 (Start Command)：
     ```bash
     npm start
     ```
   *(服务启动时会自动检测并初始化全部数据库表和默认管理员账户，亦可运行 `npm run db:init:pg` 独立校验)*

---

## 🧪 测试与质量保证

项目采用严格的自动化测试体系：
```bash
npm test
```
包含：
* 单元测试： Myers Diff 算法、假差异清洗器、CSV 解析引擎、离线字典服务
* 集成测试： RBAC 权限边界、乐观锁并发控制、多模型 AI 容错降级
* 端到端自检： 数据库双引擎兼容性与会话安全
