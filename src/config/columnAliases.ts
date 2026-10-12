/**
 * 中文表头 -> 内部字段 的映射别名配置。
 * 业务代码里永远不要直接使用中文表头。
 */
export const COLUMN_ALIASES = {
  productName: ['商品名称', '产品名称', '名称'],
  skcId: ['SKC ID', 'SKCID', 'SKC_ID', 'skc id', 'SKC'],
  spuId: ['SPU ID', 'SPUID', 'SPU_ID', 'spu id', 'SPU'],
  skcCode: ['SKC货号', 'SKC货号ID', '货号', 'SKC编号'],
  specification: ['商品规格', '规格', 'SPU规格'],
  image: ['图片', '商品图片', '主图'],

  settlementQty: ['结算单量', '总结算单量', '结算数量'],
  settlementAmount: ['结算金额', '总结算金额'],
  principal: ['本金'],
  afterSalesAmount: ['消费及履约保障-售后', '消费者及履约保障-售后', '售后'],
  nonMerchantAfterSalesSubsidy: ['非商责售后补贴金额'],
  nonMerchantAfterSalesAdjustment: ['非商责售后补贴调整'],
  consumerRefund: ['消费者退款', '退款'],
  afterSalesRate: ['售后率'],
  profit: ['利润', '总结算利润'],
  profitRate: ['利润率', '总利润率'],
} as const;

export type InternalField = keyof typeof COLUMN_ALIASES;

/** 主指标字段（数值类）：
 * 将表头映射后，这些字段需要进一步按金额/百分比解析 */
export const NUMBER_FIELDS: InternalField[] = [
  'settlementQty',
  'settlementAmount',
  'principal',
  'afterSalesAmount',
  'nonMerchantAfterSalesSubsidy',
  'nonMerchantAfterSalesAdjustment',
  'consumerRefund',
  'profit',
];

export const PERCENT_FIELDS: InternalField[] = ['afterSalesRate', 'profitRate'];