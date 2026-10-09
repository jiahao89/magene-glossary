const request = require('supertest');
const app = require('../app.cjs');
const { ensureDbInit } = require('../config/db.cjs');

describe('Health and AI Probe endpoints (/api/health, /api/projects/:projectId/ai-test)', () => {
  let adminToken = '';

  beforeAll(async () => {
    await ensureDbInit();

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wangzhaoyun', password: 'magene123' });
    adminToken = adminRes.body.token;
  });

  it('GET /api/health 应返回系统健康状态、数据库方言与连通性', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('dbType');
    expect(['sqlite', 'postgres']).toContain(res.body.dbType);
    expect(res.body).toHaveProperty('dbConnected');
    expect(res.body.dbConnected).toBe(true);
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('POST /api/projects/:projectId/ai-test 在 local 模式下应返回离线就绪', async () => {
    const res = await request(app)
      .post('/api/projects/proj-default/ai-test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'local' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('local');
    expect(res.body.message).toContain('本地固件词典与规则引擎已就绪');
  });

  it('POST /api/projects/:projectId/ai-test 在未提供 OpenAI Key 时应友好提示', async () => {
    const res = await request(app)
      .post('/api/projects/proj-default/ai-test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'openai', openaiApiKey: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.provider).toBe('openai');
    expect(res.body.error).toContain('未配置 API Key');
  });
});
