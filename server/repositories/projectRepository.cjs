/**
 * server/repositories/projectRepository.cjs
 * 
 * 项目与成员权限数据访问层 (Repository Layer)
 * 统一屏蔽 SQLite 与 PostgreSQL 的方言差异。
 */

const { db, getDbType } = require('../config/db.cjs');

/**
 * 获取项目基本信息
 */
async function getProjectById(projectId) {
  return await db.queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
}

/**
 * 获取用户在指定项目中的成员角色
 */
async function getProjectMemberRole(projectId, userId) {
  const member = await db.queryOne(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return member?.role || null;
}

/**
 * 获取项目的目标语种列表 (按展示顺序升序)
 */
async function getLanguagesByProject(projectId) {
  return await db.query(
    'SELECT lang_name, lang_code, display_order FROM languages WHERE project_id = $1 ORDER BY display_order ASC',
    [projectId]
  );
}

/**
 * 更新项目的 Dify / AI 配置 JSON
 */
async function updateProjectConfig(projectId, configObj) {
  const dbType = getDbType();
  const configStr = typeof configObj === 'string' ? configObj : JSON.stringify(configObj || {});

  if (dbType === 'postgres') {
    return await db.run(
      'UPDATE projects SET dify_config = $1::jsonb WHERE id = $2',
      [configStr, projectId]
    );
  } else {
    return await db.run(
      'UPDATE projects SET dify_config = $1 WHERE id = $2',
      [configStr, projectId]
    );
  }
}

module.exports = {
  getProjectById,
  getProjectMemberRole,
  getLanguagesByProject,
  updateProjectConfig
};
