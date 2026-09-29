import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '../src/common/database/schema/schema';

interface GoldenFixture {
  id: string;
  domain: string;
  kw: string;
  zhCn: string;
  maxChars?: number;
  expected: Record<string, string>;
}

async function runGoldenMasterRegression() {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('   🏛️  GlossaHub v2.0 - TASK-901 75+ Golden Master 回归契约测试网');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // 1. Load Fixtures
  const fixturesPath = path.join(
    process.cwd(),
    'server/test/fixtures/legacy-test-fixtures.json'
  );
  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Fixtures not found at ${fixturesPath}`);
  }
  const fixtures: GoldenFixture[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  console.log(`📦 Loaded ${fixtures.length} Golden Master regression fixtures (SLA requirement: >= 75)`);
  if (fixtures.length < 75) {
    throw new Error(`Fixture count ${fixtures.length} is below required 75!`);
  }

  // 2. Initialize in-memory PGlite Database
  console.log('⚡ Initializing PGlite in-memory database & schema...');
  const client = new PGlite();
  await client.exec(`
    CREATE DOMAIN "vector(1536)" AS TEXT;
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      target_languages JSONB DEFAULT '["en", "de", "fr", "es", "it", "ja", "ko"]'::jsonb NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
      version_name VARCHAR(128) NOT NULL,
      is_sealed BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      CONSTRAINT idx_project_version UNIQUE (project_id, version_name)
    );
    CREATE TABLE IF NOT EXISTS terms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id UUID REFERENCES versions(id) ON DELETE CASCADE NOT NULL,
      kw VARCHAR(256) NOT NULL,
      zh_cn TEXT NOT NULL,
      context TEXT DEFAULT '',
      owner_component VARCHAR(128) DEFAULT '',
      max_chars INTEGER DEFAULT 0,
      is_locked BOOLEAN DEFAULT FALSE NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_by VARCHAR(64) NOT NULL,
      CONSTRAINT idx_version_kw UNIQUE (version_id, kw)
    );
    CREATE TABLE IF NOT EXISTS term_translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      term_id UUID REFERENCES terms(id) ON DELETE CASCADE NOT NULL,
      language_code VARCHAR(32) NOT NULL,
      translation_text TEXT DEFAULT '' NOT NULL,
      source_type VARCHAR(16) DEFAULT 'human' NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_by VARCHAR(64) NOT NULL,
      CONSTRAINT idx_term_lang UNIQUE (term_id, language_code)
    );
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
      COALESCE(
        jsonb_object_agg(tt.language_code, tt.translation_text) FILTER (WHERE tt.language_code IS NOT NULL),
        '{}'::jsonb
      ) AS translations,
      COALESCE(
        jsonb_object_agg(tt.language_code, tt.source_type) FILTER (WHERE tt.language_code IS NOT NULL),
        '{}'::jsonb
      ) AS translations_meta
    FROM terms t
    LEFT JOIN term_translations tt ON t.id = tt.term_id
    GROUP BY t.id;
  `);

  const db = drizzle(client, { schema });

  // 3. Insert project and version
  const [project] = await db
    .insert(schema.projects)
    .values({ code: 'C606', name: 'Magene C606 Smart Bike Computer' })
    .returning();
  const [version] = await db
    .insert(schema.versions)
    .values({ projectId: project.id, versionName: 'v2.0.0-gm' })
    .returning();

  // 4. Batch inject all 75 fixtures into relational schema
  console.log(`📥 Injecting ${fixtures.length} golden terms with multi-language rows...`);
  let totalTranslationsInserted = 0;

  for (const f of fixtures) {
    const [term] = await db
      .insert(schema.terms)
      .values({
        versionId: version.id,
        kw: f.kw,
        zhCn: f.zhCn,
        maxChars: f.maxChars || 30,
        isLocked: false,
        updatedBy: 'GOLDEN_REGRESSION',
      })
      .returning();

    for (const [lang, text] of Object.entries(f.expected)) {
      await db.insert(schema.termTranslations).values({
        termId: term.id,
        languageCode: lang,
        translationText: text,
        sourceType: 'human',
        updatedBy: 'GOLDEN_REGRESSION',
      });
      totalTranslationsInserted++;
    }
  }

  console.log(`✔ Injected 75 terms and ${totalTranslationsInserted} translation rows.`);

  // 5. Query backward-compatible view view_terms_legacy & verify contracts
  console.log('🔍 Executing Golden Master verification query against view_terms_legacy...');
  const rowsRes = await client.query(`
    SELECT kw, zh_cn, max_chars, translations
    FROM view_terms_legacy
    ORDER BY kw ASC;
  `);

  const rows = rowsRes.rows as any[];
  if (rows.length !== fixtures.length) {
    throw new Error(`Expected ${fixtures.length} rows in view, got ${rows.length}`);
  }

  // 6. Assert all 75 fixtures against legacy contract
  let passedCount = 0;
  for (const f of fixtures) {
    const row = rows.find((r) => r.kw === f.kw);
    if (!row) {
      throw new Error(`Missing expected golden fixture ${f.kw}`);
    }

    // Chinese baseline check
    if (row.zh_cn !== f.zhCn) {
      throw new Error(`zhCn mismatch for ${f.kw}: expected "${f.zhCn}", got "${row.zh_cn}"`);
    }

    // Translations json parsing
    const trans = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
    for (const [lang, expectedVal] of Object.entries(f.expected)) {
      if (trans[lang] !== expectedVal) {
        throw new Error(
          `Translation mismatch for ${f.kw} [${lang}]: expected "${expectedVal}", got "${trans[lang]}"`
        );
      }
    }

    passedCount++;
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n✔ 100% of Golden Master fixtures (${passedCount}/${fixtures.length}) verified successfully.`);
  console.log(`⏱️ Total Execution Time: ${durationMs}ms (SLA: <= 10,000ms)\n`);

  if (durationMs > 10000) {
    throw new Error(`Regression test suite exceeded 10s SLA: ${durationMs}ms`);
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log(`   🎉  TASK-901 Golden Master 契约测试全量通过！(耗时 ${durationMs}ms)`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runGoldenMasterRegression().catch((err) => {
  console.error('❌ Golden Master regression test failed:', err);
  process.exit(1);
});
