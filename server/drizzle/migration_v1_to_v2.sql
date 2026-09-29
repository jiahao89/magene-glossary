-- GlossaHub 历史存量数据平滑拆解迁移脚本
-- 将旧 terms 表中的 translations JSON 拆解为 term_translations 行级记录

BEGIN;

-- 1. 创建子表 term_translations (如果未创建)
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

-- 2. 数据平移：从旧 terms 表的 translations JSON 拆解为行级数据
-- 仅对存在 translations 列的表执行拆解
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'terms' AND column_name = 'translations'
    ) THEN
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
            COALESCE(t.updated_by, 'MIGRATION')
        FROM terms t,
        LATERAL jsonb_each_text(
            CASE 
                WHEN t.translations IS NULL OR t.translations = '' THEN '{}'::jsonb
                WHEN jsonb_typeof(t.translations::jsonb) = 'object' THEN t.translations::jsonb
                ELSE '{}'::jsonb
            END
        ) kv
        ON CONFLICT (term_id, language_code) DO UPDATE 
        SET translation_text = EXCLUDED.translation_text,
            source_type = EXCLUDED.source_type,
            updated_at = EXCLUDED.updated_at;
            
        RAISE NOTICE '已成功从 terms.translations 拆解数据至 term_translations';
    ELSE
        RAISE NOTICE 'terms 表未检测到旧版 translations 列，跳过拆解步骤';
    END IF;
END $$;

COMMIT;
