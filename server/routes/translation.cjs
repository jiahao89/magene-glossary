const express = require('express');
const router = express.Router();
const { db, getDbType } = require('../config/db.cjs');
const { authenticateToken, requireProjectMember, requireRole } = require('../middleware/auth.cjs');
const { aiTranslateLimiter } = require('../middleware/rateLimiters.cjs');
const { 
  getEffectiveDifyConfig, 
  generateKwHelper, 
  getBuiltinKeys,
  isPrivateOrLocalUrl,
  getBuiltinDifyApps,
  resolveBuiltinKey,
  getOutboundIp,
  BROWSER_USER_AGENT
} = require('../services/difyService.cjs');
const { getEffectiveAiConfig, translateTerm, generateKw, testAiConnectivity } = require('../services/aiTranslationService.cjs');
const { parseJsonField } = require('../utils/jsonFields.cjs');
const { getCachedGlossaryTerms } = require('../services/glossaryCache.cjs');
const { tryExtractAndParseJson, isTranslationObj } = require('../utils/jsonRepair.cjs');

// POST /api/projects/:projectId/dify - 保存项目的 Dify 配置
router.post('/projects/:projectId/dify', authenticateToken, requireProjectMember, requireRole(['owner']), async (req, res) => {
  const { projectId } = req.params;
  const { baseUrl, apiKey } = req.body;
  const dbType = getDbType();

  if (!baseUrl) {
    return res.status(400).json({ error: 'baseUrl 不能为空' });
  }

  try {
    const project = await db.queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    let existingConfig = {};
    if (project.dify_config && typeof project.dify_config === 'object') {
      existingConfig = project.dify_config;
    } else {
      try {
        existingConfig = JSON.parse(project.dify_config || '{}');
      } catch {
        existingConfig = {};
      }
    }
    const builtinApps = getBuiltinDifyApps();
    let finalApiKey = apiKey;
    if (!finalApiKey) {
      if (baseUrl.includes('night.magene.cn')) {
        finalApiKey = builtinApps['night.magene.cn'] || existingConfig.apiKey || '';
      } else if (baseUrl.includes('api.dify.ai')) {
        finalApiKey = builtinApps['api.dify.ai'] || existingConfig.apiKey || '';
      } else {
        finalApiKey = existingConfig.apiKey || '';
      }
    }

    if (!finalApiKey) {
      return res.status(400).json({ error: 'apiKey 不能为空（尚未配置过密钥）' });
    }

    const newConfig = JSON.stringify({ baseUrl, apiKey: finalApiKey });
    if (dbType === 'postgres') {
      await db.run(
        'UPDATE projects SET dify_config = $1::jsonb WHERE id = $2',
        [newConfig, projectId]
      );
    } else {
      await db.run(
        'UPDATE projects SET dify_config = $1 WHERE id = $2',
        [newConfig, projectId]
      );
    }

    res.json({ message: 'Dify 配置已安全存入数据库！' });
  } catch (err) {
    console.error('保存 Dify 配置失败:', err);
    res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
  }
});

// GET /api/projects/:projectId/dify - 获取项目的 Dify 配置与连接状态
router.get('/projects/:projectId/dify', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  try {
    const config = await getEffectiveDifyConfig(projectId);
    const hasKey = Boolean(config.apiKey);
    const keySuffix = hasKey && config.apiKey.length >= 4 ? config.apiKey.slice(-4) : null;
    let matchedBuiltin = null;
    if (config.baseUrl) {
      if (config.baseUrl.includes('night.magene.cn')) matchedBuiltin = 'night';
      else if (config.baseUrl.includes('api.dify.ai')) matchedBuiltin = 'official';
    }

    res.json({
      baseUrl: config.baseUrl || '',
      apiKeyConfigured: hasKey,
      apiKeySuffix: keySuffix,
      matchedBuiltin: matchedBuiltin
    });
  } catch (err) {
    console.error('获取 Dify 配置失败:', err);
    res.status(500).json({ error: '获取 Dify 配置失败' });
  }
});

// GET /api/projects/:projectId/role - 获取当前用户在该项目中的角色
router.get('/projects/:projectId/role', authenticateToken, requireProjectMember, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ role: 'owner' });
  }
  res.json({ role: req.projectRole });
});

// GET /api/projects/:projectId/ai-config - 获取当前 AI 翻译引擎全景配置
router.get('/projects/:projectId/ai-config', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  try {
    const aiConfig = await getEffectiveAiConfig(projectId);
    res.json({
      provider: aiConfig.provider,
      openaiBaseUrl: aiConfig.openai.baseUrl,
      openaiModel: aiConfig.openai.model,
      hasOpenaiKey: Boolean(aiConfig.openai.apiKey),
      openaiKeySuffix: aiConfig.openai.apiKey ? aiConfig.openai.apiKey.slice(-4) : null,
      difyBaseUrl: aiConfig.dify.baseUrl,
      hasDifyKey: Boolean(aiConfig.dify.apiKey),
      difyKeySuffix: aiConfig.dify.apiKey ? aiConfig.dify.apiKey.slice(-4) : null
    });
  } catch (err) {
    console.error('读取 AI 配置失败:', err);
    res.status(500).json({ error: '读取 AI 配置失败' });
  }
});

// POST /api/projects/:projectId/ai-config - 保存 AI 翻译引擎配置 (支持 OpenAI 兼容 API / Dify / 本地离线模式)
router.post('/projects/:projectId/ai-config', authenticateToken, requireProjectMember, requireRole(['owner']), async (req, res) => {
  const { projectId } = req.params;
  const { provider, openaiBaseUrl, openaiApiKey, openaiModel, difyBaseUrl, difyApiKey } = req.body;
  const dbType = getDbType();

  try {
    const project = await db.queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    let existingConfig = {};
    if (project.dify_config && typeof project.dify_config === 'object') {
      existingConfig = project.dify_config;
    } else {
      try { existingConfig = JSON.parse(project.dify_config || '{}'); } catch {}
    }

    const updatedConfig = {
      ...existingConfig,
      provider: provider || existingConfig.provider || 'openai',
      openaiBaseUrl: openaiBaseUrl !== undefined ? openaiBaseUrl : existingConfig.openaiBaseUrl,
      openaiApiKey: openaiApiKey !== undefined ? openaiApiKey : existingConfig.openaiApiKey,
      openaiModel: openaiModel || existingConfig.openaiModel || 'deepseek-chat',
      baseUrl: difyBaseUrl !== undefined ? difyBaseUrl : (existingConfig.baseUrl || 'https://api.dify.ai/v1'),
      apiKey: difyApiKey !== undefined ? difyApiKey : existingConfig.apiKey
    };

    const configStr = JSON.stringify(updatedConfig);
    if (dbType === 'postgres') {
      await db.run('UPDATE projects SET dify_config = $1::jsonb WHERE id = $2', [configStr, projectId]);
    } else {
      await db.run('UPDATE projects SET dify_config = $1 WHERE id = $2', [configStr, projectId]);
    }

    res.json({ message: 'AI 翻译引擎配置已更新！', provider: updatedConfig.provider });
  } catch (err) {
    console.error('保存 AI 配置失败:', err);
    res.status(500).json({ error: '保存 AI 配置失败: ' + err.message });
  }
});

// POST /api/projects/:projectId/ai-test - 测试 AI 连通性 (Direct OpenAI / DeepSeek / Dify / Local)
router.post('/projects/:projectId/ai-test', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  const { provider, openaiBaseUrl, openaiApiKey, openaiModel, difyBaseUrl, difyApiKey } = req.body || {};

  try {
    const result = await testAiConnectivity({
      projectId,
      provider,
      openaiBaseUrl,
      openaiApiKey,
      openaiModel,
      difyBaseUrl,
      difyApiKey
    });
    res.json(result);
  } catch (err) {
    console.error('测试 AI 连通性失败:', err);
    res.status(500).json({ error: '测试失败: ' + err.message });
  }
});

// POST /api/projects/:projectId/ai-translate - 后端中转 Dify AI 翻译代理
router.post('/projects/:projectId/ai-translate', authenticateToken, requireProjectMember, requireRole(['owner', 'editor']), aiTranslateLimiter, async (req, res) => {
  const { projectId } = req.params;
  const { inputs } = req.body;
  const userId = req.user?.id || null;

  if (!inputs) {
    return res.status(400).json({ error: '缺少 inputs 输入参数' });
  }

  // ⚠️ 前端统一发送大写 KW (Dify 工作流入参), 兼容旧客户端的小写 kw/keyword
  const termKw = inputs.KW || inputs.kw || inputs.keyword || '';
  const zhCn = (inputs.zh_cn || inputs.chinese || inputs.text || inputs.中文文本 || '').trim();
  const targetLangs = inputs.target_languages || inputs.languages || '';

  if (!zhCn) {
    return res.status(400).json({ error: '缺少待翻译的文本内容' });
  }

  try {
    // === START GLOSSARY INTERCEPTION (USING IN-MEMORY CACHE) ===
    const glossaryTerms = await getCachedGlossaryTerms(projectId);

    const allMatches = glossaryTerms.filter(term => term.cn_term === zhCn);
    let fullMatch = null;

    if (allMatches.length === 1) {
      fullMatch = allMatches[0];
    } else if (allMatches.length > 1) {
      const inputContext = (inputs.context || inputs.所在页面 || '').trim();
      const inputKw = (inputs.kw || inputs.keyword || inputs.KW || '').trim().toLowerCase();

      const subTerms = glossaryTerms.filter(t => 
        t.cn_term !== zhCn && t.cn_term.length >= 2 && zhCn.includes(t.cn_term)
      );

      const scoredMatches = allMatches.map(term => {
        let score = 0;
        let termFields = parseJsonField(term && term.fields);

        const pageContext = (termFields['所在页面'] || '').trim();
        const termKwVal = (termFields.KW || term.kw || '').trim().toLowerCase();
        const enTerm = (term.en_term || '').trim();
        const enLower = enTerm.toLowerCase();

        if (inputContext && inputContext !== '无' && pageContext) {
          if (pageContext.includes(inputContext) || inputContext.includes(pageContext)) {
            score += 100;
          }
        }

        if (inputKw && termKwVal) {
          if (inputKw === termKwVal || inputKw.includes(termKwVal) || termKwVal.includes(inputKw)) {
            score += 50;
          }
        }

        subTerms.forEach(sub => {
          const subEn = (sub.en_term || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (subEn.length >= 3) {
            const shortSub = subEn.substring(0, 3);
            if (enLower.includes(shortSub)) {
              score += 30;
            }
          }
        });

        if (enTerm.length > 0) {
          score += Math.min(10, enTerm.length);
        }

        const hasOtherLangs = Object.keys(termFields).some(k => k !== '所在页面' && k !== 'KW' && k !== '字号类别' && termFields[k]);
        if (hasOtherLangs) {
          score += 5;
        }

        return { term, score };
      });

      scoredMatches.sort((a, b) => b.score - a.score);
      fullMatch = scoredMatches[0].term;
    }

    if (fullMatch) {
      const parsedTargetLangs = (typeof targetLangs === 'string' ? targetLangs.split(',') : targetLangs).map(l => l.trim()).filter(Boolean);
      let tmTranslations = {};
      const termFields = parseJsonField(fullMatch && fullMatch.fields);

      const fieldsKeys = Object.keys(termFields);
      parsedTargetLangs.forEach(lang => {
        if (lang === '英文' || lang.includes('EN') || lang.toLowerCase() === 'english') {
          tmTranslations[lang] = typeof fullMatch.en_term === 'object' 
            ? (fullMatch.en_term?.text || JSON.stringify(fullMatch.en_term)) 
            : String(fullMatch.en_term || '');
        } else {
          const normLang = lang.replace(/语|文/g, '');
          const matchedKey = fieldsKeys.find(k => k === lang || k.includes(normLang));
          let rawVal = matchedKey ? termFields[matchedKey] : '';
          if (typeof rawVal === 'object' && rawVal !== null) {
            if (Array.isArray(rawVal)) {
              rawVal = rawVal.map(x => (typeof x === 'object' ? x?.text || '' : String(x))).join('');
            } else if (rawVal.text !== undefined) {
              rawVal = String(rawVal.text);
            } else {
              rawVal = JSON.stringify(rawVal);
            }
          }
          tmTranslations[lang] = String(rawVal || '');
        }
      });
      return res.json({ ...tmTranslations, _source: 'tm' });
    }

    let matchedTerms = [];
    const nonLangKeys = new Set(['所在页面', '字号类别', 'KW', 'kw', 'CN（中文）', 'id', 'created_at', 'updated_at']);
    glossaryTerms.forEach(term => {
      const cn = (term.cn_term || '').trim();
      // 过滤单字符或纯符号，防止无意义的部分匹配导致 prompt 膨胀与 token 超标
      if (cn.length >= 2 && zhCn.includes(cn)) {
        const termFields = parseJsonField(term && term.fields);

        let targetConstraints = { "英文": term.en_term };
        Object.keys(termFields).forEach(k => {
          if (!nonLangKeys.has(k) && termFields[k]) {
            targetConstraints[k] = termFields[k];
          }
        });

        matchedTerms.push({
          "中文名词": cn,
          "各语种强制翻译": targetConstraints
        });
      }
    });

    if (matchedTerms.length > 0) {
      // 限制最多注入 15 条最相关的名词约束，防止 prompt 过大导致 LLM 推理卡顿 30+ 秒
      inputs.glossary_context = JSON.stringify(matchedTerms.slice(0, 15), null, 2);
    } else {
      inputs.glossary_context = "";
    }
    // === END GLOSSARY INTERCEPTION ===

    const aiConfig = await getEffectiveAiConfig(projectId);
    const parsedTargetLangs = (typeof targetLangs === 'string' ? targetLangs.split(',') : targetLangs).map(l => l.trim()).filter(Boolean);

    // 优先：如果配置为 openai 兼容模式 (DeepSeek / 通义千问 / OpenAI)，直接走轻量快速 API，彻底脱离 Dify 依赖
    if (aiConfig.provider === 'openai' && aiConfig.openai.apiKey) {
      const aiResult = await translateTerm({
        projectId,
        chineseText: zhCn,
        context: inputs.context || inputs.所在页面,
        targetLanguages: parsedTargetLangs,
        glossaryRules: inputs.glossary_context,
        userId: `user_${userId}`
      });

      if (aiResult.success) {
        db.query(
          'INSERT INTO ai_usage_logs (user_id, project_id, term_kw, zh_cn, target_languages, total_tokens, elapsed_time, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [userId, projectId, termKw, zhCn.slice(0, 200), Array.isArray(targetLangs) ? targetLangs.join(',') : targetLangs, aiResult.totalTokens, aiResult.elapsedTime, 'success']
        ).catch(() => {});

        return res.json({
          data: {
            outputs: aiResult.translations,
            status: 'succeeded',
            total_tokens: aiResult.totalTokens,
            elapsed_time: aiResult.elapsedTime,
            provider: aiResult.provider
          },
          ...aiResult.translations
        });
      }
    }

    const config = await getEffectiveDifyConfig(projectId);
    const result = await executeDifyWithFailover(config, inputs, `user_${userId}`);

    if (!result.ok) {
      // ⭐ 核心优化: Dify 失败时（如 504 超时、403、或者未连上），不再向用户报红报错！
      // 自动无缝降级至内置固件词库与大模型直连兜底翻译，保证 100% 成功交付！
      console.warn(`⚠️ Dify 调用未成功 (${result.status})，自动启用本地词库与大模型直连降级兜底...`);
      const fallbackResult = await translateTerm({
        projectId,
        chineseText: zhCn,
        context: inputs.context || inputs.所在页面,
        targetLanguages: parsedTargetLangs,
        glossaryRules: inputs.glossary_context,
        userId: `user_${userId}`
      });

      if (fallbackResult.success && Object.keys(fallbackResult.translations).length > 0) {
        return res.json({
          data: {
            outputs: fallbackResult.translations,
            status: 'succeeded',
            total_tokens: fallbackResult.totalTokens,
            elapsed_time: fallbackResult.elapsedTime,
            provider: fallbackResult.provider
          },
          ...fallbackResult.translations
        });
      }

      const errorText = result.errorText || '';
      let cleanMsg = errorText;
      
      // ⭐ 精确匹配 HTTP status,不再用 errorText.includes 模糊判断(Dify 错误描述里可能带 "403" 等字样)
      if (result.status === 504) {
        cleanMsg = 'Dify 接口响应超时 (HTTP 504 Gateway Timeout)。已重试全量备用引擎，请确认服务可用性。';
      } else if (result.status === 502) {
        cleanMsg = 'Dify 网关响应异常 (HTTP 502 Bad Gateway)。建议在【系统设置】中切换引擎。';
      } else if (result.status === 403) {
        cleanMsg = 'Dify 拒绝访问 (HTTP 403 Forbidden)。请检查 API Key 是否正确或已授权。';
      } else if (result.status === 401) {
        cleanMsg = 'Dify 校验失败 (HTTP 401 Unauthorized)。API Key 无效。';
      } else if (errorText.includes('<html') || errorText.includes('<HTML')) {
        cleanMsg = `Dify 远程服务器响应异常 (HTTP ${result.status})`;
      } else {
        try {
          const parsed = JSON.parse(errorText);
          cleanMsg = parsed?.message || parsed?.error || errorText;
        } catch {
          cleanMsg = errorText;
        }
      }

      // ⭐ 调试模式:返回 Dify 真实响应,前端能直接看到原始错误
      // 仅系统管理员可见原始错误/备用引擎列表/出口 IP, 普通用户只拿脱敏文案
      const debugPayload = (req.query.debug === '1' || req.body?.debug === true) && req.user?.role === 'admin';
      const responseBody = {
        error: `Dify API 响应错误: ${cleanMsg}`,
      };
      if (debugPayload) {
        responseBody.debug = {
          difyStatus: result.status,
          difyRaw: (errorText || '').slice(0, 1000),
          triedUrls: result.triedUrls || [],
          outboundIp: result.outboundIp || null, // ⭐ Render 后端对外 IP
          timestamp: new Date().toISOString(),
        };
        console.warn(`🔍 [dify-debug] status=${result.status} tried=${responseBody.debug.triedUrls.join(' → ')}`);
        console.warn(`🔍 [dify-debug] raw: ${responseBody.debug.difyRaw}`);
        console.warn(`🔍 [dify-debug] outboundIp: ${result.outboundIp || 'unknown'}`);
      }

      return res.status(result.status || 500).json(responseBody);
    }

    const data = result.data;

    const workflowStatus = data.data?.status || data.status;
    const workflowError = data.data?.error || data.error;
    if (workflowStatus === 'failed' || workflowStatus === 'stopped') {
      console.error('⚠️ Dify workflow failed:', JSON.stringify({ status: workflowStatus, error: workflowError }));
      const errorStr = String(workflowError || '');
      const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('rate_limit') || errorStr.includes('quota');
      const httpStatus = isRateLimit ? 429 : 500;
      return res.status(httpStatus).json({ error: `Dify 工作流执行失败 (status: ${workflowStatus}): ${workflowError || '未知错误，请检查 Dify 工作流日志'}` });
    }

    const usageTokens = data.data?.total_tokens || 0;
    const usageElapsed = data.data?.elapsed_time || 0;
    const usageStatus = data.data?.status || 'success';
    db.query(
      'INSERT INTO ai_usage_logs (user_id, project_id, term_kw, zh_cn, target_languages, total_tokens, elapsed_time, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, projectId, termKw, zhCn.slice(0, 200), targetLangs, usageTokens, usageElapsed, usageStatus]
    ).catch(err => console.error('AI用量日志写入失败:', err.message));

    let outputs = data.data?.outputs || data.outputs;
    if (!outputs || typeof outputs !== 'object' || Object.keys(outputs).length === 0) {
      if (data.data?.result || data.result) {
        outputs = { result: data.data?.result || data.result };
      } else if (data.data?.text || data.text) {
        outputs = { text: data.data?.text || data.text };
      } else if (data.data?.answer || data.answer) {
        outputs = { answer: data.data?.answer || data.answer };
      } else if (data.data?.response || data.response) {
        outputs = { response: data.data?.response || data.response };
      } else if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        outputs = data.data;
      } else {
        outputs = data;
      }
    }

    if (!outputs || typeof outputs !== 'object') {
      console.error('⚠️ Dify raw data:', JSON.stringify(data));
      return res.status(500).json({ error: `Dify 工作流未返回任何有效数据。原始响应: ${JSON.stringify(data).slice(0, 300)}` });
    }

    const outputKeys = Object.keys(outputs);
    if (outputKeys.some(k => k.includes('英') || k.includes('法') || k.includes('德') || k.includes('日') || k.includes('EN') || k.includes('FR') || k.includes('CN') || k.includes('中文'))) {
      return res.json(outputs);
    }

    let rawVal = outputs.result || outputs.translations || outputs.output || outputs.text || outputs.answer || outputs.response || outputs.res || outputs.data || outputs.json;

    if (rawVal === undefined && outputKeys.length === 1) {
      rawVal = outputs[outputKeys[0]];
    }

    if (rawVal === undefined) {
      for (const key of outputKeys) {
        const val = outputs[key];
        if (typeof val === 'string' && val.trim().startsWith('{')) {
          rawVal = val;
          break;
        }
      }
    }

    if (rawVal === undefined || rawVal === null) {
      console.error('⚠️ Dify raw response data structure:', JSON.stringify(data));
      return res.status(500).json({ 
        error: `Dify 工作流未包含有效输出变量 (当前 Dify 输出字段为: ${outputKeys.join(', ') || '无'})。原始响应片段: ${JSON.stringify(data).slice(0, 200)}` 
      });
    }


    if (typeof rawVal === 'object' && rawVal !== null) {
      if (rawVal.error) {
        const fallbackText = rawVal.raw_output || rawVal.text || rawVal.result || rawVal.raw || '';
        const repairedObj = tryExtractAndParseJson(fallbackText);
        if (repairedObj && isTranslationObj(repairedObj)) {
          console.log('✅ 成功从 Dify Code 节点的 raw_output 中容错解析出完整 JSON 翻译!');
          return res.json(repairedObj);
        }
        return res.status(500).json({ error: `Dify 脚本节点抛出错误: ${rawVal.error}` });
      }
      return res.json(rawVal);
    }

    const parsedObj = tryExtractAndParseJson(String(rawVal));
    if (parsedObj && typeof parsedObj === 'object') {
      if (parsedObj.error) {
        const fallbackText = parsedObj.raw_output || parsedObj.text || '';
        const repairedObj = tryExtractAndParseJson(fallbackText);
        if (repairedObj && isTranslationObj(repairedObj)) {
          console.log('✅ 成功容错修复解析 Dify raw_output JSON!');
          return res.json(repairedObj);
        }
        return res.status(200).json({ error: `Dify 脚本节点抛出错误: ${parsedObj.error}` });
      }
      return res.json(parsedObj);
    }

    res.status(500).json({ error: `解析 Dify 输出 JSON 失败。原始输出为: ${String(rawVal).slice(0, 200)}` });
  } catch (err) {
    console.error('中转 AI 翻译失败:', err);
    // ⭐ 调试模式:把异常消息 + Render 出口 IP 暴露出来 (仅管理员, 防止向普通用户泄漏内部错误细节)
    const debugRequested = req.query.debug === '1' || req.body?.debug === true;
    if (debugRequested && req.user?.role === 'admin') {
      const debugInfo = {
        message: err?.message || String(err),
        stack: (err?.stack || '').split('\n').slice(0, 3).join(' | '),
        timestamp: new Date().toISOString(),
      };
      res.status(500).json({
        error: `服务器内部错误: ${err?.message || err}`,
        debug: debugInfo,
      });
    } else {
      res.status(500).json({ error: '服务器内部错误，请稍后重试。' });
    }
  }
});

// POST /api/projects/:projectId/generate-kw - 根据中文源词与参考英文生成 KW 标识
router.post('/projects/:projectId/generate-kw', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  const { text, enText, context } = req.body;

  if ((!text || !text.trim()) && (!enText || !enText.trim())) {
    return res.status(400).json({ error: '中文源词 (text) 或参考英文 (enText) 不能为空' });
  }

  try {
    let generated = await generateKw({ projectId, text, enText, context });
    if (!generated) {
      generated = await generateKwHelper(projectId, text, enText, context);
    }
    res.json({ kw: generated });
  } catch (err) {
    console.error('生成 KW 失败:', err);
    res.status(500).json({ error: '生成 KW 失败，请重试。' });
  }
});

// POST /api/projects/:projectId/batch-generate-kw - 批量预览生成 KW
router.post('/projects/:projectId/batch-generate-kw', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  const { items = [] } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '待生成词条列表 (items) 不能为空' });
  }

  try {
    const results = [];
    for (const item of items) {
      const text = item.text || item.zh_cn || '';
      const enText = item.enText || item.en || '';
      const context = item.context || '';
      const kw = await generateKwHelper(projectId, text, enText, context);
      results.push({
        id: item.id || item.recordId,
        text,
        enText,
        kw
      });
    }
    res.json({ results });
  } catch (err) {
    console.error('批量生成 KW 失败:', err);
    res.status(500).json({ error: '批量生成 KW 失败' });
  }
});

// POST /api/projects/:projectId/dify-test - 测试 Dify 连接性
//
// 注意: 上游 Dify API 的 401/403 是 *业务错误* (Key 无效 / 权限不足),
// 不是当前用户的会话失效, 不能让前端跳登录。
// 因此 upstream 非 2xx 一律映射到 4xx/5xx 业务错误, 并通过 X-Business-Error
// header 标识这是业务级错误 (前端 apiFetch 据此不触发跳登录)。
router.post('/projects/:projectId/dify-test', authenticateToken, requireProjectMember, async (req, res) => {
  const { projectId } = req.params;
  const { baseUrl, apiKey } = req.body;

  const effective = await getEffectiveDifyConfig(projectId);
  const targetUrl = (baseUrl || effective.baseUrl || '').trim();

  // SSRF 防护: 拦截内网/私有 IP 地址
  if (isPrivateOrLocalUrl(targetUrl)) {
    return res
      .status(400)
      .set('X-Business-Error', 'ssrf-blocked')
      .json({ error: '安全拦截：禁止连接内网私有地址！' });
  }

  const targetKey = resolveBuiltinKey(targetUrl, apiKey, effective.apiKey);

  if (!targetUrl || !targetKey) {
    return res
      .status(400)
      .set('X-Business-Error', 'missing-config')
      .json({ error: 'baseUrl 和 apiKey 不能为空，请选择内置预设或填写自定义参数' });
  }

  try {
    const cleanBaseUrl = targetUrl.replace(/\/$/, '');
    const url = `${cleanBaseUrl}/workflows/run`;

    const testInputs = {
      KW: 'KW_CONNECTION_TEST',
      text: '测试',
      context: '设置',
      target_languages: 'EN（英文）'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${targetKey}`,
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'X-Magene-Source': 'GlossaHub'
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        inputs: testInputs,
        response_mode: 'blocking',
        user: 'glossahub_connection_test'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let cleanMsg = errorText;
      // ⭐ 精确匹配 HTTP status,不再用 errorText.includes('403 Forbidden') 模糊判断
      //    (Dify 工作流错误描述里偶尔会带 "403" 字样, 会被误判)
      if (response.status === 403) {
        cleanMsg = 'HTTP 403 Forbidden (API Key 无权访问此接口，请确认 Key 是否正确)';
      } else if (response.status === 401) {
        cleanMsg = 'HTTP 401 Unauthorized (API Key 无效或已过期，请重新配置)';
      } else if (errorText.includes('<html') || errorText.includes('<HTML')) {
        cleanMsg = `HTTP ${response.status}: 服务器拒绝连接 (可能接口地址错误或服务器不可达)`;
      } else {
        // ⭐ 其他情况(Dify 400 workflow 执行错误等):透传 Dify 真实 message
        try {
          const parsed = JSON.parse(errorText);
          cleanMsg = `Dify 返回错误 (HTTP ${response.status}): ${parsed?.message || parsed?.error || errorText}`;
        } catch {
          cleanMsg = `Dify 返回错误 (HTTP ${response.status}): ${errorText.slice(0, 200)}`;
        }
      }
      // 把 upstream 401/403 透传会被前端误判为"用户会话失效", 一律映射为 502
      // (业务错误, 不是认证错误) 并带 X-Business-Error 头让 apiFetch 区分。
      const businessStatus = response.status === 401 || response.status === 403 ? 502 : 400;
      const responseBody = { error: cleanMsg };
      // ⭐ 调试模式:返回真实 Dify 响应 (仅管理员可见原始错误/目标 URL/Key 后缀)
      if ((req.query.debug === '1' || req.body?.debug === true) && req.user?.role === 'admin') {
        responseBody.debug = {
          difyStatus: response.status,
          difyRaw: errorText.slice(0, 500),
          targetUrl,
          keySuffix: targetKey ? `...${targetKey.slice(-4)}` : null,
        };
        console.warn(`🔍 [dify-test-debug] status=${response.status} url=${targetUrl} keySuffix=${responseBody.debug.keySuffix}`);
        console.warn(`🔍 [dify-test-debug] raw: ${errorText.slice(0, 500)}`);
      }
      return res
        .status(businessStatus)
        .set('X-Business-Error', 'dify-upstream-rejected')
        .json(responseBody);
    }

    res.json({ success: true, message: 'Dify 引擎连接测试成功！' });
  } catch (err) {
    console.error('连接测试失败:', err);
    res
      .status(500)
      .set('X-Business-Error', 'dify-network-error')
      .json({ error: '服务器内部错误，请稍后重试。' });
  }
});

module.exports = router;
