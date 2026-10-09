#!/usr/bin/env node
/**
 * scripts/init_pg.cjs
 * 
 * 妙搭 (MiaoDa) / Supabase / 云端 PostgreSQL 数据库一键初始化与健康自检脚本
 * 
 * 用法:
 *   DATABASE_URL="postgres://..." node scripts/init_pg.cjs
 *   或者在 .env 中配置 DATABASE_URL 后运行:
 *   npm run db:init:pg
 */

const fs = require('fs');
const path = require('path');

// 优先加载环境变量
try {
  require('dotenv').config();
} catch {}

const pgUrl = process.env.DATABASE_URL;

if (!pgUrl) {
  console.error('\n❌ [PG-INIT] 未检测到 DATABASE_URL 环境变量！');
  console.log('📌 请按如下方式指定数据库连接串后重试:');
  console.log('   方式 1 (命令行): DATABASE_URL="postgresql://user:password@host:5432/dbname" npm run db:init:pg');
  console.log('   方式 2 (配置文件): 在项目根目录 .env 文件中设置 DATABASE_URL=postgresql://...\n');
  process.exit(1);
}

const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

async function main() {
  console.log('\n🚀 [PG-INIT] 开始连接 PostgreSQL 数据库并执行初始化...');
  
  let pgConfig = {};
  try {
    pgConfig = parse(pgUrl);
  } catch {
    pgConfig = {};
  }

  const isSupabase = pgUrl.includes('supabase');
  const sslConfig = isSupabase ? { rejectUnauthorized: false } : false;

  let pool;
  try {
    pool = new Pool({
      connectionString: pgUrl,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000,
    });
    const verRes = await pool.query('SELECT version(), current_database(), current_user');
    const info = verRes.rows[0];
    console.log(`✅ 数据库连接成功:`);
    console.log(`   - 数据库名: ${info.current_database}`);
    console.log(`   - 登录用户: ${info.current_user}`);
    console.log(`   - 内核版本: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`);
  } catch (err) {
    console.error(`❌ 无法连接到 PostgreSQL 数据库: ${err.message}`);
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, '..', 'db_init_pg.sql');
    if (fs.existsSync(sqlPath)) {
      console.log(`📄 正在读取并执行初始化 DDL 脚本: ${sqlPath}`);
      const ddlSql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(ddlSql);
      console.log('⚡ DDL 执行完毕 (表结构、索引与预置角色已就绪)');
    } else {
      console.warn('⚠️ 未找到 db_init_pg.sql 文件，跳过外置脚本执行');
    }

    // 检查核心表结构
    const tableCheckRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tableCheckRes.rows.map(r => r.table_name);
    console.log(`\n📊 数据库现有公共表列表 (${tables.length} 张):`);
    console.log(`   ${tables.join(', ')}`);

    const requiredTables = ['users', 'projects', 'versions', 'terms', 'term_snapshots', 'logs', 'languages', 'glossary_tables', 'glossary_terms'];
    const missing = requiredTables.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      console.error(`❌ 警告: 缺少关键数据表: ${missing.join(', ')}`);
      process.exit(1);
    }

    // 验证默认项目
    const projRes = await pool.query("SELECT id, name FROM projects WHERE id = 'proj-default'");
    if (projRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO projects (id, name, description)
        VALUES ('proj-default', '迈金智能骑行码表', 'Magene 码表固件词条多人协同翻译项目')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('⚡ 已预置默认项目 (proj-default)');
    } else {
      console.log(`⚡ 默认项目正常存在: [${projRes.rows[0].id}] ${projRes.rows[0].name}`);
    }

    // 验证管理员账户
    const adminRes = await pool.query("SELECT id, username, role FROM users WHERE username = 'admin'");
    if (adminRes.rows.length === 0) {
      const crypto = require('crypto');
      const defaultHash = crypto.createHash('sha256').update('admin123').digest('hex');
      await pool.query(`
        INSERT INTO users (id, username, password_hash, name, role)
        VALUES ('user-admin', 'admin', $1, '系统管理员', 'admin')
        ON CONFLICT (username) DO NOTHING;
      `, [defaultHash]);
      console.log('⚡ 已预置默认管理员账户: admin / admin123');
    } else {
      console.log(`⚡ 管理员账户已存在: ${adminRes.rows[0].username} (${adminRes.rows[0].role})`);
    }

    console.log('\n🎉 [PG-INIT] 妙搭 (MiaoDa) / PostgreSQL 数据库自检与初始化 100% 完成！');
    console.log('👉 可直接在妙搭平台启动: npm start');
  } catch (err) {
    console.error(`\n❌ 初始化过程发生异常: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
