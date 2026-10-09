const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db, getDbType } = require('../config/db.cjs');
const { authenticateToken, requireTermOwnership, requireVersionOwnership } = require('../middleware/auth.cjs');
const { writeLimiter } = require('../middleware/rateLimiters.cjs');
const { parseJsonField } = require('../utils/jsonFields.cjs');
const { createAuditLog } = require('../services/auditLogger.cjs');
const termRepo = require('../repositories/termRepository.cjs');
const termBatchService = require('../services/termBatchService.cjs');
const termExcelService = require('../services/termExcelService.cjs');

// 批量 termIds 全集归属校验 (代理到 termRepository)
async function requireAllTermsOwnership(userId, termIds, userRole) {
  return await termRepo.verifyTermsOwnership(userId, termIds, userRole);
}

// GET /api/tables/:tableId/records - 读取特定版本下的所有词条数据 (分页)
router.get('/tables/:tableId/records', authenticateToken, async (req, res) => {
  const { tableId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const statusFilter = req.query.status || '';
  const untranslated = req.query.untranslated === 'true' || req.query.untranslated === '1';

  try {
    const result = await termRepo.getTermsByTable(tableId, {
      page,
      pageSize,
      statusFilter,
      untranslated,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    });
    res.json(result);
  } catch (err) {
    console.error('获取词条数据失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});



// GET /api/terms/by-kw-version - 按 KW 和版本名查找词条及其快照
router.get('/terms/by-kw-version', authenticateToken, async (req, res) => {
  const { kw, versionName, projectId } = req.query;
  if (!kw || !versionName) {
    return res.status(400).json({ error: '缺少 kw 或 versionName 参数' });
  }
  try {
    const effectiveProjectId = projectId || 'proj-default';
    // 项目成员校验: 非成员不能读取该项目词条 (管理员放行)
    if (req.user.role !== 'admin') {
      const member = await db.queryOne(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [effectiveProjectId, req.user.id]
      );
      if (!member) {
        return res.status(403).json({ error: 'FORBIDDEN', message: '您无权访问此项目。' });
      }
    }
    const term = await db.queryOne(
      `SELECT t.id, t.kw, t.zh_cn, t.is_locked FROM terms t
       JOIN versions v ON t.version_id = v.id
       WHERE t.kw = $1 AND v.version_name = $2 AND v.project_id = $3`,
      [kw, versionName, effectiveProjectId]
    );
    if (!term) {
      return res.status(404).json({ error: '找不到对应词条，可能已被删除' });
    }
    const snapshots = await db.query(
      `SELECT s.id, s.kw, s.zh_cn, s.translations, s.created_at, s.created_by, u.username as creator_name
       FROM term_snapshots s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.term_id = $1
       ORDER BY s.created_at DESC`,
      [term.id]
    );
    const formatted = snapshots.map(s => {
      const trans = parseJsonField(s.translations);
      return {
        id: s.id, kw: s.kw, zh_cn: s.zh_cn,
        translations: trans, createdAt: s.created_at,
        creatorName: s.creator_name || '系统用户'
      };
    });
    res.json({ termId: term.id, isLocked: !!(term.is_locked === 1 || term.is_locked === true), snapshots: formatted });
  } catch (err) {
    console.error('按 KW 查找词条失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/terms/:termId - 带乐观锁并发校验的词条更新接口
router.put('/terms/:termId', authenticateToken, async (req, res) => {
  const { termId } = req.params;
  const { kw, context, owner, zh_cn, translations, translationsMeta, oldUpdatedAt } = req.body;
  const dbType = getDbType();

  if (!oldUpdatedAt) {
    return res.status(400).json({ error: '必须包含旧修改时间戳 (oldUpdatedAt) 以进行并发校验' });
  }

  try {
    const termMembership = await db.queryOne(
      'SELECT pm.role FROM terms t JOIN versions v ON t.version_id = v.id JOIN project_members pm ON v.project_id = pm.project_id WHERE t.id = $1 AND pm.user_id = $2',
      [termId, req.user.id]
    );
    if (termMembership && termMembership.role === 'viewer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '只读审核人员无权修改词条。' });
    }
    if (!(await requireTermOwnership(req.user.id, termId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权修改此词条。' });
    }
    const term = await termRepo.getTermById(termId);
    if (!term) {
      return res.status(404).json({ error: '词条不存在' });
    }

    let finalKw = (kw !== undefined ? kw : term.kw).trim();
    if (!finalKw) {
      finalKw = `__EMPTY_KW_${crypto.randomUUID()}__`;
    }

    if (finalKw && !finalKw.startsWith('__EMPTY_KW_') && finalKw !== term.kw) {
      const duplicate = await termRepo.findDuplicateKw(term.version_id, finalKw, termId);
      if (duplicate) {
        return res.status(409).json({
          error: 'DUPLICATE_KW',
          message: `无法保存！该 KW [${finalKw}] 已被当前表内其他词条占用 (中文: “${duplicate.zh_cn}”)。`
        });
      }
    }

    const finalContext = context !== undefined ? context : (term.context || '');
    const finalOwner = owner !== undefined ? owner : (term.owner || '');
    const finalZhCn = zh_cn !== undefined ? zh_cn : term.zh_cn;

    let updatedTrans = '';
    const inputTrans = translations !== undefined ? translations : term.translations;
    if (typeof inputTrans === 'string') {
      try {
        const parsed = JSON.parse(inputTrans);
        if (typeof parsed === 'string') {
          updatedTrans = parsed;
        } else {
          updatedTrans = inputTrans;
        }
      } catch {
        updatedTrans = '{}';
      }
    } else {
      updatedTrans = JSON.stringify(inputTrans || {});
    }

    const updateRes = await termRepo.updateTermWithOptimisticLock(termId, {
      finalKw,
      finalContext,
      finalOwner,
      finalZhCn,
      updatedTrans,
      translationsMeta,
      oldUpdatedAt
    }, req.user.id, req.user.role);

    if (updateRes.notFound) {
      return res.status(404).json({ error: '词条不存在' });
    }
    if (updateRes.isLocked) {
      return res.status(403).json({ error: 'LOCKED', message: '该词条目前已被锁定，无法修改。如需变更请联系管理员解锁！' });
    }
    if (updateRes.conflict) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: '该词条已被其他人修改，请刷新后重试。' });
    }

    const newTerm = updateRes.term;

    // 记录审计修改日志
    try {
      const ver = await db.queryOne('SELECT version_name FROM versions WHERE id = $1', [term.version_id]);
      const oldTrans = parseJsonField(term.translations);
      const newTrans = parseJsonField(newTerm.translations);
      const changedLangs = Object.keys({ ...oldTrans, ...newTrans }).filter(k => (oldTrans[k] || '') !== (newTrans[k] || ''));
      const isZhChanged = term.zh_cn !== finalZhCn;
      const isKwChanged = term.kw !== finalKw;

      let detailsStr = '';
      if (changedLangs.length === 1) {
        const lang = changedLangs[0];
        detailsStr = JSON.stringify({
          field: lang,
          oldVal: oldTrans[lang] || '',
          newVal: newTrans[lang] || ''
        });
      } else if (changedLangs.length > 1) {
        detailsStr = `修改了 ${changedLangs.length} 个语种译文 (${changedLangs.join(', ')})`;
      } else if (isZhChanged) {
        detailsStr = `修改中文源文: [${term.zh_cn}] -> [${finalZhCn}]`;
      } else if (isKwChanged) {
        detailsStr = `修改 KW: [${term.kw}] -> [${finalKw}]`;
      } else {
        detailsStr = `修改词条属性 (页面: ${finalContext}, 负责人: ${finalOwner})`;
      }

      await createAuditLog({
        kw: finalKw,
        chinese: finalZhCn,
        action: '修改词条',
        details: detailsStr,
        versionName: ver?.version_name || '',
        userId: req.user.id
      });
    } catch (logErr) {
      console.error('[terms.put] 记录修改日志异常:', logErr);
    }

    res.json(newTerm);
  } catch (err) {
    console.error('修改词条失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// PUT /api/terms/:termId/lock - 锁定/解锁词条接口
router.put('/terms/:termId/lock', authenticateToken, async (req, res) => {
  const { termId } = req.params;
  const { isLocked } = req.body;
  const dbType = getDbType();

  try {
    const memberRoleRes = await db.queryOne(
      'SELECT pm.role FROM terms t JOIN versions v ON t.version_id = v.id JOIN project_members pm ON v.project_id = pm.project_id WHERE t.id = $1 AND pm.user_id = $2',
      [termId, req.user.id]
    );
    const projectRole = memberRoleRes ? memberRoleRes.role : null;
    if (req.user.role !== 'admin' && projectRole !== 'owner') {
      return res.status(403).json({ error: 'FORBIDDEN', message: '只有项目所有者或系统管理员可以锁定/解锁词条。' });
    }
    const term = await db.queryOne('SELECT * FROM terms WHERE id = $1', [termId]);
    if (!term) {
      return res.status(404).json({ error: '词条不存在' });
    }

    const lockValue = isLocked ? 1 : 0;

    if (dbType === 'postgres') {
      await db.run(
        `UPDATE terms SET is_locked = $1, locked_by = $2, locked_at = NOW() WHERE id = $3`,
        [lockValue, isLocked ? req.user.id : null, termId]
      );
    } else {
      await db.run(
        `UPDATE terms SET is_locked = $1, locked_by = $2, locked_at = datetime('now') WHERE id = $3`,
        [lockValue, isLocked ? req.user.id : null, termId]
      );
    }

    const actionName = isLocked ? '锁定词条' : '解锁词条';
    const ver = await db.queryOne('SELECT version_name FROM versions WHERE id = $1', [term.version_id]);
    const verName = ver ? ver.version_name : '未知版本';

    const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
    if (dbType === 'postgres') {
      await db.run(
        `INSERT INTO ${logsTable} (timestamp, kw, chinese, action, details, version_name, user_id)
         VALUES (NOW(), $1, $2, $3, $4, $5, $6)`,
        [term.kw, term.zh_cn, actionName, `${req.user.name} 对词条进行了${actionName}`, verName, req.user.id]
      );
    } else {
      await db.run(
        `INSERT INTO ${logsTable} (timestamp, kw, chinese, action, details, version_name, user_id)
         VALUES (datetime('now'), $1, $2, $3, $4, $5, $6)`,
        [term.kw, term.zh_cn, actionName, `${req.user.name} 对词条进行了${actionName}`, verName, req.user.id]
      );
    }

    res.json({ id: termId, is_locked: lockValue, message: `${actionName}成功！` });
  } catch (err) {
    console.error('切换锁定状态失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// GET /api/versions/:versionId/terms/:kw/references - 跨版本翻译参考
router.get('/versions/:versionId/terms/:kw/references', authenticateToken, async (req, res) => {
  const { versionId, kw } = req.params;

  try {
    const currentVer = await db.queryOne('SELECT project_id FROM versions WHERE id = $1', [versionId]);
    if (!currentVer) {
      return res.status(404).json({ error: '版本不存在' });
    }
    const projectId = currentVer.project_id;

    // 项目成员校验: 通过 version_id 反查 project_id 后验证成员身份 (管理员放行)
    if (req.user.role !== 'admin') {
      const member = await db.queryOne(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, req.user.id]
      );
      if (!member) {
        return res.status(403).json({ error: 'FORBIDDEN', message: '您无权访问此项目。' });
      }
    }

    const rows = await db.query(
      `SELECT v.version_name, t.zh_cn, t.translations, t.owner, t.updated_at
       FROM terms t
       JOIN versions v ON t.version_id = v.id
       WHERE v.project_id = $1 AND t.kw = $2 AND v.id <> $3
       ORDER BY t.updated_at DESC`,
      [projectId, kw, versionId]
    );

    const results = rows.map(r => ({
      versionName: r.version_name,
      zh_cn: r.zh_cn,
      translations: typeof r.translations === 'string' ? JSON.parse(r.translations) : (r.translations || {}),
      owner: r.owner,
      updatedAt: r.updated_at
    }));

    res.json(results);
  } catch (err) {
    console.error('获取跨版本翻译参考失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// GET /api/terms/:termId/snapshots - 获取单个词条的翻译历史快照列表
router.get('/terms/:termId/snapshots', authenticateToken, async (req, res) => {
  const { termId } = req.params;
  try {
    const snapshots = await db.query(
      `SELECT s.*, u.username as creator_name 
       FROM term_snapshots s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.term_id = $1 
       ORDER BY s.created_at DESC`,
      [termId]
    );

    const formatted = snapshots.map(s => {
      let trans = {};
      try {
        trans = typeof s.translations === 'string' ? JSON.parse(s.translations) : s.translations;
      } catch { }
      return {
        id: s.id,
        termId: s.term_id,
        versionId: s.version_id,
        kw: s.kw,
        zh_cn: s.zh_cn,
        translations: trans,
        createdAt: s.created_at,
        creatorName: s.creator_name || '系统用户'
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('获取词条快照失败:', err);
    res.status(500).json({ error: '服务器内部错误，获取历史记录失败。' });
  }
});

// POST /api/terms/:termId/rollback - 一键回退到指定快照的翻译
router.post('/terms/:termId/rollback', authenticateToken, writeLimiter, async (req, res) => {
  const { termId } = req.params;
  const { snapshotId } = req.body;
  const dbType = getDbType();

  if (!snapshotId) {
    return res.status(400).json({ error: '缺少快照ID (snapshotId)' });
  }

  try {
    if (!(await requireTermOwnership(req.user.id, termId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权回退此词条。' });
    }
    const term = await db.queryOne('SELECT * FROM terms WHERE id = $1', [termId]);
    if (!term) {
      return res.status(404).json({ error: '词条不存在' });
    }

    if (term.is_locked === 1 || term.is_locked === true) {
      return res.status(403).json({ error: 'LOCKED', message: '此词条已被锁定，如需回退请联系管理员解锁！' });
    }

    const snapshot = await db.queryOne('SELECT * FROM term_snapshots WHERE id = $1 AND term_id = $2', [snapshotId, termId]);
    if (!snapshot) {
      return res.status(404).json({ error: '找不到指定的词条历史快照' });
    }

    const newSnapshotId = crypto.randomUUID();
    const currentTransStr = typeof term.translations === 'string' ? term.translations : JSON.stringify(term.translations || {});

    await db.transaction(async (tx) => {
      if (dbType === 'postgres') {
        await tx.run(
          `INSERT INTO term_snapshots (id, term_id, version_id, kw, zh_cn, translations, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), $7)`,
          [newSnapshotId, termId, term.version_id, term.kw, term.zh_cn, currentTransStr, req.user.id]
        );
      } else {
        await tx.run(
          `INSERT INTO term_snapshots (id, term_id, version_id, kw, zh_cn, translations, created_at, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, datetime('now'), $7)`,
          [newSnapshotId, termId, term.version_id, term.kw, term.zh_cn, currentTransStr, req.user.id]
        );
      }

      let nextStatus = 'PENDING_REVIEW';
      if (req.user.role === 'admin') {
        nextStatus = 'APPROVED';
      }

      const snapTransStr = typeof snapshot.translations === 'string' ? snapshot.translations : JSON.stringify(snapshot.translations || {});

      if (dbType === 'postgres') {
        await tx.run(
          `UPDATE terms 
           SET kw = $1, zh_cn = $2, translations = $3::jsonb, status = $4, reject_reason = NULL, updated_at = NOW(), updated_by = $5
           WHERE id = $6`,
          [snapshot.kw, snapshot.zh_cn, snapTransStr, nextStatus, req.user.id, termId]
        );
      } else {
        await tx.run(
          `UPDATE terms 
           SET kw = $1, zh_cn = $2, translations = $3, status = $4, reject_reason = NULL, updated_at = datetime('now'), updated_by = $5
           WHERE id = $6`,
          [snapshot.kw, snapshot.zh_cn, snapTransStr, nextStatus, req.user.id, termId]
        );
      }

      const logsTable = dbType === 'postgres' ? 'logs' : 'logs_v2';
      const versionObj = await tx.queryOne('SELECT version_name FROM versions WHERE id = $1', [term.version_id]);
      const details = `将词条 [${term.kw}] 的内容回退到了 [${snapshot.created_at}] 的历史版本。`;

      if (dbType === 'postgres') {
        await tx.run(
          `INSERT INTO ${logsTable} (timestamp, kw, chinese, action, details, version_name, user_id)
           VALUES (NOW(), $1, $2, '历史回退', $3, $4, $5)`,
          [snapshot.kw, snapshot.zh_cn, details, versionObj ? versionObj.version_name : '', req.user.id]
        );
      } else {
        await tx.run(
          `INSERT INTO ${logsTable} (timestamp, kw, chinese, action, details, version_name, user_id)
           VALUES (datetime('now'), $1, $2, '历史回退', $3, $4, $5)`,
          [snapshot.kw, snapshot.zh_cn, details, versionObj ? versionObj.version_name : '', req.user.id]
        );
      }
    });

    res.json({ message: '成功回退到指定历史快照！', kw: snapshot.kw });
  } catch (err) {
    console.error('词条快照回退失败:', err);
    res.status(500).json({ error: '服务器内部错误，回退操作失败。' });
  }
});

// POST /api/terms/batch-update - 批量设置词条分类字段
router.post('/terms/batch-update', authenticateToken, async (req, res) => {
  const { termIds, updates } = req.body;

  if (!Array.isArray(termIds) || termIds.length === 0 || !updates) {
    return res.status(400).json({ error: '必须包含 termIds 数组和 updates 更新对象' });
  }

  try {
    if (!(await requireAllTermsOwnership(req.user.id, termIds, req.user.role))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权修改此项目的词条。' });
    }

    const { successCount, lockedCount } = await termBatchService.batchUpdateCategory(termIds, updates, req.user.id);

    res.json({
      message: `成功批量更新分类字段！已更新: ${successCount} 条，跳过锁定: ${lockedCount} 条。`,
      successCount,
      lockedCount
    });
  } catch (err) {
    console.error('批量修改分类字段失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// POST /api/terms/batch-clear-translations - 批量清空词条翻译 (保留中文, 删除其他所有语种翻译)
router.post('/terms/batch-clear-translations', authenticateToken, writeLimiter, async (req, res) => {
  const { termIds } = req.body;

  if (!Array.isArray(termIds) || termIds.length === 0) {
    return res.status(400).json({ error: '必须包含 termIds 数组' });
  }

  try {
    if (!(await requireAllTermsOwnership(req.user.id, termIds, req.user.role))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权修改此项目的词条。' });
    }

    const { successCount, lockedCount } = await termBatchService.batchClearTranslations(termIds, req.user.id);

    res.json({
      message: `成功清空 ${successCount} 条词条的翻译（保留中文）！${lockedCount > 0 ? `已自动跳过 ${lockedCount} 条锁定词条。` : ''}`,
      successCount,
      lockedCount
    });
  } catch (err) {
    console.error('批量清空翻译失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// POST /api/terms/batch-delete - 批量软删除词条 (走回收站, 30 天可恢复)
router.post('/terms/batch-delete', authenticateToken, writeLimiter, async (req, res) => {
  const { termIds } = req.body;

  if (!Array.isArray(termIds) || termIds.length === 0) {
    return res.status(400).json({ error: '必须包含 termIds 数组' });
  }

  if (termIds.length > 200) {
    return res.status(400).json({ error: '单次最多删除 200 条, 请分批操作' });
  }

  try {
    if (!(await requireAllTermsOwnership(req.user.id, termIds, req.user.role))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权删除此项目的词条。' });
    }

    const { deletedCount, lockedSkipped, skippedLockedIds } = await termBatchService.batchDeleteTerms(termIds, req.user.id);

    res.json({
      message: `成功删除 ${deletedCount} 条词条 (送入回收站, 30 天内可恢复)`,
      deletedCount,
      lockedSkipped,
      skippedLockedIds,
    });
  } catch (err) {
    console.error('批量删除词条失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// POST /api/terms/batch-copy - 批量复制词条到其他版本
router.post('/terms/batch-copy', authenticateToken, async (req, res) => {
  const { termIds, targetVersionId, duplicateStrategy } = req.body;

  if (!Array.isArray(termIds) || termIds.length === 0 || !targetVersionId || !duplicateStrategy) {
    return res.status(400).json({ error: '必须包含 termIds 数组、targetVersionId 和 duplicateStrategy 策略' });
  }

  const validStrategies = ['overwrite', 'skip'];
  if (!validStrategies.includes(duplicateStrategy)) {
    return res.status(400).json({ error: 'INVALID_STRATEGY', message: '无效的复制策略。' });
  }

  try {
    if (!(await requireAllTermsOwnership(req.user.id, termIds, req.user.role))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权复制这些词条。' });
    }

    const targetVer = await db.queryOne('SELECT version_name, project_id FROM versions WHERE id = $1', [targetVersionId]);
    if (!targetVer) {
      return res.status(404).json({ error: '目标版本不存在' });
    }

    if (req.user.role !== 'admin') {
      const targetMember = await db.queryOne(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [targetVer.project_id, req.user.id]
      );
      if (!targetMember || targetMember.role === 'viewer') {
        return res.status(403).json({ error: 'FORBIDDEN', message: '只读审核人员无权向该目标版本写入词条。' });
      }
    }

    const result = await termBatchService.batchCopyTerms(termIds, targetVersionId, duplicateStrategy, req.user.id);

    res.json({
      message: `成功复制词条到版本 [${result.targetVersionName}]！`,
      addedCount: result.addedCount,
      overwrittenCount: result.overwrittenCount,
      skippedCount: result.skippedCount
    });
  } catch (err) {
    console.error('批量复制到其他版本失败:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// POST /api/tables/:tableId/batch-generate-kw - 批量生成并更新词条 KW
router.post('/tables/:tableId/batch-generate-kw', authenticateToken, async (req, res) => {
  const { tableId } = req.params;
  const { termIds, overwrite = false, updates = [] } = req.body;

  try {
    const version = await db.queryOne('SELECT id, version_name, project_id FROM versions WHERE id = $1', [tableId]);
    if (!version) {
      return res.status(404).json({ error: '数据表版本不存在' });
    }

    const projectId = version.project_id || 'proj-default';
    if (req.user.role !== 'admin') {
      const member = await db.queryOne(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, req.user.id]
      );
      if (!member || member.role === 'viewer') {
        return res.status(403).json({ error: 'FORBIDDEN', message: '只读审核人员无权修改或生成 KW。' });
      }
    }

    const result = await termBatchService.batchGenerateKw(tableId, { termIds, overwrite, updates }, req.user.id);

    res.json({
      message: `成功为 ${result.updatedCount} 条词条生成并更新 KW 键名！`,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      modifiedTerms: result.modifiedTerms
    });
  } catch (err) {
    console.error('批量生成 KW 失败:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: '批量生成 KW 失败: ' + err.message });
  }
});

// POST /api/terms/batch-approve - 批量审核词条工作流 API
router.post('/terms/batch-approve', authenticateToken, async (req, res) => {
  const { termIds, status, rejectReason } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: '只有管理员有权审核词条！' });
  }

  if (Array.isArray(termIds) && termIds.length > 0 && !(await requireAllTermsOwnership(req.user.id, termIds, req.user.role))) {
    return res.status(403).json({ error: 'FORBIDDEN', message: '您无权审核此项目的词条。' });
  }

  if (!Array.isArray(termIds) || termIds.length === 0 || !status) {
    return res.status(400).json({ error: '必须包含有效的 termIds 数组和目标审核 status 字段！' });
  }

  const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '非法审核状态！' });
  }

  try {
    await termBatchService.batchApproveTerms(termIds, status, rejectReason, req.user.id);
    res.json({ message: `批量操作成功！已将选中词条设置为 [${status}] 状态。` });
  } catch (err) {
    console.error('批量审核词条失败:', err);
    res.status(500).json({ error: '服务器内部错误，批量审核失败。' });
  }
});

// POST /api/tables/:tableId/sync - Bulk Insert/Update/Delete records for a version
router.post('/tables/:tableId/sync', authenticateToken, writeLimiter, async (req, res) => {
  const { tableId } = req.params;
  const { added = [], updated = [], deletedIds = [], reorder = [] } = req.body;

  try {
    if (!(await requireVersionOwnership(req.user.id, tableId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权修改此数据表。' });
    }

    if (req.user.role !== 'admin') {
      const verMembership = await db.queryOne(
        'SELECT pm.role FROM versions v JOIN project_members pm ON v.project_id = pm.project_id WHERE v.id = $1 AND pm.user_id = $2',
        [tableId, req.user.id]
      );
      if (!verMembership || verMembership.role === 'viewer') {
        return res.status(403).json({ error: 'FORBIDDEN', message: '只读审核人员无权修改此数据表。' });
      }
    }

    const { updatedRecords } = await termBatchService.syncRecords(tableId, { added, updated, deletedIds, reorder }, req.user.id);
    res.json({ message: '同步成功', updatedRecords });
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({ error: `批量同步数据失败: ${error.message || '未知错误'}` });
  }
});

// DELETE /api/tables/:tableId/clean-empty - 删除空词条 (无KW或无中文)
router.delete('/tables/:tableId/clean-empty', authenticateToken, writeLimiter, async (req, res) => {
  const { tableId } = req.params;

  try {
    if (!(await requireVersionOwnership(req.user.id, tableId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权修改此数据表。' });
    }

    if (req.user.role !== 'admin') {
      const verMembership = await db.queryOne(
        'SELECT pm.role FROM versions v JOIN project_members pm ON v.project_id = pm.project_id WHERE v.id = $1 AND pm.user_id = $2',
        [tableId, req.user.id]
      );
      if (!verMembership || verMembership.role === 'viewer') {
        return res.status(403).json({ error: 'FORBIDDEN', message: '只读审核人员无权清理词条。' });
      }
    }

    const { deletedCount } = await termBatchService.cleanEmptyTerms(tableId, req.user.id);
    res.json({ message: `清理完毕，共删除 ${deletedCount} 条空词条`, deletedCount });
  } catch (error) {
    console.error('清理空词条失败:', error);
    res.status(500).json({ error: '服务器内部错误，清理失败。' });
  }
});

// ALL (GET/POST) /api/tables/:tableId/export-xls - 导出 Excel (.xlsx) 表格数据 (支持高亮标记)
router.all('/tables/:tableId/export-xls', authenticateToken, async (req, res) => {
  const { tableId } = req.params;
  const highlightIdsList = req.body?.highlightIds || (req.query?.highlightIds ? req.query.highlightIds.split(',') : []);
  const modifiedCells = req.body?.modifiedCells || {};

  try {
    if (!(await requireVersionOwnership(req.user.id, tableId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权导出此数据表。' });
    }

    const { buffer, fileName } = await termExcelService.buildExcelExport(tableId, {
      highlightIds: highlightIdsList,
      modifiedCells
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error('导出 Excel 表格失败:', error);
    res.status(500).json({ error: '服务器内部错误，导出失败。' });
  }
});

// ALL (GET/POST) /api/tables/:tableId/export-csv - 导出 CSV 表格数据 (删除“所在页面”和“字号类别”列)
router.all('/tables/:tableId/export-csv', authenticateToken, async (req, res) => {
  const { tableId } = req.params;

  try {
    if (!(await requireVersionOwnership(req.user.id, tableId))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '您无权导出此数据表。' });
    }

    const { csvContent, fileName } = await termExcelService.buildCsvExport(tableId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    res.send(csvContent);
  } catch (error) {
    console.error('导出 CSV 表格失败:', error);
    res.status(500).json({ error: '服务器内部错误，导出 CSV 失败。' });
  }
});

module.exports = router;

