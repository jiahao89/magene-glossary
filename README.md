# GlossaHub v2.0 (迈金科技下一代固件多语言词条平台)

> **面向智能 GPS 骑行码表、室内智能骑行台、心率/踏频/功率传感器与移动端 App 的企业级固件词条翻译、版本差分治理与本地化资产管理中枢 (TMS)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4_OKLCH-38bdf8.svg)](https://tailwindcss.com/)
[![HeroUI](https://img.shields.io/badge/Design-HeroUI_%26_shadcn-purple.svg)](https://heroui.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2Bpgvector-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 🌟 核心业务板块与系统特色

根据 `handoff/` 业务基准与工程减负原则，GlossaHub v2.0 摒弃了过往未曾发挥效用的多级审核状态机与五级繁重 RBAC 拦截，全力聚焦于**词条多语言资产治理、高精度版本对比 Diff 引擎、字段级变更审计时光机与嵌入式物理硬件约束**：

```
+----------------------------------------------------------------------------------------------------+
|                                    GLOSSA-HUB v2.0 架构全景                                         |
+----------------------------------------------------------------------------------------------------+
|  1. 词条多语言矩阵大盘 (Terms & Matrix)                                                             |
|     • 万级词条虚拟化大网格 (TanStack Virtual)，首屏秒开 <100ms，60FPS 极速滚动                      |
|     • 独立单元格原子隔离打字零重绘，1.5 秒防抖自动落库，粘性冻结 KW 宏名与中文基准列                 |
|     • 物理屏幕 max_chars 字长超限实时标警与字数差预警                                              |
|     • 批量多模型 AI 翻译补全、批量锁定防篡改、ExcelJS 原生 Excel / 嵌入式 C 头文件导出              |
|  ------------------------------------------------------------------------------------------------- |
|  2. 沉浸式 CAT 译员工作台 (CAT Studio)                                                             |
|     • HeroUI Pro Mail-Template 3-Pane 高密度心流布局 (待办清单 / 中文基准与编辑 / 翻译资产 Dock)   |
|     • 统一翻译资产 Dock：官方术语库规范提示、TM 记忆库相似匹配 (Alt+1)、AI 建议 (Alt+2)             |
|     • 纯键盘高产心流：Ctrl+Enter 快速保存下移、Alt+H 呼出历史抽屉、J/K 快速切换词条                 |
|  ------------------------------------------------------------------------------------------------- |
|  3. 固件 3D 版本对比差分引擎 (Version Diff Engine)                                                 |
|     • 核心生命线！跨固件/应用基线版本深度差分对比 (如 v2.0.0 vs v1.9.0)                            |
|     • 智能假差异清洗管道 (FalseDiffNormalizer)，自动清洗全半角标点、引号、零宽与首尾空格             |
|     • ADD (新增)、DEL (删除线)、MOD (Git 风格红绿高对比差异)，支持按单语种下钻过滤                  |
|     • 一键选择性增量合并 (Selective Apply Diff)，自动生成 Excel 差异色块报告                       |
|  ------------------------------------------------------------------------------------------------- |
|  4. 不可变变更审计与“后悔药”时光机 (Audit Trail & Time Machine)                                    |
|     • 核心生命线！东八区 (CST) 精确时间戳、操作人、词条 KW 宏、前后值双列 Myers 差异对比            |
|     • 不可变历史快照库；独创“后悔药”保障机制：回退前自动备份当前最新状态快照，杜绝误操作破坏        |
|  ------------------------------------------------------------------------------------------------- |
|  5. 统一术语库 (Glossary) 与向量记忆库 (TM)                                                        |
|     • 迈金官方统一术语标准表，严苛禁用词 (Forbidden Words) 自动标红拦截                            |
|     • PostgreSQL 16 pgvector 向量余弦检索 (<18ms)，100% 精确匹配 0 成本直通                        |
|  ------------------------------------------------------------------------------------------------- |
|  6. 研发工程闭环工具链 (glossa-cli & GitOps)                                                       |
|     • glossa push: 静态扫描 C 源码宏定义 (KW_*) 与 [max_chars: N] 边界注释自动入库                 |
|     • glossa pull: 自动编译嵌入式 C 头文件 (strings_lang.h/c) 与 Android XML / iOS Strings 资产    |
+----------------------------------------------------------------------------------------------------+
```

---

## 🎨 设计系统：HeroUI & shadcn 浅色/深色双主题

系统全面重构并采用 **HeroUI v3 + Tailwind v4 + OKLCH 色彩体系**，提供业界顶级的视觉体验与无障碍高可读性：

* **☀️ 浅色模式 (Light Mode - 纯净微灰)**：
  - 基准画布底色：纯净微灰（`bg-slate-50`），内容卡片为纯白（`bg-white`），边框为细微柔和灰（`border-slate-200`）；
  - 文字对比度严格达标 WCAG AA+（主标题 `text-slate-900`，正文 `text-slate-800`，注释 `text-slate-600`），告别泛灰难认问题；
  - 差分红绿对比：浅红底深红字（`bg-rose-50 text-rose-800 border-rose-200`）与浅绿底深绿字（`bg-emerald-50 text-emerald-800 border-emerald-200`），前后对比分明。
* **🌙 深色模式 (Dark Mode - 锌黑极光)**：
  - 渐进式层次黑：`bg-slate-950`（背景底色） $\rightarrow$ `bg-slate-900`（卡片表面） $\rightarrow$ `bg-slate-800`（浮层/抽屉）；
  - 荧光高亮：迈金品牌橙（`--color-primary`）与极光青（`--color-accent`），深色下清晰发光。
* **一键无缝切换**：顶栏右上角常驻太阳/月亮图标，支持一键热切换，所有 6 大页面、模态窗与滑动抽屉完全自适应。

---

## 📁 项目目录结构

```text
magene-glossary/
├── cli/                     # Glossa CLI 研发工具链 (宏静态扫描、C/Android/iOS 资产编译)
│   ├── bin/glossa.ts        # 命令行入口 (glossa push / glossa pull)
│   ├── src/generators/      # C 头文件、常量查表、Android XML、iOS Strings 编译器
│   ├── src/scanner/         # C 源码宏定义与 max_chars 边界注释静态扫描器
│   └── test/                # CLI 编译器单元测试网
├── client/                  # 前端 Web 应用 (React 19 + HeroUI + TanStack + Zustand)
│   ├── src/components/      # 核心 UI 模块
│   │   ├── cat/             # 3-Pane 沉浸式 CAT 工作台、真机点阵拟真视窗
│   │   ├── grid/            # 万级词条虚拟化大网格、单元格原子编辑
│   │   ├── audit/           # Git 风格红绿 Diff 抽屉、时光机操作栏
│   │   ├── common/          # GlossaModalV2 具备后悔药安全模态窗
│   │   └── layout/          # AppLayout 现代化响应式侧栏与顶栏
│   ├── src/pages/           # 6 大业务路由页面
│   │   ├── TermsMatrixPage.tsx      # 多语言词条矩阵大盘 (HeroUI 风格)
│   │   ├── CatStudioPage.tsx        # CAT 纯键盘译员工作台
│   │   ├── VersionDiffPage.tsx      # 固件 3D 版本对比差分引擎
│   │   ├── AuditTrailPage.tsx       # 不可变变更审计流水与时光机
│   │   ├── GlossaryTmPage.tsx       # 官方术语库与 pgvector 向量记忆库
│   │   └── ProjectsVersionsPage.tsx # 硬件产品线与固件版本生命周期
│   ├── src/stores/          # Zustand 状态切片 (cat-studio, user-preferences)
│   └── src/styles/          # Design Tokens (design-tokens.css) & Tailwind v4
├── server/                  # Fastify 5.x 高性能后端 (微单体领域分层整洁架构)
│   ├── src/app.ts           # Fastify 实例、RFC 7807 统一异常与优雅停机
│   ├── src/common/          # Drizzle ORM Schema、环境配置与错误处理
│   ├── src/modules/         # 领域核心模块 (terms, diff, audit, ai, export)
│   └── scripts/             # M1 ~ M5 全量里程碑自动化验收验证测试套件
├── design/                  # 产品设计与敏捷研发工单全景库
│   ├── tickets/             # TASK-101 ~ TASK-1402 全量 44 份工单规格说明书
│   ├── TICKETS.md           # 8 大冲刺敏捷看板与工单索引汇总
│   ├── design.md            # HeroUI 前端设计规范与设计令牌
│   ├── PRODUCT_REQUIREMENTS_DOCUMENT.md # 官方产品需求规格说明书 (PRD v2.0)
│   └── TECHNICAL_SPECIFICATION.md       # 系统技术架构与实施规格书 (Tech Spec v2.0)
└── package.json             # 项目根配置与验证脚本
```

---

## 🚀 敏捷冲刺与研发工单规划 (8 大 Sprints)

项目整体划分为 14 大 Epic、44 个细粒度任务，遵循 Tracer-bullet 垂直切片架构：

| 冲刺阶段 (Sprint) | 覆盖工单区间 | 交付重点 | 状态 |
| :--- | :--- | :--- | :---: |
| **Sprint 1 (M1)** | `TASK-101` ~ `TASK-104` | PostgreSQL 16 + pgvector 底座、Drizzle 7 大表、向后兼容视图 `view_terms_legacy` | **[100% DONE]** |
| **Sprint 2 (M2)** | `TASK-201` ~ `TASK-404` | Fastify 整洁脚手架、TermService、变更审计、不可变快照时光机、3D Diff、ExcelJS | **[100% DONE]** |
| **Sprint 3 (M3)** | `TASK-501` ~ `TASK-504` | 多模型直连 AI 网关 (DeepSeek/Claude/GPT)、pgvector TM 毫秒直通、微批调度、L10n QA | **[100% DONE]** |
| **Sprint 4 (M4)** | `TASK-601` ~ `TASK-704` | HeroUI 前端大网格、Zustand 状态流、3-Pane CAT 键盘流、C606 点阵拟真视窗、Diff 抽屉 | **[100% DONE]** |
| **Sprint 5 (M5)** | `TASK-801` ~ `TASK-902` | `glossa-cli` 宏扫描、嵌入式 C 头文件编译、75+ 存量 Golden Master 回归、灰度切流预案 | **[100% DONE]** |
| **Sprint 6 (M6)** | `TASK-1001` ~ `TASK-1004` | 前端 TanStack Query 全量对接 Fastify API、单元格防抖乐观更新、拖拽导入 Excel、偏好持久化 | **[TODO]** |
| **Sprint 7 (M7)** | `TASK-1101` ~ `TASK-1202` | 硬件实拍截图 SVG 热区标注映射、点阵字宽像素级估算、企业内网轻量身份鉴权、AI 频次防刷 | **[TODO]** |
| **Sprint 8 (M8)** | `TASK-1301` ~ `TASK-1402` | 生产级 Dockerfile 多阶段构建、GitHub Actions CI/CD 流水线、Nginx 反代、Playwright E2E | **[TODO]** |

> 完整工单明细与执行协议请查阅：[`design/TICKETS.md`](./design/TICKETS.md) 与 [`design/tickets/`](./design/tickets/)。

---

## 🛠️ 快速启动与验证指南

### 1. 安装与环境依赖
- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker**（用于本地运行 PostgreSQL 16 + pgvector 真实容器）

```bash
# 安装全量依赖
npm install
```

### 2. 运行工业级自动化验证测试网 (Milestones 1 ~ 5)
```bash
# 自动化执行 M1 ~ M5 核心验证套件 (100% 绿色达标)
npm test

# 单独运行指定里程碑验证：
npm run verify:m1   # 数据库 Drizzle 建模与存量无损兼容视图
npm run verify:m2   # 核心业务服务、3D Diff 与时光机后悔药双向回退事务
npm run verify:m3   # 多供应商直连 AI 网关、TM 向量直通与 L10n QA
npm run verify:m4   # 前端虚拟大网格渲染、HeroUI Pro CAT 全键盘心流
npm run verify:m5   # glossa-cli C 宏扫描、嵌入式 C 头文件编译 (Clang 0 Warning) 与灰度回滚
```

### 3. 本地启动开发预览
```bash
# 启动前端 Vite 开发服务器 (支持 HMR 热更新与深浅主题即时切换)
npm run dev

# 访问地址：http://localhost:5173
```

### 4. 生产包打包与静态类型检查
```bash
# 验证前端静态编译
npm run build:client

# 静态类型检查
npx tsc --noEmit
```

### 5. CLI 工具链常用命令 (`glossa-cli`)
```bash
# 静态扫描 C 语言代码宏定义并向平台同步
npx glossa push --dir=./firmware/src --project=proj-c606 --version=v2.0.0

# 编译生成固件嵌入式 C 头文件与二维查表 (strings_lang.h / strings_lang.c)
npx glossa pull --format=c-header --out=./firmware/generated

# 编译生成 Android strings.xml 与 iOS Localizable.strings
npx glossa pull --format=android-xml --out=./android/res
npx glossa pull --format=ios-strings --out=./ios/Localizable
```

---

## 📄 授权与归属
青岛迈金智能科技股份有限公司 (Magene Technology) 内部专用，保留所有权利。
