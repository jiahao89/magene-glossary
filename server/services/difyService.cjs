const { db, getDbType } = require('../config/db.cjs');

// 专业词库匹配查询失败是否已告警（避免 KW 高频生成时日志刷屏）
let glossaryQueryWarned = false;

// ⚠️ 内置 Key 统一由环境变量 DIFY_BUILTIN_KEYS (逗号分隔) 注入, 源码不硬编码任何 key
// 顺序与内置引擎域名一一对应: [0]=night.magene.cn, [1]=api.dify.ai
let builtinKeysWarned = false;
function getBuiltinKeys() {
  const keys = (process.env.DIFY_BUILTIN_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  if (keys.length === 0 && !builtinKeysWarned) {
    builtinKeysWarned = true;
    console.warn('⚠️ 未配置 DIFY_BUILTIN_KEYS，内置 Dify 候选已禁用');
  }
  return keys;
}

const DEFAULT_DIFY_CONFIG = {
  baseUrl: process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1',
  apiKey: process.env.DIFY_API_KEY || (getBuiltinKeys()[1] || getBuiltinKeys()[0] || '')
};

// 预置固件、码表、IoT与常用交互界面高频中英对照词典
const FIRMWARE_UI_DICT = {
  // 基础操作与通用交互
  '重试': 'RETRY',
  '确定': 'CONFIRM',
  '确认': 'CONFIRM',
  '取消': 'CANCEL',
  '保存': 'SAVE',
  '删除': 'DELETE',
  '编辑': 'EDIT',
  '完成': 'DONE',
  '返回': 'BACK',
  '退出': 'EXIT',
  '设置': 'SETTINGS',
  '下一步': 'NEXT',
  '上一步': 'PREV',
  '跳过': 'SKIP',
  '重置': 'RESET',
  '搜索': 'SEARCH',
  '刷新': 'REFRESH',
  '同步': 'SYNC',
  '开始': 'START',
  '暂停': 'PAUSE',
  '继续': 'RESUME',
  '停止': 'STOP',
  '结束': 'END',
  '复制': 'COPY',
  '导入': 'IMPORT',
  '导出': 'EXPORT',
  '全选': 'SELECT_ALL',
  '清空': 'CLEAR',
  '查看': 'VIEW',
  '详情': 'DETAILS',
  '帮助': 'HELP',
  '关于': 'ABOUT',

  // 连接、配对与设备交互
  '配对': 'PAIRING',
  '配对成功': 'PAIRING_SUCCESSFUL',
  '配对失败': 'PAIRING_FAILED',
  '正在配对': 'PAIRING',
  '核对数字': 'VERIFY_NUMBERS',
  '正在建立安全连接': 'ESTABLISHING_SECURE_CONNECTION',
  '请在手机端确认': 'PLEASE_CONFIRM_ON_PHONE',
  '请在手机端继续完成设置': 'PLEASE_CONTINUE_SETUP_ON_PHONE',
  '连接': 'CONNECT',
  '连接成功': 'CONNECTED',
  '已连接': 'CONNECTED',
  '连接失败': 'CONNECT_FAILED',
  '未连接': 'DISCONNECTED',
  '断开连接': 'DISCONNECTED',
  '正在连接': 'CONNECTING',
  '蓝牙': 'BLUETOOTH',
  '传感器': 'SENSOR',
  '搜索设备': 'SEARCH_DEVICE',
  '设备已连接': 'DEVICE_CONNECTED',
  '设备已断开': 'DEVICE_DISCONNECTED',

  // 骑行、运动与传感器数据
  '速度': 'SPEED',
  '速度计': 'SPEED_SENSOR',
  '平均速度': 'AVG_SPEED',
  '最大速度': 'MAX_SPEED',
  '心率': 'HEART_RATE',
  '心率带': 'HEART_RATE_MONITOR',
  '平均心率': 'AVG_HEART_RATE',
  '最大心率': 'MAX_HEART_RATE',
  '踏频': 'CADENCE',
  '踏频计': 'CADENCE_SENSOR',
  '平均踏频': 'AVG_CADENCE',
  '最大踏频': 'MAX_CADENCE',
  '功率': 'POWER',
  '功率计': 'POWER_METER',
  '平均功率': 'AVG_POWER',
  '最大功率': 'MAX_POWER',
  '距离': 'DISTANCE',
  '总距离': 'TOTAL_DISTANCE',
  '时间': 'TIME',
  '骑行时间': 'RIDE_TIME',
  '运动时间': 'ELAPSED_TIME',
  '卡路里': 'CALORIES',
  '海拔': 'ALTITUDE',
  '累计爬升': 'TOTAL_ASCENT',
  '累计下降': 'TOTAL_DESCENT',
  '坡度': 'GRADE',
  '温度': 'TEMPERATURE',
  '气压': 'PRESSURE',
  '开始骑行': 'START_RIDE',
  '骑行记录': 'RIDE_HISTORY',
  '历史记录': 'HISTORY',
  '路线': 'ROUTE',
  '导航': 'NAVIGATION',
  '地图': 'MAP',

  // 系统与硬件状态
  '电量': 'BATTERY',
  '电池': 'BATTERY',
  '低电量': 'LOW_BATTERY',
  '充电中': 'CHARGING',
  '充满': 'FULL_BATTERY',
  '亮度': 'BRIGHTNESS',
  '背光': 'BACKLIGHT',
  '音量': 'VOLUME',
  '提示音': 'BEEP',
  '自动关机': 'AUTO_POWER_OFF',
  '自动休眠': 'AUTO_SLEEP',
  '自动暂停': 'AUTO_PAUSE',
  '自动背光': 'AUTO_BACKLIGHT',
  '语言': 'LANGUAGE',
  '公制': 'METRIC',
  '英制': 'IMPERIAL',
  '固件升级': 'FIRMWARE_UPDATE',
  'OTA升级': 'OTA_UPDATE',
  '正在升级': 'UPDATING',
  '升级成功': 'UPDATE_SUCCESSFUL',
  '升级失败': 'UPDATE_FAILED',
  '恢复出厂设置': 'FACTORY_RESET',
  '存储空间': 'STORAGE',
  '内存不足': 'OUT_OF_MEMORY',
  'GPS信号': 'GPS_SIGNAL',
  '校准': 'CALIBRATION',
  '校准成功': 'CALIBRATION_SUCCESSFUL',
  '校准失败': 'CALIBRATION_FAILED',

  // 状态与判定
  '成功': 'SUCCESS',
  '失败': 'FAILED',
  '警告': 'WARNING',
  '错误': 'ERROR',
  '提示': 'TIPS',
  '是': 'YES',
  '否': 'NO',
  '开': 'ON',
  '关': 'OFF',
  '开启': 'ENABLE',
  // 注意: '关闭' 在此映射表中统一为 DISABLE（与 ENABLE 对应；早期重复定义的 CLOSE 条目已移除）
  '关闭': 'DISABLE',
  '自动': 'AUTO',
  '手动': 'MANUAL',
  '正常': 'NORMAL',
  '异常': 'ABNORMAL'
};

/**
 * 格式化 KW 规范大写标识
 * 示例: "Retry" -> "KW_RETRY", "Please confirm on phone" -> "KW_PLEASE_CONFIRM_ON_PHONE"
 */
function formatKw(str) {
  if (!str || typeof str !== 'string') return '';
  let clean = str
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/[\s-_]+/g, '_')
    .toUpperCase();

  if (!clean) return '';
  if (clean.length > 50) {
    clean = clean.slice(0, 50).replace(/_$/, '');
  }
  if (!clean.startsWith('KW_')) {
    clean = 'KW_' + clean;
  }
  return clean;
}

async function getEffectiveDifyConfig(projectId) {
  try {
    const project = await db.queryOne('SELECT dify_config FROM projects WHERE id = $1', [projectId]);
    if (project && project.dify_config) {
      let cfg = {};
      if (typeof project.dify_config === 'object') {
        cfg = project.dify_config;
      } else {
        cfg = JSON.parse(project.dify_config || '{}');
      }
      if (cfg.baseUrl) {
        let apiKey = cfg.apiKey;
        const builtinKeys = getBuiltinKeys();
        if (cfg.baseUrl.includes('night.magene.cn')) {
          // 已存 Key 为空或误存为 Dify 云内置 Key 时, 自动纠正为 Night 内置 Key
          if (!apiKey || (builtinKeys[1] && apiKey === builtinKeys[1])) {
            apiKey = builtinKeys[0] || '';
          }
        } else if (cfg.baseUrl.includes('api.dify.ai')) {
          // 已存 Key 为空或误存为 Night 内置 Key 时, 自动纠正为 Dify 云内置 Key
          if (!apiKey || (builtinKeys[0] && apiKey === builtinKeys[0])) {
            apiKey = builtinKeys[1] || '';
          }
        }
        if (apiKey) {
          return { baseUrl: cfg.baseUrl, apiKey, isCustom: true };
        }
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_DIFY_CONFIG, isCustom: false };
}

/**
 * 5层智能瀑布流 KW 生成器
 * @param {string} projectId 项目 ID
 * @param {string} text 中文源文本
 * @param {string} [enText] 现有英文翻译 (如有则优先直接格式化)
 * @param {string} [context] 所在页面 / 模块上下文
 */
async function generateKwHelper(projectId, text, enText = '', context = '') {
  const trimmedText = (text || '').trim();
  const trimmedEn = (enText || '').trim();

  // 1. 已有英文译文优先直转 (0 延迟、100% 精确)
  if (trimmedEn) {
    const formatted = formatKw(trimmedEn);
    if (formatted && formatted !== 'KW_') {
      return formatted;
    }
  }

  if (!trimmedText) return '';

  // 2. 源文本本身为英文/ASCII 则直接转换
  if (/^[a-zA-Z0-9_\-\s.]+$/.test(trimmedText)) {
    const formatted = formatKw(trimmedText);
    if (formatted && formatted !== 'KW_') {
      return formatted;
    }
  }

  // 3. 高频固件 & UI 词典精确匹配
  if (FIRMWARE_UI_DICT[trimmedText]) {
    return formatKw(FIRMWARE_UI_DICT[trimmedText]);
  }

  // 4. 查询数据库专业词汇库 (Glossary) 或已有同名中文的词条英文
  try {
    // glossary_terms 表的中文词列名为 cn_term、英文译文列名为 en_term（无 term_name / translations 列）
    const glossaryTerm = await db.queryOne(
      'SELECT en_term FROM glossary_terms WHERE cn_term = $1 LIMIT 1',
      [trimmedText]
    );
    if (glossaryTerm && glossaryTerm.en_term) {
      return formatKw(glossaryTerm.en_term);
    }

    // PG 下 translations 是 jsonb 列，不能直接与字符串 '{}' 比较，需转 text；SQLite 存 TEXT 可直接比较
    const notEmptyCond = getDbType() === 'postgres'
      ? "translations::text != '{}'"
      : "translations != '{}'";
    const existingTerm = await db.queryOne(
      `SELECT translations FROM terms WHERE zh_cn = $1 AND translations IS NOT NULL AND ${notEmptyCond} LIMIT 1`,
      [trimmedText]
    );
    if (existingTerm && existingTerm.translations) {
      const parsed = typeof existingTerm.translations === 'object' ? existingTerm.translations : JSON.parse(existingTerm.translations);
      const en = parsed['EN（英文）'] || parsed['EN'] || parsed['en'];
      if (en) {
        return formatKw(en);
      }
    }
  } catch (err) {
    // 查询失败仅告警一次，避免 KW 批量生成时日志刷屏
    if (!glossaryQueryWarned) {
      glossaryQueryWarned = true;
      console.warn('专业词库匹配查询失败:', err.message);
    }
  }

  // 5. 调用 Dify AI 翻译引擎 (具备候选引擎故障切换)
  let difyResult = '';
  const primaryConfig = await getEffectiveDifyConfig(projectId);
  const builtinKeys = getBuiltinKeys();
  const candidates = [
    primaryConfig,
    {
      baseUrl: 'https://api.dify.ai/v1',
      apiKey: builtinKeys[1] || ''
    },
    {
      baseUrl: 'https://night.magene.cn/v1',
      apiKey: builtinKeys[0] || ''
    }
  ];

  for (const cfg of candidates) {
    if (!cfg.baseUrl || !cfg.apiKey) continue;
    try {
      const cleanBaseUrl = cfg.baseUrl.replace(/\/$/, '');
      const url = `${cleanBaseUrl}/workflows/run`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
          'X-Magene-Source': 'GlossaHub'
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          inputs: {
            KW: 'KW_GEN',
            text: trimmedText,
            context: context || 'UI界面按键与提示',
            target_languages: 'EN（英文）'
          },
          response_mode: 'blocking',
          user: 'glossahub_generate_kw'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.status !== 'failed' && data.data?.outputs) {
          const outputs = data.data.outputs;
          const resultStr = outputs.result || outputs.translations;
          if (typeof resultStr === 'string') {
            try {
              const parsed = JSON.parse(resultStr);
              const keys = Object.keys(parsed);
              const enKey = keys.find(k => k.toLowerCase().includes('en') || k.toLowerCase().includes('英') || k.toLowerCase().includes('english'));
              if (enKey && parsed[enKey]) {
                difyResult = parsed[enKey];
                break;
              }
            } catch {
              // Not pure JSON string, check if it is clean English text
              if (/^[a-zA-Z0-9_\-\s.,'!]+$/.test(resultStr.trim())) {
                difyResult = resultStr.trim();
                break;
              }
            }
          } else if (typeof resultStr === 'object' && resultStr !== null) {
            const keys = Object.keys(resultStr);
            const enKey = keys.find(k => k.toLowerCase().includes('en') || k.toLowerCase().includes('英') || k.toLowerCase().includes('english'));
            if (enKey && resultStr[enKey]) {
              difyResult = resultStr[enKey];
              break;
            }
          }
        }
      }
    } catch {
      // try next candidate
    }
  }

  if (difyResult) {
    const formatted = formatKw(difyResult);
    if (formatted && formatted !== 'KW_') {
      return formatted;
    }
  }

  // 6. 拼音/英文字符规范保底兜底 (杜绝毫无意义的随机数字时间戳)
  let pinyinFallback = '';
  // 简易单字拼音音节转换表 (覆盖高频汉字)
  const PINYIN_TABLE = {
    '重': 'CHONG', '试': 'SHI', '确': 'QUE', '认': 'REN', '定': 'DING', '消': 'XIAO', '取': 'QU',
    '配': 'PEI', '对': 'DUI', '成': 'CHENG', '功': 'GONG', '败': 'BAI', '失': 'SHI', '立': 'LI',
    '连': 'LIAN', '接': 'JIE', '安': 'AN', '全': 'QUAN', '核': 'HE', '数': 'SHU', '字': 'ZI',
    '请': 'QING', '在': 'ZAI', '手': 'SHOU', '机': 'JI', '端': 'DUAN', '继': 'JI', '完': 'WAN',
    '速': 'SU', '度': 'DU', '心': 'XIN', '率': 'LV', '踏': 'TA', '频': 'PIN',
    '设': 'SHE', '置': 'ZHI', '开': 'KAI', '关': 'GUAN', '是': 'SHI', '否': 'FOU', '蓝': 'LAN',
    '牙': 'YA', '电': 'DIAN', '池': 'CHI', '量': 'LIANG', '高': 'GAO', '低': 'DI', '更': 'GENG'
  };

  for (const char of trimmedText) {
    if (PINYIN_TABLE[char]) {
      pinyinFallback += (pinyinFallback ? '_' : '') + PINYIN_TABLE[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      pinyinFallback += char.toUpperCase();
    }
  }

  if (pinyinFallback) {
    return 'KW_' + pinyinFallback;
  }

  // 最后的语义保底
  return 'KW_ITEM_' + (trimmedText.length);
}

// ============================================================
// Dify 网络安全与多实例容错降级机制
// ============================================================

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 GlossaHub/1.2';
const engineFailureTimestamps = new Map();
let preferredEngineUrl = null;

function isPrivateOrLocalUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')) {
      return true;
    }
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const b0 = parseInt(ipMatch[1], 10);
      const b1 = parseInt(ipMatch[2], 10);
      if (b0 === 10) return true; // 10.0.0.0/8
      if (b0 === 127) return true; // 127.0.0.0/8
      if (b0 === 172 && (b1 >= 16 && b1 <= 31)) return true; // 172.16.0.0/12
      if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16
      if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 Link-local
      if (b0 === 0) return true; // 0.0.0.0
    }
    return false;
  } catch {
    return false;
  }
}

function getBuiltinDifyApps() {
  const keys = getBuiltinKeys();
  const apps = {
    'night.magene.cn': 'app-zV0Lo78Bi5WjhplWDL7OwsWR',
    'api.dify.ai': 'app-aochEehgytnJciYeI3L1pqfj'
  };

  if (keys.length > 0) {
    keys.forEach(k => {
      if (k.startsWith('app-zV0') || k.includes('zV0')) {
        apps['night.magene.cn'] = k;
      } else if (k.startsWith('app-aoch') || k.includes('aoch')) {
        apps['api.dify.ai'] = k;
      }
    });
    if (keys[0] && !keys[0].startsWith('app-aoch')) apps['night.magene.cn'] = keys[0];
    if (keys[1] && !keys[1].startsWith('app-zV0')) apps['api.dify.ai'] = keys[1];
  }
  return apps;
}

function resolveBuiltinKey(baseUrl, providedKey, fallbackKey) {
  if (providedKey && typeof providedKey === 'string' && providedKey.trim() !== '') {
    return providedKey.trim();
  }
  for (const [host, builtinKey] of Object.entries(getBuiltinDifyApps())) {
    if (baseUrl && baseUrl.includes(host)) {
      return builtinKey;
    }
  }
  return fallbackKey || '';
}

let cachedOutboundIp = null;
let outboundIpResolved = false;
async function getOutboundIp() {
  if (outboundIpResolved) return cachedOutboundIp;
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    if (r.ok) {
      const j = await r.json();
      cachedOutboundIp = j.ip || null;
    }
  } catch {}
  outboundIpResolved = true;
  return cachedOutboundIp;
}

async function executeDifyWithFailover(primaryConfig, inputs, userIdStr) {
  const outboundIp = await getOutboundIp();

  const builtinApps = getBuiltinDifyApps();
  const orderedHosts = ['api.dify.ai', 'night.magene.cn'];
  const builtinCandidates = [];
  for (const host of orderedHosts) {
    if (builtinApps[host]) {
      builtinCandidates.push({
        baseUrl: `https://${host}/v1`,
        apiKey: builtinApps[host]
      });
    }
  }

  const candidates = [primaryConfig, ...builtinCandidates];
  const uniqueCandidates = [];
  const seen = new Set();

  for (const c of candidates) {
    if (!c || !c.baseUrl || !c.apiKey) continue;
    let url = c.baseUrl.replace(/\/$/, '').trim();
    const key = resolveBuiltinKey(url, c.apiKey, null);
    const sig = `${url}___${key}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      uniqueCandidates.push({ baseUrl: url, apiKey: key });
    }
  }

  if (preferredEngineUrl) {
    const prefIdx = uniqueCandidates.findIndex(c => c.baseUrl === preferredEngineUrl);
    if (prefIdx > 0) {
      const [fav] = uniqueCandidates.splice(prefIdx, 1);
      uniqueCandidates.unshift(fav);
    }
  }

  let lastStatus = 500;
  let lastErrorText = '';

  for (let cIdx = 0; cIdx < uniqueCandidates.length; cIdx++) {
    const item = uniqueCandidates[cIdx];
    const recentFailTime = engineFailureTimestamps.get(item.baseUrl) || 0;
    const isRecentlyFailed = (Date.now() - recentFailTime < 30000);
    const candidateTimeout = isRecentlyFailed ? 20000 : 60000;
    try {
      const targetUrl = `${item.baseUrl}/workflows/run`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${item.apiKey}`,
          'User-Agent': BROWSER_USER_AGENT,
          'Accept': 'text/event-stream',
          'X-Magene-Source': 'GlossaHub'
        },
        signal: AbortSignal.timeout(candidateTimeout),
        body: JSON.stringify({
          inputs,
          response_mode: 'streaming',
          user: userIdStr || 'glossahub_client'
        })
      });

      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let finalData = null;
        let streamError = null;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const eventStr = trimmed.substring(6);
                  if (eventStr === 'ping') continue;
                  
                  const eventData = JSON.parse(eventStr);
                  if (eventData.event === 'workflow_finished') {
                    finalData = eventData;
                  } else if (eventData.event === 'error') {
                    streamError = eventData.message || 'Stream error';
                  }
                } catch {}
              }
            }
          }
        }

        if (streamError) {
          lastErrorText = streamError;
          engineFailureTimestamps.set(item.baseUrl, Date.now());
          console.warn(`⚠️ Dify workflow stream error on ${item.baseUrl}: ${streamError}`);
        } else if (finalData) {
          const status = finalData.data?.status || finalData.status;
          if (status !== 'failed' && status !== 'stopped') {
            preferredEngineUrl = item.baseUrl;
            return { ok: true, data: { data: finalData.data }, usedUrl: item.baseUrl };
          } else {
            lastErrorText = finalData.data?.error || finalData.error || `Workflow status: ${status}`;
            engineFailureTimestamps.set(item.baseUrl, Date.now());
            console.warn(`⚠️ Dify workflow status ${status} on ${item.baseUrl}: ${lastErrorText}`);
          }
        } else {
          lastErrorText = "Stream finished without workflow_finished event";
          engineFailureTimestamps.set(item.baseUrl, Date.now());
          console.warn(`⚠️ Stream finished without workflow_finished event on ${item.baseUrl}`);
        }
      } else {
        lastStatus = response.status;
        lastErrorText = await response.text();
        engineFailureTimestamps.set(item.baseUrl, Date.now());
        console.warn(`⚠️ Dify API returned ${response.status} from ${item.baseUrl}, trying failover...`);
      }
    } catch (err) {
      console.warn(`⚠️ Dify fetch exception on ${item.baseUrl}: ${err.message}`);
      lastErrorText = err.message;
      engineFailureTimestamps.set(item.baseUrl, Date.now());
    }
  }

  return { ok: false, status: lastStatus, errorText: lastErrorText, triedUrls: uniqueCandidates.map(c => c.baseUrl), outboundIp };
}

module.exports = {
  DEFAULT_DIFY_CONFIG,
  FIRMWARE_UI_DICT,
  formatKw,
  getEffectiveDifyConfig,
  generateKwHelper,
  getBuiltinKeys,
  isPrivateOrLocalUrl,
  getBuiltinDifyApps,
  resolveBuiltinKey,
  getOutboundIp,
  executeDifyWithFailover,
  BROWSER_USER_AGENT
};

