import fs from 'node:fs';
import path from 'node:path';
import { CHeaderGenerator } from '../generators/c-header-generator';
import { AndroidGenerator } from '../generators/android-generator';
import { IOSGenerator } from '../generators/ios-generator';

export interface PullCommandOptions {
  format: 'c-header' | 'android-xml' | 'ios-strings';
  out: string;
  project?: string;
  version?: string;
  endpoint?: string;
}

/**
 * Glossa Pull Command (TASK-802, TASK-803)
 * Pulls glossary data and compiles it into C-headers, Android XMLs, or iOS strings
 */
export async function executePull(
  options: PullCommandOptions,
  providedTerms?: any[]
): Promise<{ generatedFiles: string[] }> {
  const outDir = path.resolve(process.cwd(), options.out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Fetch from server or use provided/fallback terms
  let terms = providedTerms || [];
  if (terms.length === 0 && options.endpoint) {
    try {
      const res = await fetch(`${options.endpoint}/api/v2/terms?versionId=${options.version || ''}`);
      if (res.ok) {
        const data = await res.json();
        terms = data.items || [];
      }
    } catch (e: any) {
      console.warn(`⚠️ Warning: Could not fetch from backend (${e.message}). Using local fallback.`);
    }
  }

  // Format terms into normalized inputs
  const normalizedTerms = terms.map((t) => ({
    kw: t.kw,
    zhCn: t.zhCn,
    translations: t.translations
      ? Object.fromEntries(
          Object.entries(t.translations).map(([k, v]: [string, any]) => [
            k,
            typeof v === 'string' ? v : v.text,
          ])
        )
      : {},
  }));

  const generatedFiles: string[] = [];

  if (options.format === 'c-header') {
    const generator = new CHeaderGenerator();
    const result = generator.generate(normalizedTerms, {
      projectName: options.project || 'Magene C606 Smart Computer',
      versionName: options.version || 'v2.0.0',
    });

    const headerPath = path.join(outDir, 'strings_lang.h');
    const sourcePath = path.join(outDir, 'strings_lang.c');

    fs.writeFileSync(headerPath, result.headerContent, 'utf-8');
    fs.writeFileSync(sourcePath, result.sourceContent, 'utf-8');

    generatedFiles.push(headerPath, sourcePath);
    console.log(`✔ Generated C header: ${headerPath}`);
    console.log(`✔ Generated C lookup table: ${sourcePath}`);
  } else if (options.format === 'android-xml') {
    const generator = new AndroidGenerator();
    const langs = ['zh', 'en', 'de', 'fr', 'es', 'ja'];

    for (const lang of langs) {
      const folderName = lang === 'zh' ? 'values' : `values-${lang}`;
      const folderPath = path.join(outDir, 'res', folderName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const filePath = path.join(folderPath, 'strings.xml');
      const xml = generator.generateXml(normalizedTerms, lang);
      fs.writeFileSync(filePath, xml, 'utf-8');
      generatedFiles.push(filePath);
    }
    console.log(`✔ Generated Android XML strings across ${langs.length} locales in ${outDir}/res`);
  } else if (options.format === 'ios-strings') {
    const generator = new IOSGenerator();
    const langs = ['zh', 'en', 'de', 'fr', 'es', 'ja'];

    for (const lang of langs) {
      const folderName = IOSGenerator.toIosLprojName(lang);
      const folderPath = path.join(outDir, folderName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const filePath = path.join(folderPath, 'Localizable.strings');
      const content = generator.generateStrings(normalizedTerms, lang);
      fs.writeFileSync(filePath, content, 'utf-8');
      generatedFiles.push(filePath);
    }
    console.log(`✔ Generated iOS Localizable.strings across ${langs.length} locales in ${outDir}`);
  }

  return { generatedFiles };
}
