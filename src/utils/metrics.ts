import { METRIC_CONFIG, type MetricKey } from '../config/metrics';
import type { ProductAnalysis, ProductMetrics } from '../types/product';

/** 空指标对象 */
export function emptyMetrics(): ProductMetrics {
  const out = {} as ProductMetrics;
  (Object.keys(METRIC_CONFIG) as MetricKey[]).forEach((k) => {
    out[k] = null;
  });
  return out;
}

/** 取某 SKC 在某月的指标，缺失返回空对象（不视作 0） */
export function getMonthMetrics(product: ProductAnalysis, month: string): ProductMetrics {
  return product.months[month] ?? emptyMetrics();
}

/** 汇总本月度数值（空值忽略） */
export function sumMetrics(metricsList: ProductMetrics[]): ProductMetrics {
  const out = emptyMetrics();
  (Object.keys(METRIC_CONFIG) as MetricKey[]).forEach((k) => {
    let sum: number | null = null;
    for (const m of metricsList) {
      if (m[k] !== null) {
        sum = (sum ?? 0) + (m[k] as number);
      }
    }
    out[k] = sum;
  });
  return out;
}