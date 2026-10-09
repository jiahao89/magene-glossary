/**
 * server/utils/jsonRepair.cjs
 * 
 * 健壮的 LLM 响应解析与 JSON 容错修复模块
 * 支持自动剥离 DeepSeek / Qwen 深度思考块 (<think>)、Markdown 代码块，以及自动纠正常见的 JSON 格式缺陷。
 */

/**
 * 清除 LLM 深度思考标签与思维链文本
 */
function cleanThinkBlocks(input) {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim();
  // 移除 <think>...</think> 思考块
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 移除中文深度思考标头
  cleaned = cleaned.replace(/已深度思考[\s\S]*?(?=\{|$)/gi, '').trim();
  // 移除英文 Thinking Process 标头
  cleaned = cleaned.replace(/Thinking Process:[\s\S]*?(?=\{|$)/gi, '').trim();
  // 移除 Markdown 代码块围栏 (```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
}

/**
 * 判断一个对象是否为合法的多语言翻译映射字典
 */
function isTranslationObj(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  return keys.length > 0 && !obj.error && keys.some(k => 
    k.includes('英') || k.includes('法') || k.includes('德') || k.includes('日') || 
    k.includes('EN') || k.includes('FR') || k.includes('DE') || k.includes('ES') || 
    k.includes('CN') || k.includes('中文') || k.length <= 6
  );
}

/**
 * 健壮的多阶段 JSON 提取与修复解析器
 */
function tryExtractAndParseJson(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return null;
  const cleaned = cleanThinkBlocks(inputStr);
  if (!cleaned) return null;

  // 1. 直接尝试标准解析
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch {}

  // 2. 截取首个 '{' 到最后一个 '}' 区间尝试解析
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose > firstOpen) {
    const candidate = cleaned.slice(firstOpen, lastClose + 1);
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch {}

    // 尝试修复常见缺陷：末尾逗号、未双引号包裹的键名
    try {
      const repaired = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_\u4e00-\u9fa5]+)\1\s*:/g, '"$2":');
      const obj = JSON.parse(repaired);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch {}
  }

  // 3. 正则贪婪匹配 JSON 对象结构
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch {}

    try {
      const repaired = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_\u4e00-\u9fa5]+)\1\s*:/g, '"$2":');
      const obj = JSON.parse(repaired);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch {}
  }

  return null;
}

module.exports = {
  cleanThinkBlocks,
  isTranslationObj,
  tryExtractAndParseJson
};
