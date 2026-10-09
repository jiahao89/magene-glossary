const crypto = require('crypto');
const { db, getDbType } = require('../config/db.cjs');
const { backupToRecycleBin } = require('./recycleBin.cjs');
const { parseJsonField } = require('../utils/jsonFields.cjs');
const { createAuditLog } = require('./auditLogger.cjs');
const { generateKwHelper } = require('./difyService.cjs');

/**
 * 批量更新词条分类 (所在页面 context / 字号类别 owner)
 */
async function batchUpdateCategory(termIds, updates, userId) {
  const dbType = getDbType();
  let successCount = 0;
  let lockedCount = 0;

  await db.transaction(async (tx) => {
    const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
    const terms = await tx.query(`SELECT id, is_locked, kw, zh_cn, version_id FROM terms WHERE id IN (${placeholders})`, termIds);

    const validTerms = terms.filter(t => {
      if (t.is_locked === 1 || t.is_locked === true) {
        lockedCount++;
        return false;
      }
      return true;
    });

    if (validTerms.length === 0) {
      return;
    }

    const updatesNormalized = {};
    if (updates.context !== undefined) {
      updatesNormalized.context = updates.context;
    } else if (updates['所在页面'] !== undefined) {
      updatesNormalized.context = updates['所在页面'];
    }

    if (updates.owner !== undefined) {
      updatesNormalized.owner = updates.owner;
    } else if (updates['字号类别'] !== undefined) {
      updatesNormalized.owner = updates['字号类别'];
    }

    const updateFields = [];
    const updateParams = [];
    let idx = 1;

    if (updatesNormalized.context !== undefined) {
      updateFields.push(`context = $${idx++}`);
      updateParams.push(updatesNormalized.context);
    }
    if (updatesNormalized.owner !== undefined) {
      updateFields.push(`owner = $${idx++}`);
      updateParams.push(updatesNormalized.owner);
    }

    if (updateFields.length === 0) return;

    const baseQuery = dbType === 'postgres'
      ? `UPDATE terms SET ${updateFields.join(', ')}, updated_at = NOW(), updated_by = $${idx}`
      : `UPDATE terms SET ${updateFields.join(', ')}, updated_at = datetime('now'), updated_by = $${idx}`;

    updateParams.push(userId);

    const validIds = validTerms.map(t => t.id);
    const idPlaceholders = validIds.map((_, i) => `$${idx + 1 + i}`).join(',');
    await tx.run(`${baseQuery} WHERE id IN (${idPlaceholders})`, [...updateParams, ...validIds]);
    successCount = validIds.length;

    if (successCount > 0) {
      const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
      const ver = await tx.queryOne('SELECT version_name FROM versions WHERE id = $1', [validTerms[0].version_id]);
      const verName = ver ? ver.version_name : '未知版本';
      const detailMsg = `批量更新了 ${successCount} 条词条的分类字段 (${Object.keys(updates).join(', ')})。跳过锁定条数: ${lockedCount}。`;

      const timeExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
      await tx.run(
        `INSERT INTO ${logsTable} (timestamp, action, details, version_name, user_id)
         VALUES (${timeExpr}, '批量修改', $1, $2, $3)`,
        [detailMsg, verName, userId]
      );
    }
  });

  return { successCount, lockedCount };
}

/**
 * 批量清空词条翻译 (保留中文, 删除其他所有语种翻译)
 */
async function batchClearTranslations(termIds, userId) {
  const dbType = getDbType();
  let successCount = 0;
  let lockedCount = 0;

  await db.transaction(async (tx) => {
    const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
    const terms = await tx.query(`SELECT id, is_locked, kw, zh_cn, version_id FROM terms WHERE id IN (${placeholders})`, termIds);

    const validTerms = terms.filter(t => {
      if (t.is_locked === 1 || t.is_locked === true) {
        lockedCount++;
        return false;
      }
      return true;
    });

    if (validTerms.length === 0) {
      return;
    }

    const validIds = validTerms.map(t => t.id);
    const idPlaceholders = validIds.map((_, i) => `$${i + 2}`).join(',');

    if (dbType === 'postgres') {
      await tx.run(
        `UPDATE terms 
         SET translations = '{}'::jsonb, translations_meta = '{}'::jsonb, updated_at = NOW(), updated_by = $1 
         WHERE id IN (${idPlaceholders})`,
        [userId, ...validIds]
      );
    } else {
      await tx.run(
        `UPDATE terms 
         SET translations = '{}', translations_meta = '{}', updated_at = datetime('now'), updated_by = $1 
         WHERE id IN (${idPlaceholders})`,
        [userId, ...validIds]
      );
    }

    successCount = validIds.length;

    if (successCount > 0) {
      const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
      const ver = await tx.queryOne('SELECT version_name FROM versions WHERE id = $1', [validTerms[0].version_id]);
      const verName = ver ? ver.version_name : '未知版本';
      const detailMsg = `批量清空了 ${successCount} 条词条的全部目标语言翻译（保留中文）。跳过锁定条数: ${lockedCount}。`;

      const timeExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
      await tx.run(
        `INSERT INTO ${logsTable} (timestamp, action, details, version_name, user_id)
         VALUES (${timeExpr}, '清空翻译', $1, $2, $3)`,
        [detailMsg, verName, userId]
      );
    }
  });

  return { successCount, lockedCount };
}

/**
 * 批量软删除词条 (走回收站, 30 天可恢复)
 */
async function batchDeleteTerms(termIds, userId) {
  const dbType = getDbType();
  const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
  const terms = await db.query(
    `SELECT id, kw, zh_cn, is_locked FROM terms WHERE id IN (${placeholders})`,
    termIds
  );

  let deletedCount = 0;
  let lockedSkipped = 0;
  const skippedLockedIds = [];
  const deletedKwList = [];

  for (const t of terms) {
    if (t.is_locked === 1 || t.is_locked === true) {
      lockedSkipped++;
      skippedLockedIds.push(t.id);
      continue;
    }
    // 走回收站: 备份完整 term + snapshots
    const entityName = t.zh_cn || t.kw || t.id;
    try {
      await backupToRecycleBin('term', t.id, entityName, userId);
    } catch (e) {
      console.error(`[batch-delete] backupToRecycleBin 失败, termId=${t.id}:`, e.message);
      continue;
    }
    // 硬删 term 行
    await db.run('DELETE FROM terms WHERE id = $1', [t.id]);
    deletedCount++;
    deletedKwList.push(t.kw);
  }

  // 审计日志
  if (deletedCount > 0) {
    const details = `批量软删除 ${deletedCount} 条词条 (已送入回收站, 30 天后清理): ${deletedKwList.slice(0, 10).join(', ')}${deletedKwList.length > 10 ? ` ... 等 ${deletedKwList.length} 条` : ''}`;
    const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
    const timeExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
    await db.run(
      `INSERT INTO ${logsTable} (timestamp, action, details, version_name, user_id)
       VALUES (${timeExpr}, '批量删除', $1, $2, $3)`,
      [details, '', userId]
    );
  }

  return { deletedCount, lockedSkipped, skippedLockedIds };
}

/**
 * 批量复制词条到其他版本
 */
async function batchCopyTerms(termIds, targetVersionId, duplicateStrategy, userId) {
  const dbType = getDbType();
  const targetVer = await db.queryOne('SELECT version_name, project_id FROM versions WHERE id = $1', [targetVersionId]);
  if (!targetVer) {
    const notFoundErr = new Error('目标版本不存在');
    notFoundErr.code = 'NOT_FOUND';
    throw notFoundErr;
  }

  let copyCount = 0;
  let skipCount = 0;
  let overwriteCount = 0;

  await db.transaction(async (tx) => {
    const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
    const sourceTerms = await tx.query(
      `SELECT kw, context, owner, zh_cn, translations, translations_meta FROM terms WHERE id IN (${placeholders})`,
      termIds
    );

    const existingTerms = await tx.query(
      'SELECT id, kw, is_locked, translations, sort_order FROM terms WHERE version_id = $1',
      [targetVersionId]
    );

    const maxSortRow = await tx.queryOne(
      'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM terms WHERE version_id = $1',
      [targetVersionId]
    );
    let currentSortOrder = parseInt(maxSortRow?.max_sort || 0, 10);

    const existingMap = {};
    existingTerms.forEach(t => {
      existingMap[t.kw] = t;
    });

    for (const term of sourceTerms) {
      const exist = existingMap[term.kw];
      const newId = crypto.randomUUID();

      let transStr = JSON.stringify(parseJsonField(term.translations));
      let metaStr = JSON.stringify(parseJsonField(term.translations_meta));

      if (exist) {
        if (duplicateStrategy === 'skip') {
          skipCount++;
          continue;
        } else if (duplicateStrategy === 'overwrite') {
          if (exist.is_locked === 1 || exist.is_locked === true) {
            skipCount++;
            continue;
          }

          const targetSortOrder = exist.sort_order && exist.sort_order > 0 ? exist.sort_order : ++currentSortOrder;

          await tx.run('DELETE FROM terms WHERE id = $1', [exist.id]);

          if (dbType === 'postgres') {
            await tx.run(
              `INSERT INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW(), NOW(), FALSE, $9, 'DRAFT')`,
              [newId, targetVersionId, term.kw, term.context, term.owner, term.zh_cn, transStr, metaStr, targetSortOrder]
            );
          } else {
            await tx.run(
              `INSERT INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now'), datetime('now'), 0, $9, 'DRAFT')`,
              [newId, targetVersionId, term.kw, term.context, term.owner, term.zh_cn, transStr, metaStr, targetSortOrder]
            );
          }
          overwriteCount++;
        }
      } else {
        currentSortOrder++;
        if (dbType === 'postgres') {
          await tx.run(
            `INSERT INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW(), NOW(), FALSE, $9, 'DRAFT')`,
            [newId, targetVersionId, term.kw, term.context, term.owner, term.zh_cn, transStr, metaStr, currentSortOrder]
          );
        } else {
          await tx.run(
            `INSERT INTO terms (id, version_id, kw, context, owner, zh_cn, translations, translations_meta, created_at, updated_at, is_locked, sort_order, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now'), datetime('now'), 0, $9, 'DRAFT')`,
            [newId, targetVersionId, term.kw, term.context, term.owner, term.zh_cn, transStr, metaStr, currentSortOrder]
          );
        }
        copyCount++;
      }
    }

    const totalMoved = copyCount + overwriteCount;
    if (totalMoved > 0 || skipCount > 0) {
      const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
      const details = `批量从其他版本复制词条到 [${targetVer.version_name}]。成功复制新增: ${copyCount} 条，覆盖已有: ${overwriteCount} 条，跳过（重复/锁定）: ${skipCount} 条。`;

      const timeExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
      await tx.run(
        `INSERT INTO ${logsTable} (timestamp, action, details, version_name, user_id)
         VALUES (${timeExpr}, '批量复制', $1, $2, $3)`,
        [details, targetVer.version_name, userId]
      );
    }
  });

  return {
    targetVersionName: targetVer.version_name,
    addedCount: copyCount,
    overwrittenCount: overwriteCount,
    skippedCount: skipCount
  };
}

/**
 * 批量生成并更新词条 KW
 */
async function batchGenerateKw(tableId, { termIds, overwrite = false, updates = [] }, userId) {
  const dbType = getDbType();
  const version = await db.queryOne('SELECT id, version_name, project_id FROM versions WHERE id = $1', [tableId]);
  if (!version) {
    const err = new Error('数据表版本不存在');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const projectId = version.project_id || 'proj-default';
  let updatedCount = 0;
  let skippedCount = 0;
  const modifiedTerms = [];

  await db.transaction(async (tx) => {
    if (Array.isArray(updates) && updates.length > 0) {
      for (const item of updates) {
        if (!item.id || !item.kw) continue;
        if (dbType === 'postgres') {
          await tx.run(
            'UPDATE terms SET kw = $1, updated_at = NOW() WHERE id = $2 AND version_id = $3',
            [item.kw, item.id, tableId]
          );
        } else {
          await tx.run(
            "UPDATE terms SET kw = $1, updated_at = datetime('now') WHERE id = $2 AND version_id = $3",
            [item.kw, item.id, tableId]
          );
        }
        updatedCount++;
        modifiedTerms.push({ id: item.id, kw: item.kw });
      }
    } else {
      let candidates = [];
      if (Array.isArray(termIds) && termIds.length > 0) {
        const placeholders = termIds.map((_, i) => `$${i + 2}`).join(',');
        candidates = await tx.query(
          `SELECT id, kw, zh_cn, translations, context, is_locked FROM terms WHERE version_id = $1 AND id IN (${placeholders})`,
          [tableId, ...termIds]
        );
      } else {
        candidates = await tx.query(
          'SELECT id, kw, zh_cn, translations, context, is_locked FROM terms WHERE version_id = $1',
          [tableId]
        );
      }

      for (const term of candidates) {
        if (term.is_locked === 1 || term.is_locked === true) {
          skippedCount++;
          continue;
        }
        const isKwEmpty = !term.kw || !term.kw.trim() || term.kw.startsWith('__EMPTY_KW_');
        if (!isKwEmpty && !overwrite) {
          skippedCount++;
          continue;
        }

        let enText = '';
        if (term.translations) {
          const parsed = parseJsonField(term.translations);
          enText = parsed['EN（英文）'] || parsed['EN'] || parsed['en'] || '';
        }

        const generatedKw = await generateKwHelper(projectId, term.zh_cn, enText, term.context);
        if (generatedKw) {
          if (dbType === 'postgres') {
            await tx.run(
              'UPDATE terms SET kw = $1, updated_at = NOW() WHERE id = $2',
              [generatedKw, term.id]
            );
          } else {
            await tx.run(
              "UPDATE terms SET kw = $1, updated_at = datetime('now') WHERE id = $2",
              [generatedKw, term.id]
            );
          }
          updatedCount++;
          modifiedTerms.push({ id: term.id, kw: generatedKw, zh_cn: term.zh_cn });
        } else {
          skippedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
      const details = `批量自动生成 KW 键名：成功更新 ${updatedCount} 条词条${skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''}。`;

      const timeExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
      await tx.run(
        `INSERT INTO ${logsTable} (timestamp, action, details, version_name, user_id)
         VALUES (${timeExpr}, '批量生成KW', $1, $2, $3)`,
        [details, version.version_name, userId]
      );
    }
  });

  return { updatedCount, skippedCount, modifiedTerms };
}

/**
 * 批量审核词条工作流
 */
async function batchApproveTerms(termIds, status, rejectReason, userId) {
  const dbType = getDbType();
  let approvedCount = 0;

  await db.transaction(async (tx) => {
    const selectPlaceholders = termIds.map((_, i) => `$${i + 1}`).join(',');
    const candidates = await tx.query(
      `SELECT id, is_locked, kw, zh_cn, version_id FROM terms WHERE id IN (${selectPlaceholders})`,
      termIds
    );

    const validTerms = candidates.filter(t => !(t.is_locked === 1 || t.is_locked === true));
    if (validTerms.length === 0) {
      return;
    }

    const validIds = validTerms.map(t => t.id);
    const reason = status === 'REJECTED' ? (rejectReason || '未填写具体原因') : null;

    const updatePlaceholders = validIds.map((_, i) => `$${i + 4}`).join(',');
    const updateSql = dbType === 'postgres'
      ? `UPDATE terms SET status = $1, reject_reason = $2, updated_at = NOW(), updated_by = $3 WHERE id IN (${updatePlaceholders})`
      : `UPDATE terms SET status = $1, reject_reason = $2, updated_at = datetime('now'), updated_by = $3 WHERE id IN (${updatePlaceholders})`;
    await tx.run(updateSql, [status, reason, userId, ...validIds]);
    approvedCount = validIds.length;

    const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
    const logPlaceholders = validIds.map((_, i) => `$${i + 4}`).join(',');
    const timestampExpr = dbType === 'postgres' ? 'NOW()' : "datetime('now')";
    const detailsPrefix = '审核词条 [';
    const detailsSuffix = `]，结果: [${status}]${status === 'REJECTED' ? `，原因: ${reason}` : ''}`;

    const logSql = `INSERT INTO ${logsTable} (timestamp, kw, chinese, action, details, version_name, user_id)
         SELECT ${timestampExpr}, t.kw, t.zh_cn, '内容审核', $1 || t.kw || $2, COALESCE(v.version_name, ''), $3
         FROM terms t LEFT JOIN versions v ON t.version_id = v.id
         WHERE t.id IN (${logPlaceholders})`;
    await tx.run(logSql, [detailsPrefix, detailsSuffix, userId, ...validIds]);
  });

  return { approvedCount };
}

/**
 * 批量同步数据表记录 (新增、修改、删除、重排序)
 */
async function syncRecords(tableId, { added = [], updated = [], deletedIds = [], reorder = [] }, userId) {
  const dbType = getDbType();
  let successCount = 0;

  await db.transaction(async (tx) => {
    // 1. Delete
    if (deletedIds.length > 0) {
      const placeholders = deletedIds.map((_, i) => `$${i + 1}`).join(',');
      await tx.query(`DELETE FROM terms WHERE id IN (${placeholders}) AND version_id = $${deletedIds.length + 1} AND (is_locked IS NOT TRUE)`, [...deletedIds, tableId]);
    }

    // 2. Insert (Added)
    const maxSortRow = await tx.queryOne(
      'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM terms WHERE version_id = $1',
      [tableId]
    );
    let nextSortOrder = parseInt(maxSortRow?.max_sort || 0, 10);

    for (const rec of added) {
      let kwVal = (rec.fields?.['KW'] || rec.kw || '').trim();
      if (!kwVal) {
        kwVal = `__EMPTY_KW_${crypto.randomUUID()}__`;
      }
      const zhCnVal = (rec.fields?.['CN（中文）'] || rec.zh_cn || '').trim();
      const contextVal = (rec.fields?.['所在页面'] || rec.context || '').trim();

      const systemKeys = ['KW', 'CN（中文）', '所在页面', '字号类别'];
      let translationsObj = rec.translations;
      if (!translationsObj || typeof translationsObj !== 'object') {
        translationsObj = {};
        Object.keys(rec.fields || {}).forEach(k => {
          if (!systemKeys.includes(k) && rec.fields[k] !== undefined) {
            translationsObj[k] = rec.fields[k];
          }
        });
      }

      const fieldsStr = JSON.stringify(translationsObj);
      const translationsMetaStr = JSON.stringify(rec.translationsMeta || {});
      const nowStr = new Date().toISOString();
      const lockedFalseVal = dbType === 'postgres' ? false : 0;

      let sortOrder = rec.sortOrder;
      if (sortOrder === undefined || sortOrder === null) {
        sortOrder = nextSortOrder + 1;
      }
      nextSortOrder = Math.max(nextSortOrder, sortOrder);

      await tx.query(`
        INSERT INTO terms (id, version_id, kw, context, zh_cn, translations, translations_meta, is_locked, status, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (version_id, kw) DO UPDATE SET
          context = EXCLUDED.context,
          zh_cn = EXCLUDED.zh_cn,
          translations = EXCLUDED.translations,
          translations_meta = EXCLUDED.translations_meta,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at
      `, [
        rec.recordId,
        tableId,
        kwVal,
        contextVal,
        zhCnVal,
        fieldsStr,
        translationsMetaStr,
        lockedFalseVal,
        'DRAFT',
        sortOrder,
        nowStr,
        nowStr
      ]);
      successCount++;
    }

    // 3. Update (Modified)
    for (const rec of updated) {
      const existing = await tx.queryOne('SELECT kw, zh_cn, context, translations, translations_meta FROM terms WHERE id = $1', [rec.recordId]);
      
      let kwVal = rec.fields && rec.fields['KW'] !== undefined 
        ? rec.fields['KW'].trim() 
        : (rec.kw !== undefined ? rec.kw.trim() : (existing ? existing.kw : ''));

      if (!kwVal) {
        if (existing && existing.kw && existing.kw.startsWith('__EMPTY_KW_')) {
          kwVal = existing.kw;
        } else {
          kwVal = `__EMPTY_KW_${crypto.randomUUID()}__`;
        }
      }

      const zhCnVal = rec.fields && rec.fields['CN（中文）'] !== undefined 
        ? rec.fields['CN（中文）'].trim() 
        : (existing ? existing.zh_cn : '');

      const contextVal = rec.fields && rec.fields['所在页面'] !== undefined 
        ? rec.fields['所在页面'].trim() 
        : (existing ? existing.context || '' : '');

      const systemKeys = ['KW', 'CN（中文）', '所在页面', '字号类别'];
      let translationsObj = rec.translations;
      if (!translationsObj || typeof translationsObj !== 'object') {
        translationsObj = {};
        Object.keys(rec.fields || {}).forEach(k => {
          if (!systemKeys.includes(k) && rec.fields[k] !== undefined) {
            translationsObj[k] = rec.fields[k];
          }
        });
      }

      let existingTrans = parseJsonField(existing && existing.translations);
      const finalTranslationsObj = { ...existingTrans, ...translationsObj };
      const fieldsStr = JSON.stringify(finalTranslationsObj);

      let mergedMeta = rec.translationsMeta;
      if (!mergedMeta && existing && existing.translations_meta) {
        try {
          mergedMeta = typeof existing.translations_meta === 'string' ? JSON.parse(existing.translations_meta) : existing.translations_meta;
        } catch {
          mergedMeta = {};
        }
      }
      const translationsMetaStr = JSON.stringify(mergedMeta || {});
      const nowStr = new Date().toISOString();

      await tx.query(`
        UPDATE terms
        SET kw = $1, context = $2, zh_cn = $3, translations = $4, translations_meta = $5, updated_at = $6${rec.sortOrder !== undefined ? ', sort_order = $9' : ''}
        WHERE id = $7 AND version_id = $8 AND (is_locked IS NOT TRUE)
      `, rec.sortOrder !== undefined ? [
        kwVal,
        contextVal,
        zhCnVal,
        fieldsStr,
        translationsMetaStr,
        nowStr,
        rec.recordId,
        tableId,
        rec.sortOrder
      ] : [
        kwVal,
        contextVal,
        zhCnVal,
        fieldsStr,
        translationsMetaStr,
        nowStr,
        rec.recordId,
        tableId
      ]);
      successCount++;
    }

    // 4. Reorder
    for (const rec of reorder) {
      if (rec.recordId && rec.sortOrder !== undefined) {
        await tx.query(
          'UPDATE terms SET sort_order = $1 WHERE id = $2 AND version_id = $3',
          [rec.sortOrder, rec.recordId, tableId]
        );
      }
    }

    // 5. 记录同步审计日志
    try {
      const ver = await tx.queryOne('SELECT version_name FROM versions WHERE id = $1', [tableId]);
      const verName = ver ? ver.version_name : '';

      if (added.length === 1) {
        const a = added[0];
        const aKw = a.fields?.['KW'] || a.kw || '';
        const aZh = a.fields?.['CN（中文）'] || a.zh_cn || '';
        await createAuditLog({
          kw: aKw,
          chinese: aZh,
          action: '新增词条',
          details: `新增词条 [${aKw}] (${aZh})`,
          versionName: verName,
          userId,
          tx
        });
      } else if (added.length > 1) {
        const firstFew = added.slice(0, 5).map(i => (i.fields?.['KW'] || i.kw)).filter(Boolean).join(', ');
        await createAuditLog({
          action: '批量新增',
          details: `批量新增了 ${added.length} 条词条${firstFew ? ` (${firstFew} 等)` : ''}`,
          versionName: verName,
          userId,
          tx
        });
      }

      if (updated.length === 1) {
        const u = updated[0];
        const uKw = u.fields?.['KW'] || u.kw || '';
        const uZh = u.fields?.['CN（中文）'] || u.zh_cn || '';
        await createAuditLog({
          kw: uKw,
          chinese: uZh,
          action: '修改词条',
          details: `同步更新词条 [${uKw}] 译文`,
          versionName: verName,
          userId,
          tx
        });
      } else if (updated.length > 1) {
        const isAi = updated.some(u => {
          const m = u.translationsMeta || {};
          return Object.values(m).some(v => v === 'ai');
        });
        const isTm = updated.some(u => {
          const m = u.translationsMeta || {};
          return Object.values(m).some(v => v === 'tm');
        });
        const actionName = isAi ? 'AI批量翻译' : (isTm ? '翻译继承' : '批量更新');
        await createAuditLog({
          action: actionName,
          details: `${actionName}更新了 ${updated.length} 条词条数据`,
          versionName: verName,
          userId,
          tx
        });
      }

      if (deletedIds.length > 0) {
        await createAuditLog({
          action: '批量删除',
          details: `同步删除了 ${deletedIds.length} 条词条`,
          versionName: verName,
          userId,
          tx
        });
      }
    } catch (logErr) {
      console.error('[sync] 记录审计日志异常:', logErr);
    }
  });

  return { updatedRecords: successCount };
}

/**
 * 清除空词条 (无 KW 或无中文)
 */
async function cleanEmptyTerms(tableId, userId) {
  const result = await db.run(`
    DELETE FROM terms
    WHERE version_id = $1
      AND (TRIM(COALESCE(kw, '')) = '' OR TRIM(COALESCE(zh_cn, '')) = '')
      AND (is_locked IS NOT TRUE)
  `, [tableId]);

  const deletedCount = result.changes || 0;

  if (deletedCount > 0) {
    try {
      const ver = await db.queryOne('SELECT version_name FROM versions WHERE id = $1', [tableId]);
      await createAuditLog({
        action: '数据清理',
        details: `清理了数据表中的 ${deletedCount} 条空词条 (无 KW 或无中文)`,
        versionName: ver ? ver.version_name : '',
        userId
      });
    } catch (logErr) {
      console.error('[clean-empty] 记录日志异常:', logErr);
    }
  }

  return { deletedCount };
}

module.exports = {
  batchUpdateCategory,
  batchClearTranslations,
  batchDeleteTerms,
  batchCopyTerms,
  batchGenerateKw,
  batchApproveTerms,
  syncRecords,
  cleanEmptyTerms
};
