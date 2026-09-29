import { ITranslationProvider, TranslationPromptContext, TranslationResult } from './provider.interface.js';

export class OpenAIProvider implements ITranslationProvider {
  name = 'OpenAI';
  model = 'gpt-4o-mini';
  private apiKey: string | undefined;

  constructor(options?: { apiKey?: string }) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  }

  async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
    const start = Date.now();

    if (!this.apiKey || this.apiKey.startsWith('mock-') || process.env.NODE_ENV === 'test') {
      await new Promise((r) => setTimeout(r, 50));
      return {
        translatedText: `${ctx.sourceText} [OpenAI-${ctx.targetLang}]`,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: `Translate to ${ctx.targetLang}. Max length: ${ctx.maxChars || 50}.` },
          { role: 'user', content: ctx.sourceText },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    return {
      translatedText: data.choices?.[0]?.message?.content?.trim() || '',
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - start,
    };
  }
}
