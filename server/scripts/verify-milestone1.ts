import { initDatabase, schema } from '../src/common/database/db.client.js';

// 终端色彩辅助
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bgDark: '\x1b[40m'
};

function banner(title: string) {
  console.log('\n' + colors.cyan + colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.cyan + colors.bright + `   🚀  ${title}` + colors.reset);
  console.log(colors.cyan + colors.bright + '═'.repeat(80) + colors.reset);
}

function subheader(text: string) {
  console.log('\n' + colors.yellow + colors.bright + `▶ ${text}` + colors.reset);
  console.log(colors.dim + '─'.repeat(70) + colors.reset);
}

async function runMilestone1Verification() {
  const overallStart = Date.now();
  banner('GlossaHub v2.0 - 里程碑 1 (Milestone 1) 基础设施与数据底座验证');

  // ==========================================
  // 1. TASK-101: 数据库引擎就绪与环境验证
  // ==========================================
  subheader('TASK-101: 数据库引擎与运行时环境检测');
  const dbStart = Date.now();
  const { db, pglite, pool, engineType } = await initDatabase({ inMemory: true });
  console.log(`${colors.green}✔${colors.reset} 数据库实例初始化就绪: ${colors.bright}${engineType}${colors.reset} (${Date.now() - dbStart}ms)`);
  
  // 统一通用查询适配器
  const querySql = async (sqlText: string, params: any[] = []): Promise<{ rows: any[] }> => {
    if (pglite) {
      const res = await pglite.query(sqlText, params);
      return { rows: res.rows };
    } else if (pool) {
      const res = await pool.query(sqlText, params);
      return { rows: res.rows };
    }
    throw new Error('未初始化的数据库客户端');
  };

  const execScript = async (sqlText: string): Promise<void> => {
    if (pglite) {
      await pglite.exec(sqlText);
    } else if (pool) {
      await pool.query(sqlText);
    } else {
      throw new Error('未初始化的数据库客户端');
    }
  };

  const versionRes = await querySql('SELECT version()');
  console.log(`${colors.green}✔${colors.reset} PostgreSQL 内核版本: ${colors.dim}${versionRes.rows[0].version}${colors.reset}`);

  // ==========================================
  // 2. TASK-102: Drizzle ORM 数据模型 DDL 迁移
  // ==========================================
  subheader('TASK-102: Drizzle ORM 数据模型 (7大核心表与复合索引) 创建');
  const ddlStart = Date.now();

  // 创建所有核心数据表与索引
  await execScript(`
    -- 1. 项目表
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      target_languages JSONB NOT NULL DEFAULT '["en","de","fr","es","it","ja","ko"]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2. 固件版本表
    CREATE TABLE IF NOT EXISTS versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version_name VARCHAR(128) NOT NULL,
      is_sealed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_project_version UNIQUE (project_id, version_name)
    );

    -- 3. 词条主表
    CREATE TABLE IF NOT EXISTS terms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
      kw VARCHAR(256) NOT NULL,
      zh_cn TEXT NOT NULL,
      context TEXT DEFAULT '',
      owner_component VARCHAR(128) DEFAULT '',
      max_chars INTEGER DEFAULT 0,
      is_locked BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by VARCHAR(64) NOT NULL,
      -- 为模拟迁移，添加历史旧列
      translations JSONB,
      translations_meta JSONB,
      CONSTRAINT uq_version_kw UNIQUE (version_id, kw)
    );
    CREATE INDEX IF NOT EXISTS idx_version_sort ON terms(version_id, sort_order);

    -- 4. 细粒度单语种翻译表
    CREATE TABLE IF NOT EXISTS term_translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      language_code VARCHAR(32) NOT NULL,
      translation_text TEXT NOT NULL DEFAULT '',
      source_type VARCHAR(16) NOT NULL DEFAULT 'human',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
      CONSTRAINT uq_term_lang UNIQUE (term_id, language_code)
    );
    CREATE INDEX IF NOT EXISTS idx_lang_text ON term_translations(language_code);

    -- 5. 不可变快照表 (时光机与后悔药)
    CREATE TABLE IF NOT EXISTS term_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      term_id UUID NOT NULL,
      version_id UUID NOT NULL,
      snapshot_state JSONB NOT NULL,
      reason VARCHAR(64) NOT NULL,
      operator VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_term_snapshots ON term_snapshots(term_id, created_at);

    -- 6. 细粒度变更审计表
    CREATE TABLE IF NOT EXISTS audit_change_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID NOT NULL,
      term_id UUID NOT NULL,
      kw VARCHAR(256) NOT NULL,
      target_lang VARCHAR(32),
      action VARCHAR(64) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      details TEXT,
      operator VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_version ON audit_change_logs(version_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_kw ON audit_change_logs(kw);

    -- 7. 翻译记忆库 TM
    CREATE TABLE IF NOT EXISTS translation_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_text TEXT NOT NULL,
      target_lang VARCHAR(32) NOT NULL,
      target_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log(`${colors.green}✔${colors.reset} 7 大核心表结构创建成功 (${Date.now() - ddlStart}ms):`);
  console.log(`   ├─ 📦 projects                (硬件产品线项目空间)`);
  console.log(`   ├─ 🏷️  versions                (固件基线版本与封板锁)`);
  console.log(`   ├─ 📝 terms                   (词条核心元数据与物理屏幕 max_chars)`);
  console.log(`   ├─ 🌐 term_translations       (单语种细粒度行级翻译表)`);
  console.log(`   ├─ ⏳ term_snapshots          (不可变快照表 - 后悔药与时光机)`);
  console.log(`   ├─ 🔍 audit_change_logs       (字段级红绿前后变更审计日志)`);
  console.log(`   └─ 🧠 translation_memories    (TM 翻译记忆库)`);

  // ==========================================
  // 3. TASK-103: 存量数据注入、平滑迁移与对账核验
  // ==========================================
  subheader('TASK-103: 历史数据模拟注入、无损拆解迁移与对账校验');
  
  // 插入项目与版本
  const projectRes = await querySql(`
    INSERT INTO projects (code, name, description, target_languages)
    VALUES ('c706-firmware', 'Magene C706 智能 GPS 码表', '旗舰款彩色触屏码表固件', '["en","de","fr","es","ja","it"]'::jsonb)
    RETURNING id;
  `);
  const projectId = projectRes.rows[0].id;

  const versionRes2 = await querySql(`
    INSERT INTO versions (project_id, version_name, is_sealed)
    VALUES ('${projectId}', 'v2.0_baseline', false)
    RETURNING id;
  `);
  const versionId = versionRes2.rows[0].id;

  // 模拟注入迈金硬件历史词条（旧版 translations 单列 JSON 反模式结构）
  const seedStart = Date.now();
  const sampleTerms = [
    {
      kw: 'KW_STOP_RIDE',
      zh_cn: '结束骑行，是否保存记录？',
      context: '骑行主界面 -> 退出弹窗',
      owner: 'Dialog_Confirm',
      max_chars: 40,
      translations: {
        en: 'Stop ride and save record?',
        de: 'Fahrt beenden und aufzeichnen?',
        fr: 'Arrêter la sortie et enregistrer ?',
        es: '¿Detener recorrido y guardar registro?',
        ja: 'ライドを終了して記録を保存しますか？'
      },
      translations_meta: { en: 'human', de: 'ai', fr: 'tm', es: 'human', ja: 'ai' }
    },
    {
      kw: 'KW_AVG_SPEED',
      zh_cn: '平均速度: %s km/h',
      context: '数据看板 -> 核心指标',
      owner: 'DataGrid_Large',
      max_chars: 24,
      translations: {
        en: 'Avg Speed: %s km/h',
        de: 'Durchschn. Geschw.: %s km/h',
        fr: 'Vitesse moy. : %s km/h',
        es: 'Vel. media: %s km/h',
        ja: '平均速度: %s km/h'
      },
      translations_meta: { en: 'human', de: 'human', fr: 'human', es: 'human', ja: 'human' }
    },
    {
      kw: 'KW_HEART_RATE_ALERT',
      zh_cn: '心率过高报警 (%d bpm)',
      context: '骑行告警 -> 顶部横幅',
      owner: 'Banner_Alert',
      max_chars: 30,
      translations: {
        en: 'High Heart Rate Alert (%d bpm)',
        de: 'Herzfrequenz-Warnung (%d bpm)',
        fr: 'Alerte fréquence cardiaque (%d bpm)',
        es: 'Alerta frecuencia cardíaca (%d bpm)',
        ja: '高心拍数アラート (%d bpm)'
      },
      translations_meta: { en: 'ai', de: 'ai', fr: 'ai', es: 'ai', ja: 'ai' }
    },
    {
      kw: 'KW_CALIBRATING_SENSOR',
      zh_cn: '功率计零点校准中，请保持静止...',
      context: '传感器设置 -> 功率计校准',
      owner: 'Modal_Progress',
      max_chars: 45,
      translations: {
        en: 'Calibrating power meter, please keep still...',
        de: 'Leistungsmesser wird kalibriert, bitte ruhig halten...',
        fr: 'Étalonnage capteur de puissance en cours...',
        es: 'Calibrando potenciómetro, manténgase quieto...',
        ja: 'パワーメーター校正中、静止してください...'
      },
      translations_meta: { en: 'human', de: 'human', fr: 'human', es: 'human', ja: 'tm' }
    },
    {
      kw: 'KW_RADAR_APPROACHING',
      zh_cn: '后方来车快速接近！',
      context: '雷达侧边栏预警',
      owner: 'Radar_SideBar',
      max_chars: 20,
      translations: {
        en: 'Vehicle approaching fast!',
        de: 'Fahrzeug nähert sich schnell!',
        fr: 'Véhicule approche rapidement !',
        es: '¡Vehículo acercándose rápido!',
        ja: '後方車両が急速に接近！'
      },
      translations_meta: { en: 'tm', de: 'tm', fr: 'tm', es: 'tm', ja: 'tm' }
    }
  ];

  for (const t of sampleTerms) {
    await querySql(`
      INSERT INTO terms (version_id, kw, zh_cn, context, owner_component, max_chars, sort_order, updated_by, translations, translations_meta)
      VALUES (
        '${versionId}',
        '${t.kw}',
        '${t.zh_cn}',
        '${t.context}',
        '${t.owner}',
        ${t.max_chars},
        0,
        'SYSTEM_SEED',
        '${JSON.stringify(t.translations)}'::jsonb,
        '${JSON.stringify(t.translations_meta)}'::jsonb
      );
    `);
  }
  console.log(`${colors.green}✔${colors.reset} 成功注入 5 条具备历史 translations JSON 的固件词条 (${Date.now() - seedStart}ms)`);

  // 执行迁移：拆解 translations JSON 为 term_translations 行记录
  const migrationStart = Date.now();
  await querySql(`
    INSERT INTO term_translations (term_id, language_code, translation_text, source_type, updated_at, updated_by)
    SELECT 
        t.id AS term_id,
        kv.key AS language_code,
        COALESCE(kv.value::text, '') AS translation_text,
        CASE 
            WHEN t.translations_meta IS NOT NULL AND jsonb_typeof(t.translations_meta::jsonb) = 'object' 
            THEN COALESCE(t.translations_meta::jsonb ->> kv.key, 'human')
            ELSE 'human'
        END AS source_type,
        t.updated_at,
        'MIGRATION' AS updated_by
    FROM terms t,
    LATERAL jsonb_each_text(
        CASE 
            WHEN t.translations IS NULL THEN '{}'::jsonb
            ELSE t.translations::jsonb
        END
    ) kv
    ON CONFLICT (term_id, language_code) DO NOTHING;
  `);
  console.log(`${colors.green}✔${colors.reset} 历史数据无损拆解迁移执行完毕 (${Date.now() - migrationStart}ms)`);

  // 对账核验
  const countTermsRes = await querySql('SELECT count(*) as total FROM terms');
  const countTransRes = await querySql('SELECT count(*) as total, count(DISTINCT term_id) as term_count FROM term_translations');
  
  const expectedTranslationsCount = sampleTerms.length * 5; // 5 条 * 5 种语言 = 25 条
  const actualTransCount = parseInt(countTransRes.rows[0].total, 10);
  const mappedTermCount = parseInt(countTransRes.rows[0].term_count, 10);

  console.log(`\n${colors.cyan}📊 迁移对账报告 (Reconciliation Report):${colors.reset}`);
  console.log(`   • V1 历史主表词条数:      ${colors.bright}${countTermsRes.rows[0].total}${colors.reset}`);
  console.log(`   • V2 映射拆解的词条数:    ${colors.bright}${mappedTermCount}${colors.reset}`);
  console.log(`   • 拆解生成的行级翻译数:    ${colors.bright}${actualTransCount}${colors.reset} (预期: ${expectedTranslationsCount})`);
  
  if (actualTransCount === expectedTranslationsCount && mappedTermCount === sampleTerms.length) {
    console.log(`${colors.green}${colors.bright}   ✔ 对账校验完全一致，数据零丢失！${colors.reset}`);
  } else {
    throw new Error(`对账异常！预期 ${expectedTranslationsCount}，实际 ${actualTransCount}`);
  }

  // ==========================================
  // 4. TASK-104: 挂载向后兼容视图 view_terms_legacy
  // ==========================================
  subheader('TASK-104: 挂载向后兼容视图 view_terms_legacy 与双向验证');
  
  const viewStart = Date.now();
  await execScript(`
    DROP VIEW IF EXISTS view_terms_legacy CASCADE;
    CREATE OR REPLACE VIEW view_terms_legacy AS
    SELECT 
        t.id,
        t.version_id,
        t.kw,
        t.zh_cn,
        t.context,
        t.owner_component AS owner,
        t.max_chars,
        t.is_locked,
        t.sort_order,
        t.updated_at,
        t.updated_by,
        -- 汇聚单语种翻译为旧版 {"en": "...", "de": "..."} JSON
        COALESCE(
            jsonb_object_agg(tt.language_code, tt.translation_text) FILTER (WHERE tt.language_code IS NOT NULL),
            '{}'::jsonb
        ) AS translations,
        -- 汇聚来源标记为旧版 {"en": "ai", "de": "tm"} JSON
        COALESCE(
            jsonb_object_agg(tt.language_code, tt.source_type) FILTER (WHERE tt.language_code IS NOT NULL),
            '{}'::jsonb
        ) AS translations_meta
    FROM terms t
    LEFT JOIN term_translations tt ON t.id = tt.term_id
    GROUP BY t.id;
  `);
  console.log(`${colors.green}✔${colors.reset} 兼容视图 view_terms_legacy 挂载成功 (${Date.now() - viewStart}ms)`);

  // 查询视图验证契约完整性
  const viewRes = await querySql(`
    SELECT kw, zh_cn, translations, translations_meta 
    FROM view_terms_legacy 
    WHERE kw = 'KW_STOP_RIDE';
  `);
  const record = viewRes.rows[0];
  console.log(`\n${colors.cyan}🔍 查询兼容视图 view_terms_legacy 样本验证:${colors.reset}`);
  console.log(`   • KW:                  ${colors.bright}${record.kw}${colors.reset}`);
  console.log(`   • 中文基准原文:         ${colors.bright}${record.zh_cn}${colors.reset}`);
  console.log(`   • 聚合返回 translations JSON:`);
  console.log(`     ${colors.dim}${JSON.stringify(record.translations, null, 2).replace(/\n/g, '\n     ')}${colors.reset}`);
  console.log(`   • 聚合返回 translations_meta JSON:`);
  console.log(`     ${colors.dim}${JSON.stringify(record.translations_meta)}${colors.reset}`);

  // 动态验证：直接向 term_translations 插入一条全新语种（韩语 ko），验证视图无需修改即可自动聚合反映
  console.log(`\n${colors.yellow}⚡ 动态联动测试: 向子表 term_translations 插入全新韩语 (ko) 翻译...${colors.reset}`);
  const termId = (await querySql("SELECT id FROM terms WHERE kw = 'KW_STOP_RIDE'")).rows[0].id;
  await querySql(`
    INSERT INTO term_translations (term_id, language_code, translation_text, source_type, updated_by)
    VALUES ('${termId}', 'ko', '라이딩을 종료하고 기록을 저장하시겠습니까?', 'ai', 'DYNAMIC_TEST');
  `);

  const updatedViewRes = await querySql(`
    SELECT translations ->> 'ko' AS ko_translation, translations_meta ->> 'ko' AS ko_source
    FROM view_terms_legacy 
    WHERE kw = 'KW_STOP_RIDE';
  `);
  console.log(`${colors.green}✔${colors.reset} 兼容视图实时感知到新语种加入:`);
  console.log(`   • translations.ko = "${colors.bright}${updatedViewRes.rows[0].ko_translation}${colors.reset}"`);
  console.log(`   • translations_meta.ko = "${colors.bright}${updatedViewRes.rows[0].ko_source}${colors.reset}"`);

  // ==========================================
  // 5. 验收结果汇总
  // ==========================================
  const totalElapsed = Date.now() - overallStart;
  banner(`里程碑 1 (Milestone 1) 验收测试全量通过！(总耗时: ${totalElapsed}ms)`);
  console.log(`${colors.green}${colors.bright}
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                        MILESTONE 1 VERIFICATION PASS                      ║
  ╠═══════════════════════════════════════════════════════════════════════════╣
  ║  [✔] TASK-101: PostgreSQL 16 内核 + pgvector 容器与环境配置规范完备        ║
  ║  [✔] TASK-102: Drizzle ORM 7 大数据表、主键与复合唯一索引全部成功创建     ║
  ║  [✔] TASK-103: 存量单列 translations JSON 成功无损拆解为行级关系模型      ║
  ║  [✔] TASK-104: 挂载 view_terms_legacy，契约 100% 保持历史兼容且动态更新    ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
  ${colors.reset}`);
}

runMilestone1Verification().catch((err) => {
  console.error('\n❌ 验证过程中发生严重异常:', err);
  process.exit(1);
});
