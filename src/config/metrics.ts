import type { ProductMetrics } from '../types/product';

export type MetricKey = keyof ProductMetrics;

export interface MetricConfig {
  label: string;
  type: 'count' | 'money' | 'percent';
}

export const METRIC_CONFIG: Record<MetricKey, MetricConfig> = {
  settlementQty: { label: '结算单量', type: 'count' },
  settlementAmount: { label: '结算金额', type: 'money' },
  principal: { label: '本金', type: 'money' },
  afterSalesAmount: { label: '消费者及履约保障-售后', type: 'money' },
  nonMerchantAfterSalesSubsidy: { label: '非商责售后补贴金额', type: 'money' },
  nonMerchantAfterSalesAdjustment: { label: '非商责售后补贴调整', type: 'money' },
  consumerRefund: { label: '消费者退款', type: 'money' },
  afterSalesRate: { label: '售后率', type: 'percent' },
  profit: { label: '利润', type: 'money' },
  profitRate: { label: '利润率', type: 'percent' },
};

/** 默认开启的趋势指标 */
export const DEFAULT_TREND_KEYS: MetricKey[] = ['settlementAmount', 'profit', 'profitRate'];

/** 需要认为百分比类型的指标 */
export const PERCENT_KEYS: MetricKey[] = ['afterSalesRate', 'profitRate'];

/** 金额/数量类（左轴） */
export const LEFT_AXIS_KEYS: MetricKey[] = [
  'settlementQty',
  'settlementAmount',
  'principal',
  'afterSalesAmount',
  'nonMerchantAfterSalesSubsidy',
  'nonMerchantAfterSalesAdjustment',
  'consumerRefund',
  'profit',
];

/** 可排序指标 */
export const SORTABLE_KEYS: MetricKey[] = [
  'settlementQty',
  'settlementAmount',
  'principal',
  'consumerRefund',
  'afterSalesAmount',
  'afterSalesRate',
  'profit',
  'profitRate',
];