/** 售后 / 退款明细：一行一条 SKU（不合并 SKU），按 SKC+SPU 作为分组核算收入分母与比率 */

export interface AfterSaleRow {
  skuId: string; // 单条 SKU，一行一组
  skcId: string;
  spuId: string;
  skuAttr: string;
  declaredPrice: number | null; // 申报价格
  costPrice: number | null; // 成本价
  afterSalesAmount: number; // 该 SKU 的售后金额
  afterSalesQty: number; // 该 SKU 的售后量
  afterSalesRate: number | null; // 售后率 = 售后金额 / 所在 SKC+SPU 组的结算收入
  incomeAmount: number; // 该 SKU 所属 SKC+SPU 组的结算收入（分母）
}

export interface RefundRow {
  skuId: string; // 单条 SKU，一行一组
  skcId: string;
  spuId: string;
  declaredPrice: number | null; // 申报价格
  costPrice: number | null; // 成本价
  refundAmount: number; // 该 SKU 的消费者退款金额
  refundQty: number; // 该 SKU 的消费者退款量
  refundRate: number | null; // 退款率 = 退款金额 / 所在 SKC+SPU 组的结算收入
  incomeAmount: number; // 该 SKU 所属 SKC+SPU 组的结算收入（分母）
}

export interface DetailExportData {
  fileName: string;
  afterSales: AfterSaleRow[];
  refunds: RefundRow[];
  /** 收入明细中出现的 sku 总数 */
  incomeSkuCount: number;
  /** 提示信息（如缺失 Sheet） */
  issues: string[];
}
