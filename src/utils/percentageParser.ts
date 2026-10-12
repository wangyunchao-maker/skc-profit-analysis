/**
 * 百分比解析。Excel 可能出现 8.88% / -2.15% / 0 / 0.0888 / "-"。
 * 内部统一使用小数：8.88% -> 0.0888，0.0888 -> 0.0888。
 */
import { parseNumber } from './valueParser';

export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // 数字：Excel 中通常已是小数比例，直接返回
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return null;
    if (trimmed.endsWith('%')) {
      const inner = trimmed.slice(0, -1);
      const num = parseNumber(inner);
      return num === null ? null : num / 100;
    }
    // 无 % 号字符串，尝试按普通数字解析（可能是小数比例，也可能是数值）
    const num = parseNumber(trimmed);
    return num;
  }

  return null;
}