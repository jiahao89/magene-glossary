import { CMacroScanner } from '../../src/scanners/c-macro-scanner';

async function runScannerTests() {
  console.log('🧪 Starting TASK-801 C Macro Scanner Unit Tests...');

  const scanner = new CMacroScanner();

  // Test 1: Standard single-line comment with [max_chars: N]
  const cCode1 = `
// 功率目标区间超限报警 [max_chars: 18]
#define KW_POWER_ZONE_ALERT 1042

/* 心率过高预警提示 [max_chars: 24] */
#define KW_HEART_RATE_ALERT 1043

#define KW_CADENCE_LOW 1044 // 踏频过低警告

#define KW_EMPTY_COMMENT 1045
`;

  const results = scanner.scanContent(cCode1, 'test_ui.c');

  if (results.length !== 4) {
    throw new Error(`Expected 4 macros, found ${results.length}`);
  }

  // Check KW_POWER_ZONE_ALERT
  const alert = results.find((r) => r.kw === 'KW_POWER_ZONE_ALERT');
  if (!alert || alert.zhCn !== '功率目标区间超限报警' || alert.maxChars !== 18) {
    throw new Error(`KW_POWER_ZONE_ALERT mismatch: ${JSON.stringify(alert)}`);
  }
  console.log('✔ Test 1: Previous-line comment with [max_chars: 18] parsed correctly');

  // Check KW_HEART_RATE_ALERT
  const hr = results.find((r) => r.kw === 'KW_HEART_RATE_ALERT');
  if (!hr || hr.zhCn !== '心率过高预警提示' || hr.maxChars !== 24) {
    throw new Error(`KW_HEART_RATE_ALERT mismatch: ${JSON.stringify(hr)}`);
  }
  console.log('✔ Test 2: Block comment /* ... */ with [max_chars: 24] parsed correctly');

  // Check KW_CADENCE_LOW
  const cadence = results.find((r) => r.kw === 'KW_CADENCE_LOW');
  if (!cadence || cadence.zhCn !== '踏频过低警告' || cadence.maxChars !== undefined) {
    throw new Error(`KW_CADENCE_LOW mismatch: ${JSON.stringify(cadence)}`);
  }
  console.log('✔ Test 3: Inline comment parsed correctly');

  // Check KW_EMPTY_COMMENT
  const empty = results.find((r) => r.kw === 'KW_EMPTY_COMMENT');
  if (!empty || empty.zhCn !== 'KW_EMPTY_COMMENT') {
    throw new Error(`KW_EMPTY_COMMENT fallback failed: ${JSON.stringify(empty)}`);
  }
  console.log('✔ Test 4: Comment-less macro gracefully fell back to KW name');

  console.log('🎉 All TASK-801 C Macro Scanner tests passed successfully!');
}

runScannerTests().catch((err) => {
  console.error('❌ Scanner test failed:', err);
  process.exit(1);
});
