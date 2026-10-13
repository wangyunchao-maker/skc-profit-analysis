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

/** 消费者退款、售后等金额列：有实际金额（非空且非 0）时标红 */
export function hasMoneyValue(value: number | null): boolean {
  return value !== null && !Number.isNaN(value) && value !== 0;
}

/** 明细表中需要标红的负向金额列（退款、售后） */
const RED_MONEY_KEYS: MetricKey[] = ['consumerRefund', 'afterSalesAmount'];

/** 明细表中需要标绿的正向金额列（补贴） */
const GREEN_MONEY_KEYS: MetricKey[] = ['nonMerchantAfterSalesSubsidy', 'nonMerchantAfterSalesAdjustment'];

/** 明细表金额列颜色：退款/售后有金额标红，补贴有金额标绿，其余返回 null */
export function moneyHighlightClass(key: MetricKey, value: number | null): string | null {
  if (!hasMoneyValue(value)) return null;
  if (RED_MONEY_KEYS.includes(key)) return 'text-red-600';
  if (GREEN_MONEY_KEYS.includes(key)) return 'text-emerald-600';
  return null;
}