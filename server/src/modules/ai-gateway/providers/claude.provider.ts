import { ITranslationProvider, TranslationPromptContext, TranslationResult } from './provider.interface.js';

export class ClaudeProvider implements ITranslationProvider {
  name = 'Claude';
  model = 'claude-3-5-sonnet-20241022';
  private apiKey: string | undefined;

  constructor(options?: { apiKey?: string }) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
  }

  async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
    const start = Date.now();

    if (!this.apiKey || this.apiKey.startsWith('mock-') || process.env.NODE_ENV === 'test') {
      await new Promise((r) => setTimeout(r, 60));
      return {
        translatedText: mockClaudeTranslate(ctx.sourceText, ctx.targetLang),
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
        reasoningText: `[Claude 3.5 Sonnet] High precision translation evaluated for ${ctx.targetLang}.`,
      };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Translate "${ctx.sourceText}" from ${ctx.sourceLang} to ${ctx.targetLang}. Target hardware: ${ctx.hardwareType || 'Bike Computer'}. Output only translation.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    const text = data.content?.[0]?.text?.trim() || '';
    return {
      translatedText: text,
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - start,
    };
  }
}

function mockClaudeTranslate(text: string, lang: string): string {
  if (lang === 'de' && text.includes('结束骑行')) return 'Fahrt beenden';
  if (lang === 'en' && text.includes('结束骑行')) return 'Stop Ride';
  return `${text} [Claude-${lang}]`;
}
