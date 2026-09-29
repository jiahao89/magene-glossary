export interface TranslationPromptContext {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  maxChars?: number;
  hardwareType?: string;
  termContext?: string;
  tmSamples?: Array<{ source: string; target: string }>;
  systemInstruction?: string;
}

export interface TranslationResult {
  translatedText: string;
  provider: string;
  model: string;
  latencyMs: number;
  reasoningText?: string;
}

export interface ITranslationProvider {
  name: string;
  model: string;
  translate(ctx: TranslationPromptContext): Promise<TranslationResult>;
}
