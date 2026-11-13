/**
 * 仅以月度 SKU 文件为数据源：按 SKC 汇总各月 SKU 数据，生成 ProductAnalysis[] 与 ValidationIssue[]。
 */
import type { AnalysisInfo, ParsedMonthlyFile } from '../types/excel';
import type { ProductAnalysis, ProductMetrics, RawProduct } from '../types/product';
import type { ValidationIssue } from '../types/validation';
import { emptyMetrics } from './metrics';
import { sortMonths } from './monthParser';

const METRIC_KEYS: (keyof ProductMetrics)[] = [
  'settlementQty',
  'settlementAmount',
  'principal',
  'afterSalesAmount',
  'nonMerchantAfterSalesSubsidy',
  'nonMerchantAfterSalesAdjustment',
  'consumerRefund',
  'refundRate',
  'afterSalesRate',
  'profit',
  'profitRate',
];

/** 跨月累加时直接相加的字段（售后率与平台口径一致，同样按各月值相加）；退款率/利润率在累加后重算 */
const ADDITIVE_KEYS: (keyof ProductMetrics)[] = [
  'settlementQty',
  'settlementAmount',
  'principal',
  'afterSalesAmount',
  'nonMerchantAfterSalesSubsidy',
  'nonMerchantAfterSalesAdjustment',
  'consumerRefund',
  'afterSalesRate',
  'profit',
];

/** 月度文件应包含的字段（缺失时提示，字段按空值处理） */
const REQUIRED_FIELDS: Array<[keyof RawProduct, string]> = [
  ['spuId', 'SPU ID'],
  ['productName', '商品名称'],
  ['settlementQty', '结算单量'],
  ['settlementAmount', '结算金额'],
  ['principal', '本金'],
  ['afterSalesAmount', '售后'],
  ['nonMerchantAfterSalesSubsidy', '非商责售后补贴金额'],
  ['nonMerchantAfterSalesAdjustment', '非商责售后补贴调整'],
  ['consumerRefund', '消费者退款'],
  ['afterSalesRate', '售后率'],
  ['profit', '利润'],
  ['profitRate', '利润率'],
];

function extractMetrics(row: RawProduct): ProductMetrics {
  const out = emptyMetrics();
  for (const k of METRIC_KEYS) {
    out[k] = row[k];
  }
  return out;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

/** 退款率为派生指标：消费者退款 ÷ 结算金额 */
function deriveRefundRate(consumerRefund: number | null, settlementAmount: number | null): number | null {
  if (consumerRefund === null || settlementAmount === null || settlementAmount === 0) return null;
  return consumerRefund / settlementAmount;
}

function deriveProfitRate(profit: number | null, principal: number | null): number | null {
  if (profit === null || principal === null || principal === 0) return null;
  return profit / principal;
}

export interface MatchResult {
  products: ProductAnalysis[];
  issues: ValidationIssue[];
  info: AnalysisInfo;
}

export function buildAnalysis(monthlies: ParsedMonthlyFile[], preIssues: ValidationIssue[] = []): MatchResult {
  const issues: ValidationIssue[] = [...preIssues];

  // 月度文件字段缺失检测
  for (const { month, parsed } of monthlies) {
    for (const [field, label] of REQUIRED_FIELDS) {
      if (!parsed.presentFields.has(field)) {
        issues.push({
          type: 'missing-field',
          level: 'warning',
          month,
          fileName: parsed.fileName,
          message: `「${parsed.fileName}」缺少字段「${label}」，该字段将被视为空。`,
        });
      }
    }
  }

  // SKC 列表 = 各月度文件 SKC 的并集；按月份先后顺序建立，保证展示顺序稳定
  const monthList = sortMonths(monthlies.map((m) => m.month));
  const parsedByMonth = new Map(monthlies.map((m) => [m.month, m.parsed]));
  const bySkc = new Map<string, ProductAnalysis>();

  for (const month of monthList) {
    const parsed = parsedByMonth.get(month);
    if (!parsed) continue;

    for (const row of parsed.rows) {
      let product = bySkc.get(row.skcId);
      if (!product) {
        product = {
          skcId: row.skcId,
          spuId: row.spuId,
          productName: row.productName,
          image: row.image,
          summary: emptyMetrics(),
          months: {},
        };
        bySkc.set(row.skcId, product);
      } else {
        // 基础信息以最早出现且非空的值为准
        if (!product.spuId && row.spuId) product.spuId = row.spuId;
        if (!product.productName && row.productName) product.productName = row.productName;
        if (!product.image && row.image) product.image = row.image;
      }

      product.months[month] = extractMetrics(row);
      for (const key of ADDITIVE_KEYS) {
        product.summary[key] = addNullable(product.summary[key], row[key]);
      }
    }

    // SKU 明细挂在对应 SKC 上，供详情页展开
    if (parsed.skuRows.length > 0) {
      for (const skuRow of parsed.skuRows) {
        const product = bySkc.get(skuRow.skcId);
        if (!product) continue;
        if (!product.skuDetails) product.skuDetails = {};
        (product.skuDetails[month] ??= []).push(skuRow);
      }
    }
  }

  // 汇总层的比率字段在跨月累加后重算
  for (const product of bySkc.values()) {
    product.summary.refundRate = deriveRefundRate(
      product.summary.consumerRefund,
      product.summary.settlementAmount,
    );
    product.summary.profitRate = deriveProfitRate(product.summary.profit, product.summary.principal);
  }

  const products = Array.from(bySkc.values());

  const info: AnalysisInfo = {
    skcCount: products.length,
    monthCount: monthList.length,
    timeRange: monthList.length > 0 ? [monthList[0], monthList[monthList.length - 1]] : null,
  };

  return { products, issues, info };
}

export { METRIC_KEYS };
