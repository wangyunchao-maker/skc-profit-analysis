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
export interface RawProduct extends ProductBase, ProductMetrics {
  /** SKU 维度标识（仅 SKU 粒度月度文件存在） */
  skuId?: string;
  skuCode?: string;
  /** 进价（仅 SKU 粒度月度文件存在，用于明细展示） */
  unitCost?: number | null;
}

/** 汇总多维分析结果的主数据结构 */
export interface ProductAnalysis {
  skcId: string;
  spuId?: string;
  productName?: string;
  image?: string;
  summary: ProductMetrics;
  months: Record<string, ProductMetrics>;
  /** 各月的 SKU 粒度明细（仅当该月文件为 SKU 粒度时存在） */
  skuDetails?: Record<string, RawProduct[]>;
}