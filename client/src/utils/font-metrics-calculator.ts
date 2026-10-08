/**
 * 固件嵌入式点阵字体像素级物理字宽估算引擎 (TASK-1102)
 * 根据迈金码表固件点阵字库（如 16x16, 24x24 点阵）
 * 计算字符串在物理 LCD / OLED 屏幕上的真实点阵物理像素占用宽度 (Pixel Width)
 */

// 常用字符点阵宽度表 (基于 16px 基准高度变宽点阵字库)
const FONT_METRIC_WIDTHS_16PX: Record<string, number> = {
  // 窄字符
  i: 4,
  l: 4,
  j: 5,
  ' ': 4,
  '.': 3,
  ',': 3,
  ':': 3,
  ';': 3,
  '!': 4,
  '|': 3,
  "'": 3,
  '"': 5,
  '(': 4,
  ')': 4,
  '[': 4,
  ']': 4,

  // 中等字符
  f: 6,
  r: 6,
  t: 6,
  I: 5,
  J: 7,
  c: 8,
  s: 8,
  e: 8,
  z: 8,
  v: 8,
  k: 8,
  x: 8,
  y: 8,
  a: 9,
  b: 9,
  d: 9,
  g: 9,
  h: 9,
  n: 9,
  o: 9,
  p: 9,
  q: 9,
  u: 9,

  // 宽字符
  w: 12,
  m: 13,
  W: 14,
  M: 14,
  A: 11,
  B: 10,
  C: 11,
  D: 11,
  E: 10,
  F: 9,
  G: 11,
  H: 11,
  K: 10,
  N: 11,
  O: 11,
  P: 10,
  Q: 11,
  R: 11,
  S: 10,
  T: 10,
  U: 11,
  V: 11,
  X: 11,
  Y: 10,
  Z: 10,

  // 数字
  '0': 9,
  '1': 6,
  '2': 9,
  '3': 9,
  '4': 9,
  '5': 9,
  '6': 9,
  '7': 9,
  '8': 9,
  '9': 9,
  '%': 13,
  '-': 6,
  '+': 8,
  '/': 6,
};

export interface FontMetricsResult {
  text: string;
  totalPixelWidth: number;
  maxWidthPx?: number;
  isOverflow: boolean;
  overflowPx: number;
  recommendedAbbr?: string;
}

/**
 * 估算字符串物理像素宽度
 */
export function estimatePhysicalPixelWidth(text: string, scale = 1.0): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    if (code > 0x4e00 && code < 0x9fa5) {
      // 中日韩全角汉字: 固定 16px (1:1 正方形点阵)
      width += 16;
    } else if (FONT_METRIC_WIDTHS_16PX[char] !== undefined) {
      width += FONT_METRIC_WIDTHS_16PX[char];
    } else {
      // 默认非西文未知字符取半角 8px
      width += 8;
    }
  }

  return Math.round(width * scale);
}

/**
 * 校验槽位字宽与溢出判断
 */
export function validateSlotPixelWidth(
  text: string,
  maxWidthPx?: number
): FontMetricsResult {
  const totalPixelWidth = estimatePhysicalPixelWidth(text);
  const isOverflow = Boolean(maxWidthPx && totalPixelWidth > maxWidthPx);
  const overflowPx = isOverflow && maxWidthPx ? totalPixelWidth - maxWidthPx : 0;

  return {
    text,
    totalPixelWidth,
    maxWidthPx,
    isOverflow,
    overflowPx,
  };
}
