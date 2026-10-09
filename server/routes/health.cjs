const express = require('express');
const router = express.Router();
const { getDbType, getDbInitError, getPgError, getPgDebug } = require('../config/db.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

router.get('/health', async (_req, res) => {
  const dbInitError = getDbInitError();
  const pgErr = getPgError();
  const dbType = getDbType();

  if (dbInitError || pgErr) {
    console.error('🩺 健康检查发现数据库异常:', dbInitError ? dbInitError.message : '', pgErr || '');
  }

  let dbConnected = false;
  try {
    const { db } = require('../config/db.cjs');
    const row = await db.queryOne('SELECT 1 as alive');
    if (row && (row.alive === 1 || row.alive === '1')) {
      dbConnected = true;
    }
  } catch {
    dbConnected = false;
  }

  res.json({
    status: (dbInitError || !dbConnected) ? 'degraded' : 'ok',
    dbType,
    dbConnected,
    hasPgUrl: Boolean(process.env.DATABASE_URL),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

router.get('/debug-status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  res.json({
    dbType: getDbType(),
    port: process.env.PORT || 3001,
    hasPgUrl: !!process.env.DATABASE_URL,
    pgError: getPgError(),
    pgDebug: getPgDebug()
  });
});

module.exports = router;
