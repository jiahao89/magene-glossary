import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from './schema/schema.js';
import * as path from 'path';
import * as fs from 'fs';

let dbInstance: any = null;
let pgliteInstance: PGlite | null = null;
let pgPoolInstance: Pool | null = null;

const CORE_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    target_languages JSONB NOT NULL DEFAULT '["en","de","fr","es","it","ja","ko"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_name VARCHAR(128) NOT NULL,
    is_sealed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_version UNIQUE (project_id, version_name)
  );

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
    updated_by VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    translations JSONB,
    translations_meta JSONB,
    CONSTRAINT uq_version_kw UNIQUE (version_id, kw)
  );
  CREATE INDEX IF NOT EXISTS idx_version_sort ON terms(version_id, sort_order);

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

  CREATE OR REPLACE FUNCTION prevent_term_snapshots_mutation() RETURNS trigger AS $$
  BEGIN
    RAISE EXCEPTION 'term_snapshots is immutable and cannot be updated or deleted';
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_term_snapshots_immutable ON term_snapshots;
  CREATE TRIGGER trg_term_snapshots_immutable
  BEFORE UPDATE OR DELETE ON term_snapshots
  FOR EACH ROW EXECUTE FUNCTION prevent_term_snapshots_mutation();

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

  DO $$
  BEGIN
    CREATE DOMAIN "vector(1536)" AS TEXT;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS translation_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_text TEXT NOT NULL,
    target_lang VARCHAR(32) NOT NULL,
    target_text TEXT NOT NULL,
    embedding "vector(1536)",
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 挂载向后兼容视图
  CREATE OR REPLACE VIEW view_terms_legacy AS
  SELECT 
    t.id,
    t.version_id,
    t.kw,
    t.zh_cn,
    t.context,
    t.owner_component,
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
`;

export async function ensureDatabaseSchema(pglite?: PGlite | null, pool?: Pool | null) {
  if (pglite) {
    await pglite.exec(CORE_SCHEMA_DDL);
  } else if (pool) {
    await pool.query(CORE_SCHEMA_DDL);
  }
}

export async function initDatabase(options?: { inMemory?: boolean; dbPath?: string; connectionString?: string }) {
  if (dbInstance) {
    return { db: dbInstance, pglite: pgliteInstance, pool: pgPoolInstance };
  }

  const connStr = options?.connectionString || process.env.DATABASE_URL;

  if (connStr && !connStr.includes('localhost:5432/glossa_hub') && !options?.inMemory) {
    try {
      pgPoolInstance = new Pool({ connectionString: connStr, connectionTimeoutMillis: 3000 });
      await pgPoolInstance.query('SELECT 1');
      await ensureDatabaseSchema(null, pgPoolInstance);
      dbInstance = drizzlePg(pgPoolInstance, { schema });
      return { db: dbInstance, pglite: null, pool: pgPoolInstance, engineType: 'PostgreSQL' };
    } catch (err) {
      console.warn('⚠️ 远程 PostgreSQL 连接失败，自动降级至内嵌式 PostgreSQL 16 (PGlite):', (err as any).message);
    }
  }

  const dataDir = options?.inMemory
    ? undefined
    : (options?.dbPath || path.resolve(process.cwd(), './data/glossa_pglite'));

  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgliteInstance = new PGlite(dataDir);
  await pgliteInstance.waitReady;
  await ensureDatabaseSchema(pgliteInstance, null);
  dbInstance = drizzlePglite(pgliteInstance, { schema });

  return {
    db: dbInstance,
    pglite: pgliteInstance,
    pool: null,
    engineType: options?.inMemory ? 'PGlite (In-Memory)' : `PGlite (Storage: ${dataDir})`
  };
}

export { schema };
