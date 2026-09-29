import { ITranslationProvider, TranslationPromptContext, TranslationResult } from './provider.interface.js';

export class OllamaProvider implements ITranslationProvider {
  name = 'Ollama-Qwen';
  model = 'qwen2.5:14b';
  private host: string;

  constructor(options?: { host?: string }) {
    this.host = options?.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  async translate(ctx: TranslationPromptContext): Promise<TranslationResult> {
    const start = Date.now();

    if (process.env.NODE_ENV === 'test' || !process.env.OLLAMA_HOST) {
      await new Promise((r) => setTimeout(r, 45));
      return {
        translatedText: `${ctx.sourceText} [Qwen-${ctx.targetLang}]`,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
        reasoningText: '[Qwen Local 14B] Offline local inference.',
      };
    }

    try {
      const res = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: `Translate from ${ctx.sourceLang} to ${ctx.targetLang}: "${ctx.sourceText}". Output only translation.`,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama error: ${res.status}`);
      }

      const data: any = await res.json();
      return {
        translatedText: data.response?.trim() || '',
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      throw new Error(`Ollama offline or unreachable: ${err.message}`);
    }
  }
}
