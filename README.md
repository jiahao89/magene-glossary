# GlossaHub v2.0 (迈金多语言词条翻译协同平台)

> **面向智能 GPS 骑行码表、室内骑行台、心率传感器与移动端 App 的下一代企业级词条翻译与本地化资产管理平台 (TMS)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2Bpgvector-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 🌟 核心业务板块与系统架构

根据 handoff 需求，系统彻底摒弃了冗余未曾发挥实质效用的多级审核状态机与五级 RBAC 拦截，全力聚焦于**词条多语言资产治理、高精度版本对比 Diff 引擎与字段级变更审计时光机**：

1. **词条多语言矩阵大盘 (Terms & Matrix)**：
   - 核心管理主界面，支持大数据量词条流畅浏览；
   - 单元格即时内联编辑，1.5 秒防抖自动落库，粘性固定 KW 宏名与中文基准列；
   - 物理屏幕字长约束预警（超长红色标警与字数差提示）；
   - 多维快速检索与过滤（按 KW、中文原义、模块、状态、多语种动态切换）；
   - 批量操作工具：批量 AI 翻译、批量锁定/解锁、新增词条、导入导出（原生 Excel / CSV / 固件 C 语言头文件）。
2. **沉浸式 CAT 译员工作台 (Translator Studio)**：
   - 专业三栏高密度工作台，专为国际化译员与本地化专家打造；
   - 左栏待办导航（支持未翻译快速筛选）、中栏中文基准与译文编辑、实时字符刻度计；
   - 右栏统一翻译资产 Dock：术语库 (Glossary) 规则提示、TM 记忆库相似句推荐（`Alt+1` 采纳）、直连 AI 多模型建议（`Alt+2` 采纳）、最近修改记录；
   - 全键盘高产流：`Ctrl+Enter` 快速保存并跳转下一条，`Alt+H` 唤起历史抽屉。
3. **版本对比 Diff 引擎 (Version Diff Engine)**：
   - 核心生命线！支持跨固件/应用版本深度对比（如 v2.0 vs v1.9）；
   - 智能假差异清洗管道（`FalseDiffNormalizer`），自动清洗全半角标点、引号、零宽空格与首尾空格；
   - ADD 新增（绿）、DEL 删除（红删除线）、MOD 修改（黄，Git 风格红绿前后对比）；
   - 单语种快速下钻（如仅看德语变动）；一键选择性增量合并 (Apply Diff)；差异 Excel 报告导出。
4. **全维度细粒度变更审计与时光机 (Audit Trail & Time Machine)**：
   - 核心生命线！不可篡改的变更审计流水日志（东八区 CST 时间、操作人、词条 KW、前后变化双列 Diff）；
   - 不可变历史快照库；具备**“后悔药”机制的一键时光机撤销回滚**（回退前系统自动为当前状态生成安全备份快照，彻底杜绝误操作）。
5. **官方术语库 (Glossary) 与向量记忆库 (TM)**：
   - 统一术语规范管理（标准译法对照表、严苛禁用词/黑名单警告）；
   - pgvector 毫秒级（<20ms）记忆库检索，100% 精确匹配 0 成本直通。
6. **产品线与固件版本生命周期 (Projects & Versions)**：
   - 隔离各产品形态（C606、C706、T300 骑行台、OnelapFit App）；
   - 版本生命周期流转：活跃编辑中（EDITING）与封板加锁（SEALED 只读发布镜像）。
3. **多模型直连 AI 网关与 QA 质检闭环**：
   - DeepSeek-V3 ➔ Claude 3.5 Sonnet ➔ GPT-4o-mini ➔ 本地 Ollama 自动熔断降级阶梯；
   - 毫秒级 TM 向量记忆库与 Levenshtein 编辑距离混合检索；
   - 微批聚合调度（Micro-Batching）与并发控制池；
   - 硬件边界字符溢出检测、占位符完整性校验与 2 轮自纠错 QA。
4. **HeroUI 前端大网格与沉浸式 CAT 工作台**：
   - 万级词条零卡顿虚拟网格（TanStack Virtual），首屏渲染 < 100ms；
   - 独立单元格原子隔离，打字零重绘，1.5s 防抖自动提交；
   - 3-Pane 沉浸式翻译工作台与 `J`/`K`/`Ctrl+Enter`/`Alt+1/2` 全键盘流；
   - 迈金 C606 2.4 英寸点阵 LCD / OLED 真机拟真视窗与实机截图热区映射。
5. **研发工程闭环与向后兼容保障**：
   - `glossa push`：静态扫描 C 源码 `KW` 宏定义与 `[max_chars]` 注释；
   - `glossa pull --format=c-header`：编译生成嵌入式 C 头文件与二维常量查表（严苛 Clang `-Wall -Wextra -Werror` 0 警告）；
   - Android XML 与 iOS Strings 资产输出；
   - 挂载 `view_terms_legacy` 视图与 75+ 存量 Golden Master 契约测试，保证存量系统平滑过渡。

---

## 📁 目录结构

```text
├── cli/                 # Glossa CLI 研发工具链 (宏静态扫描、C/Android/iOS 资产编译)
│   ├── bin/glossa.ts    # 命令行入口 (glossa push / glossa pull)
│   ├── src/             # 代码扫描与编译生成器核心
│   └── test/            # CLI 单元与编译测试
├── client/              # React 19 + HeroUI 前端应用
│   ├── src/components/  # 虚拟网格、CAT 3-Pane、C606 点阵拟真视窗、Diff 抽屉
│   ├── src/stores/      # Zustand 状态切片 (cat-studio, grid-selection)
│   ├── src/hooks/       # TanStack Query 异步数据流
│   └── src/styles/      # Tailwind v4 + OKLCH Design Tokens 样式引擎
├── server/              # Fastify 5.x 高性能整洁架构后端
│   ├── src/app.ts       # Fastify 服务实例与 RFC 7807 异常拦截
│   ├── src/common/      # Drizzle ORM Schema 建模与全局配置
│   ├── src/modules/     # 词条管理、审计时光机、3D 差分、AI 直连网关
│   └── scripts/         # M1 ~ M5 全量里程碑自动化验收验证套件
├── design/              # 需求文档、设计规范、工单全集与视觉原型
└── docker-compose.yml   # PostgreSQL 16 + pgvector 本地开发环境容器
```

---

## 🚀 快速上手

### 1. 环境要求
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker (可选，用于本地真实 PostgreSQL 16 + pgvector)

### 2. 安装依赖
```bash
npm install
```

### 3. 运行全量验证测试网 (Milestones 1~5)
```bash
npm test
# 依次运行:
# - verify:m1 (数据底座与无损兼容)
# - verify:m2 (核心服务与时光机双引擎)
# - verify:m3 (直连 AI 网关与 QA 质检)
# - verify:m4 (HeroUI 前端大网格与 CAT 工作台)
# - verify:m5 (研发工具链与灰度割接演练)
```

### 4. 启动开发预览服务器
```bash
npm run dev
```

### 5. CLI 工具链使用
```bash
# 静态扫描 C 语言宏定义并推送词条
npx glossa push --dir=./firmware/src --project=proj-c606 --version=v2.0.0

# 编译导出嵌入式 C 头文件与查表常量
npx glossa pull --format=c-header --out=./firmware/generated

# 编译导出 Android / iOS 移动端多语言资源
npx glossa pull --format=android-xml --out=./android/res
npx glossa pull --format=ios-strings --out=./ios/Localizable
```

---

## 📄 授权与归属
迈金科技 (Magene) 内部专用，保留所有权利。
