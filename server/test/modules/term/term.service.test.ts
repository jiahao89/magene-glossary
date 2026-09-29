import { buildApp } from '../../../src/app.js';
import { initDatabase, schema } from '../../../src/common/database/db.client.js';

async function runTermServiceTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-202】词条核心服务 TermService 与加锁防篡改用例测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();

  // 1. 初始化测试项目与两个版本 (v1: 开板编辑中, v2: 封板归档)
  const [project] = await db
    .insert(schema.projects)
    .values({
      code: 'c606-test',
      name: 'C606 测试项目',
    })
    .returning();

  const [activeVersion] = await db
    .insert(schema.versions)
    .values({
      projectId: project.id,
      versionName: 'v4.2.0-Alpha',
      isSealed: false,
    })
    .returning();

  const [sealedVersion] = await db
    .insert(schema.versions)
    .values({
      projectId: project.id,
      versionName: 'v4.1.0-Release-Freeze',
      isSealed: true,
    })
    .returning();

  console.log(`✔ 测试前置数据初始化就绪: Project=${project.code}, ActiveVersion=${activeVersion.versionName}, SealedVersion=${sealedVersion.versionName}`);

  // 2. 测试创建词条 (带多语种初始翻译)
  console.log('\n▶ 测试 1: POST /api/v2/terms 创建新词条及多语种');
  const createPayload = {
    versionId: activeVersion.id,
    kw: 'KW_POWER_ZONE_ALERT',
    zhCn: '功率目标区间超限报警',
    context: '系统设置/骑行报警',
    ownerComponent: 'SystemUI',
    maxChars: 18,
    sortOrder: 1,
    translations: {
      en: 'Power Zone Alert',
      de: 'Leistungszonen-Alarm',
      fr: 'Alerte Zone de Puissance',
    },
  };

  const resCreate = await app.inject({
    method: 'POST',
    url: '/api/v2/terms',
    payload: createPayload,
  });

  if (resCreate.statusCode !== 201) {
    throw new Error(`Create term failed with code ${resCreate.statusCode}: ${resCreate.payload}`);
  }
  const createdTerm = JSON.parse(resCreate.payload);
  console.log(`✔ 词条创建成功: ID=${createdTerm.id}, KW=${createdTerm.kw}, maxChars=${createdTerm.maxChars}`);

  // 验证关联子表
  const resDetail = await app.inject({
    method: 'GET',
    url: `/api/v2/terms/${createdTerm.id}`,
  });
  const detailJson = JSON.parse(resDetail.payload);
  if (detailJson.translations.en !== 'Power Zone Alert' || detailJson.translations.de !== 'Leistungszonen-Alarm') {
    throw new Error('Translations mismatch in created term');
  }
  console.log(`✔ 关联查询验证: en="${detailJson.translations.en}", de="${detailJson.translations.de}"`);

  // 3. 测试 KW 唯一性校验 (409 Conflict)
  console.log('\n▶ 测试 2: 同一版本下插入重复 KW (唯一性防护)');
  const resDuplicate = await app.inject({
    method: 'POST',
    url: '/api/v2/terms',
    payload: createPayload, // 相同 KW
  });
  if (resDuplicate.statusCode !== 409) {
    throw new Error(`Expected 409 Conflict, got ${resDuplicate.statusCode}`);
  }
  const dupJson = JSON.parse(resDuplicate.payload);
  console.log(`✔ 成功拦截重复 KW: code=${dupJson.code}, message="${dupJson.message}"`);

  // 4. 测试单语种更新原子性
  console.log('\n▶ 测试 3: PUT /api/v2/terms/:id/translations/:lang 单语种原子更新');
  const resUpdateDe = await app.inject({
    method: 'PUT',
    url: `/api/v2/terms/${createdTerm.id}/translations/de`,
    payload: {
      translationText: 'Leistungs-Alarm (Kurz)',
      sourceType: 'ai',
    },
  });
  if (resUpdateDe.statusCode !== 200) {
    throw new Error(`Update translation failed: ${resUpdateDe.payload}`);
  }
  const verifyDe = await app.inject({ method: 'GET', url: `/api/v2/terms/${createdTerm.id}` });
  const verifyDeJson = JSON.parse(verifyDe.payload);
  if (verifyDeJson.translations.de !== 'Leistungs-Alarm (Kurz)' || verifyDeJson.translations.en !== 'Power Zone Alert') {
    throw new Error('Atomicity failed: other languages were affected');
  }
  console.log(`✔ 德语成功原子更新为 "${verifyDeJson.translations.de}"，英语及其他语种未受任何影响`);

  // 5. 测试封板版本只读防御
  console.log('\n▶ 测试 4: 封板版本 (is_sealed=true) 强一致性只读拦截');
  const resSealedCreate = await app.inject({
    method: 'POST',
    url: '/api/v2/terms',
    payload: {
      ...createPayload,
      versionId: sealedVersion.id,
      kw: 'KW_NEW_IN_SEALED',
    },
  });
  if (resSealedCreate.statusCode !== 403) {
    throw new Error(`Expected 403 for sealed version, got ${resSealedCreate.statusCode}`);
  }
  const sealedJson = JSON.parse(resSealedCreate.payload);
  if (sealedJson.code !== 'SEALED_VERSION') {
    throw new Error(`Expected SEALED_VERSION code, got ${sealedJson.code}`);
  }
  console.log(`✔ 成功拦截向已封板版本的写入请求: code=${sealedJson.code}, message="${sealedJson.message}"`);

  // 6. 测试词条人工加锁防御 (Lock Invariant)
  console.log('\n▶ 测试 5: 词条加锁 (is_locked=true) 防篡改拦截');
  // 先将词条设为加锁
  await app.inject({
    method: 'PATCH',
    url: `/api/v2/terms/${createdTerm.id}`,
    payload: { isLocked: true },
  });

  // 尝试覆写加锁词条的中文原文
  const resLockEdit = await app.inject({
    method: 'PATCH',
    url: `/api/v2/terms/${createdTerm.id}`,
    payload: { zhCn: '试图篡改加锁词条中文' },
  });
  if (resLockEdit.statusCode !== 403) {
    throw new Error(`Expected 403 for locked term edit, got ${resLockEdit.statusCode}`);
  }
  console.log(`✔ 成功拦截针对已加锁词条的元数据修改: ${(JSON.parse(resLockEdit.payload)).message}`);

  // 尝试覆写加锁词条的翻译
  const resLockTrans = await app.inject({
    method: 'PUT',
    url: `/api/v2/terms/${createdTerm.id}/translations/en`,
    payload: { translationText: 'Hacked Translation' },
  });
  if (resLockTrans.statusCode !== 403) {
    throw new Error(`Expected 403 for locked term translation edit, got ${resLockTrans.statusCode}`);
  }
  console.log(`✔ 成功拦截针对已加锁词条的译文覆写: ${(JSON.parse(resLockTrans.payload)).message}`);

  // 解锁词条后验证可再次编辑
  await app.inject({
    method: 'PATCH',
    url: `/api/v2/terms/${createdTerm.id}`,
    payload: { isLocked: false },
  });
  const resUnlockEdit = await app.inject({
    method: 'PATCH',
    url: `/api/v2/terms/${createdTerm.id}`,
    payload: { maxChars: 20 },
  });
  if (resUnlockEdit.statusCode !== 200) {
    throw new Error('Failed to update term after unlock');
  }
  console.log('✔ 人工解锁后允许正常变更配置 (maxChars=20)');

  // 7. 测试批量词条分页与搜索检索
  console.log('\n▶ 测试 6: GET /api/v2/versions/:versionId/terms 检索与分页');
  // 插入第二条词条
  await app.inject({
    method: 'POST',
    url: '/api/v2/terms',
    payload: {
      versionId: activeVersion.id,
      kw: 'KW_RADAR_WARNING',
      zhCn: '后方车辆接近雷达预警',
      ownerComponent: 'Radar',
      maxChars: 16,
    },
  });

  const resList = await app.inject({
    method: 'GET',
    url: `/api/v2/versions/${activeVersion.id}/terms?keyword=RADAR`,
  });
  const listJson = JSON.parse(resList.payload);
  if (listJson.total !== 1 || listJson.items[0].kw !== 'KW_RADAR_WARNING') {
    throw new Error(`Search failed: expected 1 result for RADAR, got ${listJson.total}`);
  }
  console.log(`✔ 关键词模糊搜索通过: 命中条目=${listJson.items[0].kw}, 中文="${listJson.items[0].zhCn}"`);

  await app.close();
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('   🎉 【TASK-202】词条核心服务与加锁防篡改所有测试项 100% 验收通过！');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runTermServiceTests().catch((err) => {
  console.error('❌ TASK-202 验证失败:', err);
  process.exit(1);
});
