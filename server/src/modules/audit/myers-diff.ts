export type DiffType = 'unchanged' | 'insert' | 'delete';

export interface DiffChunk {
  type: DiffType;
  value: string;
}

/**
 * Myers O(ND) 字符级差异算法实现
 * 计算两个字符串之间的最短编辑脚本 (Shortest Edit Script)，并将连续的单字符操作合并为高效分块
 */
export function computeMyersDiff(oldText: string = '', newText: string = ''): DiffChunk[] {
  if (oldText === newText) {
    return oldText.length > 0 ? [{ type: 'unchanged', value: oldText }] : [];
  }
  if (!oldText) {
    return newText.length > 0 ? [{ type: 'insert', value: newText }] : [];
  }
  if (!newText) {
    return oldText.length > 0 ? [{ type: 'delete', value: oldText }] : [];
  }

  const a = Array.from(oldText);
  const b = Array.from(newText);
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v: number[] = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
        x = v[k + 1 + max]; // 向下移动 (insert)
      } else {
        x = v[k - 1 + max] + 1; // 向右移动 (delete)
      }

      let y = x - k;

      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      v[k + max] = x;

      if (x >= n && y >= m) {
        return backtrack(trace, a, b, max);
      }
    }
  }

  // 极端后备
  return [
    { type: 'delete', value: oldText },
    { type: 'insert', value: newText },
  ];
}

function backtrack(trace: number[][], a: string[], b: string[], max: number): DiffChunk[] {
  let x = a.length;
  let y = b.length;
  const rawChunks: { type: DiffType; char: string }[] = [];

  for (let d = trace.length - 1; d > 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[prevK + max];
    const prevY = prevX - prevK;

    // 对角线部分（匹配/不变）
    while (x > prevX && y > prevY) {
      rawChunks.unshift({ type: 'unchanged', char: a[x - 1] });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        // 向下移动 -> insert
        rawChunks.unshift({ type: 'insert', char: b[prevY] });
      } else {
        // 向右移动 -> delete
        rawChunks.unshift({ type: 'delete', char: a[prevX] });
      }
    }

    x = prevX;
    y = prevY;
  }

  // 处理起始处的对角线
  while (x > 0 && y > 0) {
    rawChunks.unshift({ type: 'unchanged', char: a[x - 1] });
    x--;
    y--;
  }

  // 合并相同类型的连续字符
  const merged: DiffChunk[] = [];
  for (const item of rawChunks) {
    if (merged.length > 0 && merged[merged.length - 1].type === item.type) {
      merged[merged.length - 1].value += item.char;
    } else {
      merged.push({ type: item.type, value: item.char });
    }
  }

  return merged;
}
