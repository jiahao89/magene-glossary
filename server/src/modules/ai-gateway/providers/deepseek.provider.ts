import { ITranslationProvider, TranslationPromptContext, TranslationResult } from './provider.interface.js';

export class DeepSeekProvider implements ITranslationProvider {
  name = 'DeepSeek';
  model = 'deepseek-chat';
  private apiKey: string | undefined;
  private endpoint: string;

  constructor(options?: { apiKey?: string; endpoint?: string }) {
    this.apiKey = options?.apiKey || process.env.DEEPSEEK_API_KEY;
    this.endpoint = options?.endpoint || process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/chat/completions';
  }

  async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
    const start = Date.now();

    // 单元测试或本地无 Key 模式下的高逼真模拟 (包括思维链)
    if (!this.apiKey || this.apiKey.startsWith('mock-') || process.env.NODE_ENV === 'test') {
      await new Promise((r) => setTimeout(r, 40));
      return {
        translatedText: mockTranslate(ctx.sourceText, ctx.targetLang),
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
        reasoningText: `[DeepSeek-V3 Reasoning] 正在分析 "${ctx.sourceText}" 在码表(${ctx.hardwareType || '通用'})环境下的短文本表达，长度限制: ${ctx.maxChars || '无'}。推荐采用简洁专有名词。`,
      };
    }

    const systemPrompt = `You are a professional firmware localization translator for sports bike computers (Magene C606). Translate from ${ctx.sourceLang} to ${ctx.targetLang}. Keep terms concise. Strict length limit: ${ctx.maxChars || 50} chars.`;
    const userPrompt = `Source text: "${ctx.sourceText}". Context: ${ctx.termContext || 'None'}. Return only the translated text.`;

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    const choice = data.choices?.[0]?.message;
    return {
      translatedText: choice?.content?.trim() || '',
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - start,
      reasoningText: choice?.reasoning_content || undefined,
    };
  }
}

function mockTranslate(text: string, lang: string): string {
  const dictionary: Record<string, Record<string, string>> = {
    de: {
      '结束骑行': 'Fahrt beenden',
      '开始骑行': 'Fahrt starten',
      '心率过高': 'Herzfrequenz hoch',
      '功率区间': 'Leistungszone',
      '电量不足': 'Batterie schwach',
    },
    en: {
      '结束骑行': 'Finish Ride',
      '开始骑行': 'Start Ride',
      '心率过高': 'Heart Rate High',
      '功率区间': 'Power Zone',
      '电量不足': 'Battery Low',
    },
    fr: {
      '结束骑行': 'Terminer Sortie',
      '开始骑行': 'Démarrer Sortie',
      '心率过高': 'FC Trop Élevée',
      '功率区间': 'Zone de Puissance',
      '电量不足': 'Batterie Faible',
    },
  };

  return dictionary[lang]?.[text] || `${text} [${lang.toUpperCase()}]`;
}
