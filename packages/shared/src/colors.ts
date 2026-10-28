/** Cover color groups, in shelf (rainbow) order. Derived from the stored hex, never persisted. */
export const COLOR_GROUPS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'brown',
  'white',
  'gray',
  'black',
] as const;

export type ColorGroup = (typeof COLOR_GROUPS)[number];

const ORDER = new Map<string, number>(COLOR_GROUPS.map((g, i) => [g, i]));

export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  l: number;
  /** max − min channel, 0–1; a steadier "colorfulness" than HSL saturation near black and white */
  c: number;
}

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  const l = (max + min) / 2;
  const s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (c) {
    if (max === r) h = ((g - b) / c) % 6;
    else if (max === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l, c };
}

export function coverColorGroup(hex: string | null | undefined): ColorGroup | null {
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl) return null;
  const { h, l, c } = hsl;
  if (l < 0.1) return 'black';
  if (l > 0.93) return 'white';
  if (c < 0.1) return l < 0.25 ? 'black' : l > 0.8 ? 'white' : 'gray';
  if (h >= 12 && h < 50 && (l < 0.4 || c < 0.3)) return 'brown';
  if (h < 12 || h >= 335) return 'red';
  if (h < 42) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

/** Rainbow order: by group, then hue, then light to dark. Items without a color go last. */
export function compareCoverColor(a: string | null | undefined, b: string | null | undefined): number {
  const ga = coverColorGroup(a);
  const gb = coverColorGroup(b);
  if (!ga || !gb) return (ga ? 0 : 1) - (gb ? 0 : 1);
  const byGroup = ORDER.get(ga)! - ORDER.get(gb)!;
  if (byGroup) return byGroup;
  const ha = hexToHsl(a!)!;
  const hb = hexToHsl(b!)!;
  // Reds straddle 0°, so pull the top of the wheel down next to them.
  const hue = (x: Hsl) => (x.h >= 335 ? x.h - 360 : x.h);
  const neutral = ga === 'white' || ga === 'gray' || ga === 'black';
  return (neutral ? 0 : hue(ha) - hue(hb)) || hb.l - ha.l;
}
