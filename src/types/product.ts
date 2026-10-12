export interface ProductMetrics {
  settlementQty: number | null;
  settlementAmount: number | null;
  principal: number | null;
  afterSalesAmount: number | null;
  nonMerchantAfterSalesSubsidy: number | null;
  nonMerchantAfterSalesAdjustment: number | null;
  consumerRefund: number | null;
  afterSalesRate: number | null;
  profit: number | null;
  profitRate: number | null;
}

export interface ProductBase {
  productName?: string;
  image?: string;
  skcId: string;
  spuId?: string;
  skcCode?: string;
  specification?: string;
}

/** 单个 Excel 行标准化后的形态：基础信息 + 指标 */
export interface RawProduct extends ProductBase, ProductMetrics {}

/** 汇总多维分析结果的主数据结构 */
export interface ProductAnalysis {
  skcId: string;
  spuId?: string;
  productName?: string;
  image?: string;
  summary: ProductMetrics;
  months: Record<string, ProductMetrics>;
}