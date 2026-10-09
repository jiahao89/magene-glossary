/**
 * server/repositories/versionRepository.cjs
 * 
 * 固件大表版本数据访问层 (Repository Layer)
 * 统一屏蔽 SQLite 与 PostgreSQL 的方言差异。
 */

const crypto = require('crypto');
const { db, getDbType } = require('../config/db.cjs');

/**
 * 获取指定项目下的所有版本
 */
async function getVersionsByProject(projectId = 'proj-default') {
  return await db.query(
    `SELECT v.id, v.version_name AS name, v.created_at, u.name AS creator_name
     FROM versions v
     LEFT JOIN users u ON v.created_by = u.id
     WHERE v.project_id = $1
     ORDER BY v.created_at DESC`,
    [projectId]
  );
}

/**
 * 根据 ID 获取版本
 */
async function getVersionById(versionId, projectId = null) {
  if (projectId) {
    return await db.queryOne(
      'SELECT id, version_name, project_id, created_at FROM versions WHERE id = $1 AND project_id = $2',
      [versionId, projectId]
    );
  }
  return await db.queryOne(
    'SELECT id, version_name, project_id, created_at FROM versions WHERE id = $1',
    [versionId]
  );
}

/**
 * 按版本名称查询是否已存在同名版本
 */
async function findVersionByName(projectId, versionName, excludeId = null) {
  if (excludeId) {
    return await db.queryOne(
      'SELECT id FROM versions WHERE project_id = $1 AND version_name = $2 AND id != $3',
      [projectId, versionName, excludeId]
    );
  }
  return await db.queryOne(
    'SELECT id FROM versions WHERE project_id = $1 AND version_name = $2',
    [projectId, versionName]
  );
}

/**
 * 创建新版本
 */
async function createVersion({ id, projectId, versionName, createdBy }) {
  const dbType = getDbType();
  const versionId = id || crypto.randomUUID();

  if (dbType === 'postgres') {
    await db.run(
      'INSERT INTO versions (id, project_id, version_name, created_at, created_by) VALUES ($1, $2, $3, NOW(), $4)',
      [versionId, projectId, versionName, createdBy]
    );
  } else {
    await db.run(
      "INSERT INTO versions (id, project_id, version_name, created_at, created_by) VALUES ($1, $2, $3, datetime('now'), $4)",
      [versionId, projectId, versionName, createdBy]
    );
  }

  return { id: versionId, versionName };
}

/**
 * 更新版本名称
 */
async function renameVersion(versionId, projectId, newName) {
  return await db.run(
    'UPDATE versions SET version_name = $1 WHERE id = $2 AND project_id = $3',
    [newName, versionId, projectId]
  );
}

/**
 * 删除版本
 */
async function deleteVersion(versionId) {
  return await db.run('DELETE FROM versions WHERE id = $1', [versionId]);
}

/**
 * 分批继承词条基础记录
 */
async function inheritTermsChunk(targetVersionId, baseVersionId, offset = 0, limit = 100) {
  const dbType = getDbType();
  const baseTerms = await db.query(
    'SELECT kw, context, owner, zh_cn, translations, translations_meta, sort_order FROM terms WHERE version_id = $1 ORDER BY sort_order ASC, created_at ASC, id ASC LIMIT $2 OFFSET $3',
    [baseVersionId, limit, offset]
  );

  if (baseTerms.length === 0) {
    return 0;
  }

  if (dbType === 'postgres') {
    const valuePlaceholders = [];
    const values = [];
    let paramIdx = 1;

    for (const term of baseTerms) {
      const newTermId = crypto.randomUUID();
      const translationsStr = typeof term.translations === 'string'
        ? term.translations
        : JSON.stringify(term.translations || {});
      const translationsMetaStr = typeof term.translations_meta === 'string'
        ? term.translations_meta
        : JSON.stringify(term.translations_meta || {});

      valuePlaceholders.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}::jsonb, $${paramIdx + 7}::jsonb, NOW(), NOW(), FALSE, $${paramIdx + 8})`
      );
      values.push(
        newTermId,
        targetVersionId,
        term.kw,
        term.context ?? null,
        term.owner ?? null,
        term.zh_cn,
        translationsStr,
        translationsMetaStr,
        term.sort_order ?? 0
      );
      paramIdx += 9;
    }

    const sql = `INSERT INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT (version_id, kw) DO NOTHING`;
    await db.run(sql, values);
  } else {
    const valuePlaceholders = [];
    const values = [];

    for (const term of baseTerms) {
      const newTermId = crypto.randomUUID();
      const translationsStr = typeof term.translations === 'string'
        ? term.translations
        : JSON.stringify(term.translations || {});
      const translationsMetaStr = typeof term.translations_meta === 'string'
        ? term.translations_meta
        : JSON.stringify(term.translations_meta || {});

      valuePlaceholders.push(`(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, ?)`);
      values.push(
        newTermId,
        targetVersionId,
        term.kw,
        term.context ?? null,
        term.owner ?? null,
        term.zh_cn,
        translationsStr,
        translationsMetaStr,
        term.sort_order ?? 0
      );
    }

    const sql = `INSERT OR IGNORE INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order) VALUES ${valuePlaceholders.join(', ')}`;
    await db.run(sql, values);
  }

  return baseTerms.length;
}

module.exports = {
  getVersionsByProject,
  getVersionById,
  findVersionByName,
  createVersion,
  renameVersion,
  deleteVersion,
  inheritTermsChunk
};
