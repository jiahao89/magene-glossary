/**
 * server/repositories/termRepository.cjs
 * 
 * 词条数据访问层 (Repository Layer)
 * 统一屏蔽 SQLite 与 PostgreSQL 的方言差异、JSON 查询、并发乐观锁与事务管理。
 */

const crypto = require('crypto');
const { db, getDbType } = require('../config/db.cjs');
const { parseJsonField } = require('../utils/jsonFields.cjs');
const { TARGET_LANGUAGES } = require('../config/constants.cjs');

/**
 * 校验批量 termIds 是否全属于用户拥有读写权限的项目
 */
async function verifyTermsOwnership(userId, termIds, userRole) {
  if (userRole === 'admin') return true;
  if (!Array.isArray(termIds) || termIds.length === 0) return false;
  const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
  const row = await db.queryOne(
    `SELECT COUNT(DISTINCT t.id) as cnt FROM terms t
     JOIN versions v ON t.version_id = v.id
     JOIN project_members pm ON pm.project_id = v.project_id
     WHERE t.id IN (${placeholders}) AND pm.user_id = $${termIds.length + 1}
       AND pm.role IN ('owner', 'editor')`,
    [...termIds, userId]
  );
  return parseInt(row?.cnt || 0, 10) === termIds.length;
}

/**
 * 根据 ID 获取单条词条
 */
async function getTermById(termId) {
  return await db.queryOne('SELECT * FROM terms WHERE id = $1', [termId]);
}

/**
 * 检查当前版本下是否存在重复的 KW
 */
async function findDuplicateKw(versionId, kw, excludeTermId = null) {
  if (!kw) return null;
  if (excludeTermId) {
    return await db.queryOne(
      'SELECT id, zh_cn FROM terms WHERE version_id = $1 AND LOWER(kw) = LOWER($2) AND id <> $3',
      [versionId, kw, excludeTermId]
    );
  }
  return await db.queryOne(
    'SELECT id, zh_cn FROM terms WHERE version_id = $1 AND LOWER(kw) = LOWER($2)',
    [versionId, kw]
  );
}

/**
 * 读取特定版本下的所有词条数据 (支持分页、多关键词多字段模糊搜索、状态过滤、未翻译过滤、多字段排序)
 */
async function getTermsByTable(tableId, options = {}) {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    statusFilter = '',
    untranslated = false,
    sortBy = 'default',
    sortOrder = 'desc'
  } = options;

  const dbType = getDbType();
  let whereClause = 'WHERE version_id = $1';
  const queryParams = [tableId];
  let paramIndex = 2;

  const rawSearch = (search || '').trim();
  if (rawSearch) {
    const tokens = rawSearch.split(/\s+/).filter(Boolean);
    const escapeLike = (str) => str.replace(/([%_\\])/g, '\\$1');

    if (dbType === 'sqlite') {
      const tokenClauses = [];
      for (const token of tokens) {
        const p1 = paramIndex, p2 = paramIndex + 1, p3 = paramIndex + 2, p4 = paramIndex + 3, p5 = paramIndex + 4;
        tokenClauses.push(`(kw LIKE $${p1} ESCAPE '\\' OR zh_cn LIKE $${p2} ESCAPE '\\' OR context LIKE $${p3} ESCAPE '\\' OR owner LIKE $${p4} ESCAPE '\\' OR translations LIKE $${p5} ESCAPE '\\')`);
        const searchPattern = `%${escapeLike(token)}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        paramIndex += 5;
      }
      if (tokenClauses.length > 0) {
        whereClause += ` AND (${tokenClauses.join(' AND ')})`;
      }
    } else {
      const tokenClauses = [];
      for (const token of tokens) {
        tokenClauses.push(`(kw ILIKE $${paramIndex} ESCAPE '\\' OR zh_cn ILIKE $${paramIndex} ESCAPE '\\' OR context ILIKE $${paramIndex} ESCAPE '\\' OR owner ILIKE $${paramIndex} ESCAPE '\\' OR translations::text ILIKE $${paramIndex} ESCAPE '\\')`);
        queryParams.push(`%${escapeLike(token)}%`);
        paramIndex++;
      }
      if (tokenClauses.length > 0) {
        whereClause += ` AND (${tokenClauses.join(' AND ')})`;
      }
    }
  }

  if (statusFilter) {
    if (statusFilter === 'DRAFT') {
      whereClause += ` AND (status = 'DRAFT' OR status = 'PENDING_REVIEW' OR status = 'TRANSLATING')`;
    } else {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(statusFilter);
      paramIndex++;
    }
  }

  if (untranslated) {
    const verRow = await db.queryOne('SELECT project_id FROM versions WHERE id = $1', [tableId]);
    const projectId = verRow?.project_id || 'proj-default';
    const langRows = await db.query(
      'SELECT lang_name FROM languages WHERE project_id = $1 ORDER BY display_order ASC',
      [projectId]
    );
    const activeLangs = (langRows && langRows.length > 0)
      ? langRows.map(l => l.lang_name)
      : TARGET_LANGUAGES;

    if (activeLangs.length > 0) {
      if (dbType === 'sqlite') {
        const conditions = activeLangs.map(lang => `(json_extract(translations, '$.${lang}') IS NULL OR json_extract(translations, '$.${lang}') = '')`);
        whereClause += ` AND (${conditions.join(' OR ')})`;
      } else {
        const conditions = activeLangs.map((lang, idx) => {
          const p = paramIndex + idx;
          return `(translations->>$${p} IS NULL OR translations->>$${p} = '')`;
        });
        queryParams.push(...activeLangs);
        paramIndex += activeLangs.length;
        whereClause += ` AND (${conditions.join(' OR ')})`;
      }
    }
  }

  const orderDir = (sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  let orderByClause = 'ORDER BY sort_order ASC, created_at ASC, id ASC';
  if (sortBy === 'updated_at' || sortBy === 'updatedAt') {
    orderByClause = `ORDER BY COALESCE(updated_at, created_at, '') ${orderDir}, id ${orderDir}`;
  } else if (sortBy === 'created_at' || sortBy === 'createdAt') {
    orderByClause = `ORDER BY COALESCE(created_at, updated_at, '') ${orderDir}, id ${orderDir}`;
  } else if (sortBy === 'kw' || sortBy === 'KW') {
    orderByClause = `ORDER BY kw ${orderDir}, id ${orderDir}`;
  } else if (sortBy === 'zh_cn' || sortBy === 'zhCn') {
    orderByClause = `ORDER BY zh_cn ${orderDir}, id ${orderDir}`;
  } else if (sortBy === 'status') {
    orderByClause = `ORDER BY status ${orderDir}, id ${orderDir}`;
  }

  const countQuery = `SELECT COUNT(*) as total FROM terms ${whereClause}`;
  const dataQuery = `SELECT * FROM terms ${whereClause} ${orderByClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  const countResult = await db.queryOne(countQuery, queryParams);
  const total = parseInt(countResult?.total || 0, 10);

  const dataParams = [...queryParams, pageSize, (page - 1) * pageSize];
  const terms = await db.query(dataQuery, dataParams);

  const formatted = terms.map(term => {
    const trans = parseJsonField(term.translations);
    const transMeta = parseJsonField(term.translations_meta);

    return {
      recordId: term.id,
      createdAt: term.created_at,
      updatedAt: term.updated_at,
      isLocked: term.is_locked || 0,
      lockedBy: term.locked_by || '',
      lockedAt: term.locked_at || '',
      status: term.status || 'DRAFT',
      rejectReason: term.reject_reason || '',
      translationsMeta: transMeta,
      fields: {
        KW: term.kw && term.kw.startsWith('__EMPTY_KW_') ? '' : term.kw,
        'CN（中文）': term.zh_cn,
        所在页面: term.context || '',
        字号类别: term.owner || '',
        ...trans
      }
    };
  });

  return { total, page, pageSize, records: formatted };
}

/**
 * 乐观锁单条词条更新 (自动处理快照生成、并发冲突判定与只读锁定判定)
 */
async function updateTermWithOptimisticLock(termId, updateData, userId, userRole) {
  const {
    finalKw,
    finalContext,
    finalOwner,
    finalZhCn,
    updatedTrans,
    translationsMeta,
    oldUpdatedAt
  } = updateData;

  const dbType = getDbType();
  const term = await getTermById(termId);
  if (!term) {
    return { notFound: true };
  }

  const dbTransStr = typeof term.translations === 'string' ? term.translations : JSON.stringify(term.translations || {});
  const isTransChanged = dbTransStr !== updatedTrans;
  const isZhChanged = finalZhCn && term.zh_cn !== finalZhCn;
  const isKwChanged = finalKw !== term.kw;

  let nextStatus = 'PENDING_REVIEW';
  if (userRole === 'admin') {
    nextStatus = 'APPROVED';
  }

  const updateResult = await db.transaction(async (tx) => {
    if (isTransChanged || isZhChanged || isKwChanged) {
      const snapshotId = crypto.randomUUID();
      if (dbType === 'postgres') {
        await tx.run(
          `INSERT INTO term_snapshots (id, term_id, version_id, kw, zh_cn, translations, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), $7)`,
          [snapshotId, termId, term.version_id, term.kw, term.zh_cn, dbTransStr, userId]
        );
      } else {
        const snapNow = new Date().toISOString();
        await tx.run(
          `INSERT INTO term_snapshots (id, term_id, version_id, kw, zh_cn, translations, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [snapshotId, termId, term.version_id, term.kw, term.zh_cn, dbTransStr, snapNow, userId]
        );
      }
    }

    if (dbType === 'postgres') {
      return await tx.run(
        `UPDATE terms
         SET kw = $1, context = $2, owner = $3, zh_cn = $4, translations = $5::jsonb, translations_meta = $6::jsonb, status = $7, reject_reason = NULL, updated_at = NOW(), updated_by = $8
         WHERE id = $9 AND date_trunc('ms', updated_at) = date_trunc('ms', $10::timestamptz) AND is_locked IS NOT TRUE`,
        [finalKw, finalContext, finalOwner, finalZhCn, updatedTrans, JSON.stringify(translationsMeta || {}), nextStatus, userId, termId, oldUpdatedAt]
      );
    } else {
      const nowIso = new Date().toISOString();
      return await tx.run(
        `UPDATE terms
         SET kw = $1, context = $2, owner = $3, zh_cn = $4, translations = $5, translations_meta = $6, status = $7, reject_reason = NULL, updated_at = $8, updated_by = $9
         WHERE id = $10 AND updated_at = $11 AND is_locked != 1`,
        [finalKw, finalContext, finalOwner, finalZhCn, updatedTrans, JSON.stringify(translationsMeta || {}), nextStatus, nowIso, userId, termId, oldUpdatedAt]
      );
    }
  });

  const affectedRows = updateResult.changes || 0;
  if (affectedRows === 0) {
    const fresh = await getTermById(termId);
    if (fresh && (fresh.is_locked === 1 || fresh.is_locked === true)) {
      return { isLocked: true };
    }
    return { conflict: true };
  }

  const updatedTerm = await getTermById(termId);
  return { success: true, term: updatedTerm };
}

/**
 * 获取指定词条的历史快照列表
 */
async function getTermSnapshots(termId) {
  const snapshots = await db.query(
    `SELECT s.id, s.kw, s.zh_cn, s.translations, s.created_at, s.created_by, u.username as creator_name
     FROM term_snapshots s
     LEFT JOIN users u ON s.created_by = u.id
     WHERE s.term_id = $1
     ORDER BY s.created_at DESC`,
    [termId]
  );

  return snapshots.map(s => {
    const trans = parseJsonField(s.translations);
    return {
      id: s.id,
      kw: s.kw,
      zh_cn: s.zh_cn,
      translations: trans,
      createdAt: s.created_at,
      creatorName: s.creator_name || '系统用户'
    };
  });
}

module.exports = {
  verifyTermsOwnership,
  getTermById,
  findDuplicateKw,
  getTermsByTable,
  updateTermWithOptimisticLock,
  getTermSnapshots
};
