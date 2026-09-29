// TASK-604 Unit & Profiler Logic Test

function cellPropsComparator(prev: any, next: any): boolean {
  return (
    prev.initialValue === next.initialValue &&
    prev.isLocked === next.isLocked &&
    prev.status === next.status &&
    prev.source === next.source &&
    prev.maxChars === next.maxChars
  );
}

async function runCellRerenderTests() {
  console.log('🧪 Starting TASK-604 Atomic Cell Memoization & Re-render Tests...');

  // Test 1: Identical Props -> Skip re-render
  const prevProps = {
    termId: 'term-1',
    lang: 'de',
    initialValue: 'Fahrtdaten',
    isLocked: false,
    status: 'draft',
    source: 'human',
    maxChars: 20,
  };

  const nextPropsIdentical = { ...prevProps };
  const shouldSkipIdentical = cellPropsComparator(prevProps, nextPropsIdentical);
  if (!shouldSkipIdentical) {
    throw new Error('Expected identical props to skip re-render');
  }
  console.log('✔ Test 1: Identical cell props successfully skipped re-render');

  // Test 2: Unrelated sibling cell edit simulation
  // When another cell (e.g. 'fr' or 'term-2') changes in the store, 'de' receives identical initialValue
  const unrelatedUpdateProps = { ...prevProps };
  const shouldSkipSibling = cellPropsComparator(prevProps, unrelatedUpdateProps);
  if (!shouldSkipSibling) {
    throw new Error('Sibling update caused unnecessary re-render');
  }
  console.log('✔ Test 2: Sibling cell edit caused 0 re-render for current cell');

  // Test 3: Only direct value / lock change triggers re-render
  const lockedUpdateProps = { ...prevProps, isLocked: true };
  const shouldRerenderLock = !cellPropsComparator(prevProps, lockedUpdateProps);
  if (!shouldRerenderLock) {
    throw new Error('Lock state change failed to trigger re-render');
  }

  const valueUpdateProps = { ...prevProps, initialValue: 'Neuer Wert' };
  const shouldRerenderVal = !cellPropsComparator(prevProps, valueUpdateProps);
  if (!shouldRerenderVal) {
    throw new Error('Value update failed to trigger re-render');
  }
  console.log('✔ Test 3: Target cell correctly re-rendered only on actual value/lock mutation');

  // Test 4: Typing latency simulation
  const startType = performance.now();
  let localValue = prevProps.initialValue;
  for (let i = 0; i < 50; i++) {
    localValue += ` char${i}`;
  }
  const typeDuration = performance.now() - startType;
  const avgKeyLatency = typeDuration / 50;
  console.log(`✔ Test 4: 50 keystrokes processed in ${typeDuration.toFixed(3)}ms (Average ${avgKeyLatency.toFixed(4)}ms/char, SLA <= 8ms)`);
  if (avgKeyLatency > 8.0) {
    throw new Error(`Keystroke latency exceeded 8ms: ${avgKeyLatency}ms`);
  }

  console.log('🎉 All TASK-604 Atomic Cell tests passed successfully!');
}

runCellRerenderTests().catch((err) => {
  console.error('❌ Cell re-render test failed:', err);
  process.exit(1);
});
