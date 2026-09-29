import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';

// pgvector 1536 维向量类型扩展定义
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(val: number[]): string {
    return Array.isArray(val) ? `[${val.join(',')}]` : (val as any);
  },
  fromDriver(val: string): number[] {
    if (!val) return [];
    if (typeof val !== 'string') return val as any;
    return val.replace(/[\[\]]/g, '').split(',').map(Number);
  },
});

// 1. 项目空间表 (Projects) - 支撑不同硬件产品线物理隔离
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(), // 例如: 'c706-firmware', 'onelapfit-app'
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  targetLanguages: jsonb('target_languages').notNull().default(['en', 'de', 'fr', 'es', 'it', 'ja', 'ko']),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// 2. 固件版本表 (Versions)
export const versions = pgTable('versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  versionName: varchar('version_name', { length: 128 }).notNull(), // 例如: 'v2.1_0720'
  isSealed: boolean('is_sealed').default(false).notNull(), // 封板加锁只读保护
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  idxProjectVersion: uniqueIndex('idx_project_version').on(table.projectId, table.versionName)
}));

// 3. 词条核心主表 (Terms)
export const terms = pgTable('terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  versionId: uuid('version_id').references(() => versions.id, { onDelete: 'cascade' }).notNull(),
  kw: varchar('kw', { length: 256 }).notNull(), // 键名宏: KW_STOP_RIDE
  zhCn: text('zh_cn').notNull(), // 中文基准原文
  context: text('context').default(''), // 所在页面/模块
  ownerComponent: varchar('owner_component', { length: 128 }).default(''), // 硬件屏幕组件/字号
  maxChars: integer('max_chars').default(0), // 硬件物理屏幕最大字符上限 (0 表示不设防)
  isLocked: boolean('is_locked').default(false).notNull(), // 单条防修改锁
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 64 }).notNull() // 操作人姓名/工号
}, (table) => ({
  idxVersionKw: uniqueIndex('idx_version_kw').on(table.versionId, table.kw),
  idxVersionSort: index('idx_version_sort').on(table.versionId, table.sortOrder)
}));

// 4. 单语种细粒度翻译表 (Term Translations)
export const termTranslations = pgTable('term_translations', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').references(() => terms.id, { onDelete: 'cascade' }).notNull(),
  languageCode: varchar('language_code', { length: 32 }).notNull(), // 'en', 'de', 'fr'
  translationText: text('translation_text').default('').notNull(),
  sourceType: varchar('source_type', { length: 16 }).default('human').notNull(), // 'human' | 'ai' | 'tm'
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 64 }).notNull()
}, (table) => ({
  idxTermLang: uniqueIndex('idx_term_lang').on(table.termId, table.languageCode),
  idxLangText: index('idx_lang_text').on(table.languageCode)
}));

// 5. 不可变快照表 (Term Snapshots) - 支撑时光机与后悔药
export const termSnapshots = pgTable('term_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull(),
  versionId: uuid('version_id').notNull(),
  snapshotState: jsonb('snapshot_state').notNull(), // 保存该时刻词条元数据及其全部语言译文的全量镜像
  reason: varchar('reason', { length: 64 }).notNull(), // 'USER_EDIT' | 'AI_BATCH' | 'ROLLBACK_BACKUP' | 'DIFF_APPLY'
  operator: varchar('operator', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  idxTermSnapshots: index('idx_term_snapshots').on(table.termId, table.createdAt),
  idxVersionSnapshots: index('idx_version_snapshots').on(table.versionId, table.createdAt)
}));

// 6. 细粒度字段变更审计表 (Audit Change Logs) - 支撑精准 Diff 与追踪
export const auditChangeLogs = pgTable('audit_change_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  versionId: uuid('version_id').notNull(),
  termId: uuid('term_id').notNull(),
  kw: varchar('kw', { length: 256 }).notNull(),
  targetLang: varchar('target_lang', { length: 32 }), // 空值代表修改主表字段，否则为具体语种
  action: varchar('action', { length: 64 }).notNull(), // 'CREATE' | 'MODIFY' | 'AI_TRANSLATE' | 'ROLLBACK' | 'DIFF_APPLY'
  oldValue: text('old_value'),
  newValue: text('new_value'),
  details: text('details'),
  operator: varchar('operator', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  idxAuditVersion: index('idx_audit_version').on(table.versionId, table.createdAt),
  idxAuditKw: index('idx_audit_kw').on(table.kw),
  idxAuditOperator: index('idx_audit_operator').on(table.operator)
}));

// 7. 向量化翻译记忆库 (Translation Memories)
export const translationMemories = pgTable('translation_memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceText: text('source_text').notNull(),
  targetLang: varchar('target_lang', { length: 32 }).notNull(),
  targetText: text('target_text').notNull(),
  embedding: vector('embedding'), // 1536 维向量
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  idxTmSourceLang: index('idx_tm_source_lang').on(table.targetLang, table.sourceText)
}));
