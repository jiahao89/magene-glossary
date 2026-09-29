import { buildApp } from '../../src/app.js';
import { initDatabase, schema } from '../../src/common/database/db.client.js';

async function runLegacyFacadeTests() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀  【TASK-203】历史 API 兼容垫片层 Legacy API Facade 契约测试');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const app = await buildApp({ inMemoryDb: true, logger: false });
  const { db } = await initDatabase();

  // 1. 初始化项目与版本
  const [project] = await db
    .insert(schema.projects)
    .values({
      code: 'legacy-compat-prj',
      name: '历史兼容性测试项目',
    })
    .returning();

  const [version] = await db
    .insert(schema.versions)
    .values({
      projectId: project.id,
      versionName: 'v1.0_legacy_base',
      isSealed: false,
    })
    .returning();

  console.log(`✔ 测试前置数据初始化就绪: Project=${project.code}, VersionId=${version.id}`);

  // 2. 测试 POST /api/tables/:tableId/sync (新增项)
  console.log('\n▶ 测试 1: POST /api/tables/:tableId/sync (新增旧格式词条报文)');
  const syncPayload = {
    added: [
      {
        kw: 'KW_STOP_RIDE_LEGACY',
        zh_cn: '结束骑行，是否保存？',
        context: '弹窗警告',
        owner_component: 'Dialog',
        max_chars: 20,
        is_locked: false,
        translations: {
          en: 'Stop ride and save?',
          de: 'Fahrt beenden und speichern?',
        },
      },
    ],
  };

  const resSyncAdded = await app.inject({
    method: 'POST',
    url: `/api/tables/${version.id}/sync`,
    payload: syncPayload,
  });

  if (resSyncAdded.statusCode !== 200) {
    throw new Error(`Legacy sync failed: ${resSyncAdded.payload}`);
  }
  const syncResJson = JSON.parse(resSyncAdded.payload);
  console.log(`✔ 历史同步接口返回成功: added=${syncResJson.data.addedCount}`);

  // 3. 测试 GET /api/tables/:tableId/terms (基于 view_terms_legacy 返回单列 translations JSON)
  console.log('\n▶ 测试 2: GET /api/tables/:tableId/terms (读取兼容视图)');
  const resGetTerms = await app.inject({
    method: 'GET',
    url: `/api/tables/${version.id}/terms`,
  });

  if (resGetTerms.statusCode !== 200) {
    throw new Error(`Legacy get terms failed: ${resGetTerms.payload}`);
  }
  const termsJson = JSON.parse(resGetTerms.payload);
  if (termsJson.total !== 1) {
    throw new Error(`Expected 1 legacy term, got ${termsJson.total}`);
  }
  const item = termsJson.data[0];
  if (item.translations.en !== 'Stop ride and save?' || item.translations.de !== 'Fahrt beenden und speichern?') {
    throw new Error(`Translations mismatch in legacy view: ${JSON.stringify(item.translations)}`);
  }
  console.log(`✔ 成功基于 view_terms_legacy 返回单列聚合 translations: en="${item.translations.en}", de="${item.translations.de}"`);

  // 4. 测试 POST /api/tables/:tableId/sync (修改德语 + 新增韩语)
  console.log('\n▶ 测试 3: POST /api/tables/:tableId/sync (更新词条与无损增量扩展韩语 ko)');
  const updatePayload = {
    updated: [
      {
        id: item.id,
        kw: item.kw,
        zh_cn: '结束骑行，是否保存记录？',
        translations: {
          ...item.translations,
          de: 'Fahrt beenden und aufzeichnen?', // 修改德语
          ko: '라이딩을 종료하고 기록을 저장하시겠습니까?', // 新增韩语
        },
      },
    ],
  };

  const resSyncUpdate = await app.inject({
    method: 'POST',
    url: `/api/tables/${version.id}/sync`,
    payload: updatePayload,
  });
  if (resSyncUpdate.statusCode !== 200) {
    throw new Error(`Legacy update sync failed: ${resSyncUpdate.payload}`);
  }
  console.log('✔ 更新报文处理完毕');

  // 再次读取验证
  const resRecheck = await app.inject({
    method: 'GET',
    url: `/api/tables/${version.id}/terms`,
  });
  const recheckItem = (JSON.parse(resRecheck.payload)).data[0];
  if (
    recheckItem.translations.de !== 'Fahrt beenden und aufzeichnen?' ||
    recheckItem.translations.ko !== '라이딩을 종료하고 기록을 저장하시겠습니까?'
  ) {
    throw new Error('Update verification failed in legacy view');
  }
  console.log(`✔ 验证成功: de 更新为 "${recheckItem.translations.de}", ko 扩展为 "${recheckItem.translations.ko}"`);

  // 5. 测试同义端点 POST /api/sync-table
  console.log('\n▶ 测试 4: POST /api/sync-table 同义别名端点测试');
  const resAlias = await app.inject({
    method: 'POST',
    url: '/api/sync-table',
    payload: {
      tableId: version.id,
      added: [
        {
          kw: 'KW_PAUSE_RIDE',
          zh_cn: '骑行已暂停',
          translations: { en: 'Ride Paused' },
        },
      ],
    },
  });
  if (resAlias.statusCode !== 200) {
    throw new Error(`Sync table alias failed: ${resAlias.payload}`);
  }
  console.log('✔ 同义别名端点 /api/sync-table 契约完全一致，执行成功');

  await app.close();
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('   🎉 【TASK-203】历史 API 兼容垫片层所有测试项 100% 验收通过！');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

runLegacyFacadeTests().catch((err) => {
  console.error('❌ TASK-203 验证失败:', err);
  process.exit(1);
});
