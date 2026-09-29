-- GlossaHub 向后兼容视图 view_terms_legacy
-- 保持与历史 terms 表相同的结构，将 term_translations 聚合回 translations JSON 和 translations_meta JSON
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
    -- 汇聚多语种翻译为旧版 {"en": "...", "de": "..."} JSON
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
