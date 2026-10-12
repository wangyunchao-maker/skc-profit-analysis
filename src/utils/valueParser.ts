/**
 * 数值解析。必须兼容：
 *   2771.58 / "2771.58" / "2,771.58" / "¥2771.58" / "￥2771.58" / "-" / "" / null / undefined
 */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return null;
    const cleaned = trimmed
      .replace(/[￥¥,\s]/g, '')
      .replace(/^[(（](.+)[)）]$/, '-$1');
    if (cleaned === '' || cleaned === '-') return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}