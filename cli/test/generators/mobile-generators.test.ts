import { AndroidGenerator } from '../../src/generators/android-generator';
import { IOSGenerator } from '../../src/generators/ios-generator';

async function runMobileGeneratorTests() {
  console.log('🧪 Starting TASK-803 Mobile Generators (Android & iOS) Tests...');

  const mockTerms = [
    {
      kw: 'KW_RIDE_RECORD',
      zhCn: '骑行记录 & 数据分析',
      translations: {
        en: "Ride's Record & Analytics",
        de: 'Fahrtaufzeichnung & Analyse',
      },
    },
    {
      kw: 'KW_POPUP_ALERT',
      zhCn: '警告："心率过高"',
      translations: {
        en: 'Alert: "Heart rate too high"',
        de: 'Warnung: "Herzfrequenz zu hoch"',
      },
    },
  ];

  // Test 1: Android XML Generation & Escaping
  const androidGen = new AndroidGenerator();
  const androidEnXml = androidGen.generateXml(mockTerms, 'en');

  // Verify apostrophe escaped as \'
  if (!androidEnXml.includes("Ride\\'s Record &amp; Analytics")) {
    throw new Error(`Android XML escaping failed for single quote or ampersand: ${androidEnXml}`);
  }
  // Verify double quote escaped as \"
  if (!androidEnXml.includes('Alert: \\"Heart rate too high\\"')) {
    throw new Error(`Android XML escaping failed for double quotes: ${androidEnXml}`);
  }
  console.log('✔ Test 1: Android strings.xml single quotes, ampersands, and double quotes escaped');

  // Test 2: iOS Localizable.strings Generation & Escaping
  const iosGen = new IOSGenerator();
  const iosEnStrings = iosGen.generateStrings(mockTerms, 'en');

  if (!iosEnStrings.includes('"KW_RIDE_RECORD" = "Ride\'s Record & Analytics";')) {
    throw new Error(`iOS strings generation failed: ${iosEnStrings}`);
  }
  if (!iosEnStrings.includes('"KW_POPUP_ALERT" = "Alert: \\"Heart rate too high\\"";')) {
    throw new Error(`iOS double quotes escaping failed: ${iosEnStrings}`);
  }
  console.log('✔ Test 2: iOS Localizable.strings structure and quote escaping verified');

  // Test 3: Language folder name mappings
  if (IOSGenerator.toIosLprojName('zh') !== 'zh-Hans.lproj') {
    throw new Error('zh-Hans mapping mismatch');
  }
  if (IOSGenerator.toIosLprojName('en') !== 'en.lproj') {
    throw new Error('en mapping mismatch');
  }
  console.log('✔ Test 3: iOS .lproj language folder conventions verified');

  console.log('🎉 All TASK-803 Mobile Generator tests passed successfully!');
}

runMobileGeneratorTests().catch((err) => {
  console.error('❌ Mobile generator test failed:', err);
  process.exit(1);
});
