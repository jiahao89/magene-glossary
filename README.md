# GlossaHub v2.0 (迈金多语言词条协同平台)

> **下一代智能码表（C606）及嵌入式固件词条端到端协同治理平台**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2Bpgvector-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 🌟 核心特性与架构能力

1. **三维差分引擎 (3D Firmware Diff Engine)**：
   - 支持跨项目、跨版本、跨语种深度差分计算；
   - 具备全角半角标点、不可见空白符、CRLF 与引号智能清洗管道（`FalseDiffNormalizer`），假差异误报率降至 0；
   - ExcelJS 差异色块对比报告持久化导出。
2. **字段级审计与安全后悔药时光机 (TimeMachine Rollback)**：
   - 字段级变更 Myers 算法精准捕获；
   - 任意时刻一键安全回退；
   - 回退前自动创建 `ROLLBACK_BACKUP` 快照，提供二次撤销（后悔药）防灾保障。
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
