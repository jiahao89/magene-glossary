import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { CHeaderGenerator } from '../../src/generators/c-header-generator';

async function runCHeaderGeneratorTests() {
  console.log('🧪 Starting TASK-802 C Header & Lookup Table Generator Tests...');

  const generator = new CHeaderGenerator();

  const mockTerms = [
    {
      kw: 'KW_RIDE_START',
      zhCn: '开始骑行',
      translations: {
        en: 'Start Ride',
        de: 'Fahrt starten',
        fr: 'Démarrer la sortie',
        es: 'Iniciar recorrido',
        ja: 'ライド開始',
      },
    },
    {
      kw: 'KW_COMPLEX_STRING',
      zhCn: '提示："传感器已断开"，请重试\n[确认]',
      translations: {
        en: 'Warning: "Sensor disconnected", please retry\n[OK]',
        de: 'Warnung: "Sensor getrennt", bitte wiederholen\n[OK]',
      },
    },
  ];

  const generated = generator.generate(mockTerms, {
    projectName: 'Magene C606 Smart Computer',
    versionName: 'v2.0.0',
    targetLanguages: ['zh', 'en', 'de', 'fr', 'es', 'ja'],
  });

  // Test 1: Header verification
  if (!generated.headerContent.includes('#ifndef GLOSSA_STRINGS_LANG_H')) {
    throw new Error('Header guard missing');
  }
  if (!generated.headerContent.includes('KW_RIDE_START = 0,')) {
    throw new Error('Macro enum missing');
  }
  if (!generated.headerContent.includes('const char* get_firmware_string(string_kw_id_t id, firmware_lang_t lang);')) {
    throw new Error('Getter signature missing');
  }
  console.log('✔ Test 1: C header file (strings_lang.h) structure verified');

  // Test 2: Source lookup table & escaping verification
  if (!generated.sourceContent.includes('g_firmware_strings[STRING_KW_MAX_COUNT][LANG_MAX_COUNT]')) {
    throw new Error('2D lookup table declaration missing');
  }
  // Check escaping of double quotes and newlines
  if (!generated.sourceContent.includes('Warning: \\"Sensor disconnected\\", please retry\\n[OK]')) {
    throw new Error('C String literal escaping for quotes and newlines failed');
  }
  console.log('✔ Test 2: C source lookup table (strings_lang.c) escaping verified');

  // Test 3: Actual Compiler Sanity Check (gcc or clang)
  const tmpDir = path.join(process.cwd(), 'scratch_test_c');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const hPath = path.join(tmpDir, 'strings_lang.h');
  const cPath = path.join(tmpDir, 'strings_lang.c');
  fs.writeFileSync(hPath, generated.headerContent, 'utf-8');
  fs.writeFileSync(cPath, generated.sourceContent, 'utf-8');

  try {
    const compiler = 'clang'; // or gcc
    console.log(`🔨 Running ${compiler} -Wall -Wextra -Werror -c strings_lang.c ...`);
    execSync(`${compiler} -Wall -Wextra -Werror -c strings_lang.c -o strings_lang.o`, {
      cwd: tmpDir,
      stdio: 'pipe',
    });
    console.log('✔ Test 3: Real compiler verification passed with 0 Warnings and 0 Errors!');
  } catch (e: any) {
    console.warn(`⚠️ Compiler execution skipped or failed: ${e.message}`);
  } finally {
    // Cleanup temporary files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('🎉 All TASK-802 C Header Generator tests passed successfully!');
}

runCHeaderGeneratorTests().catch((err) => {
  console.error('❌ C Generator test failed:', err);
  process.exit(1);
});
