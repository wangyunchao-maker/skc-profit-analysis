import { METRIC_CONFIG } from '../config/metrics';
import type { MetricKey } from '../config/metrics';

/** 空值显示占位符 */
export const PLACEHOLDER = '-';

function toFixedSafe(value: number, digits: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(value: number | null): string {
  if (value === null || Number.isNaN(value)) return PLACEHOLDER;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}¥${toFixedSafe(abs, 2)}`;
}

export function formatCount(value: number | null): string {
  if (value === null || Number.isNaN(value)) return PLACEHOLDER;
  return Number.isInteger(value) ? value.toLocaleString('zh-CN') : toFixedSafe(value, 2);
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return PLACEHOLDER;
  return `${(value * 100).toFixed(2)}%`;
}

export function formatMetric(key: MetricKey, value: number | null): string {
  const type = METRIC_CONFIG[key].type;
  if (type === 'money') return formatMoney(value);
  if (type === 'percent') return formatPercent(value);
  return formatCount(value);
}

/** 利润/利润率数值是否该标红（具有实际比较意义） */
export function formatProfitClass(value: number | null): string {
  if (value === null) return 'text-gray-500';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

/** 消费者退款等金额列：有实际金额（非空且非 0）时标红 */
export function hasMoneyValue(value: number | null): boolean {
  return value !== null && !Number.isNaN(value) && value !== 0;
}