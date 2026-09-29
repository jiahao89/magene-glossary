// TASK-702 Unit Test for HardwareConstraintMeter logic

function evaluateGaugeState(currentLength: number, maxChars?: number | null) {
  if (!maxChars || maxChars <= 0) return null;
  const percentage = Math.min(Math.round((currentLength / maxChars) * 100), 150);
  const isOverflow = currentLength > maxChars;
  const isWarning = percentage >= 70 && !isOverflow;
  const color = isOverflow ? 'danger' : isWarning ? 'warning' : 'safe';
  const overflowDiff = isOverflow ? currentLength - maxChars : 0;
  return { percentage, isOverflow, isWarning, color, overflowDiff };
}

async function runHardwareMeterTests() {
  console.log('🧪 Starting TASK-702 Hardware Constraint Meter Tests...');

  // Case 1: Null/0 maxChars -> null render
  const nullCheck = evaluateGaugeState(10, null);
  if (nullCheck !== null) throw new Error('Expected null when maxChars is null');
  const zeroCheck = evaluateGaugeState(10, 0);
  if (zeroCheck !== null) throw new Error('Expected null when maxChars is 0');
  console.log('✔ Test 1: Null and zero maxChars gracefully ignored');

  // Case 2: Safe region (< 70%)
  const safeCheck = evaluateGaugeState(10, 20); // 50%
  if (!safeCheck || safeCheck.color !== 'safe' || safeCheck.percentage !== 50 || safeCheck.isOverflow) {
    throw new Error('Safe region calculation failed');
  }
  console.log('✔ Test 2: Safe region (50%) evaluated as emerald safe');

  // Case 3: Warning region (70% - 100%)
  const warningCheck1 = evaluateGaugeState(14, 20); // 70%
  if (!warningCheck1 || warningCheck1.color !== 'warning' || !warningCheck1.isWarning) {
    throw new Error('Warning threshold 70% failed');
  }
  const warningCheck2 = evaluateGaugeState(20, 20); // 100%
  if (!warningCheck2 || warningCheck2.color !== 'warning' || warningCheck2.isOverflow) {
    throw new Error('Warning threshold 100% failed');
  }
  console.log('✔ Test 3: Warning region (70% and 100%) evaluated as amber warning');

  // Case 4: Overflow region (> 100%)
  const overflowCheck = evaluateGaugeState(23, 20); // 115%
  if (
    !overflowCheck ||
    overflowCheck.color !== 'danger' ||
    !overflowCheck.isOverflow ||
    overflowCheck.overflowDiff !== 3
  ) {
    throw new Error(`Overflow failed: ${JSON.stringify(overflowCheck)}`);
  }
  console.log('✔ Test 4: Overflow (23/20 chars) evaluated as danger with +3 diff');

  console.log('🎉 All TASK-702 Hardware Meter tests passed successfully!');
}

runHardwareMeterTests().catch((err) => {
  console.error('❌ Hardware meter test failed:', err);
  process.exit(1);
});
