/**
 * 汇总文件与月度文件按 SKC ID 匹配，生成 ProductAnalysis[] 与 ValidationIssue[]。
 */
import type { AnalysisInfo, ParsedExcel, ParsedMonthlyFile } from '../types/excel';
import type { ProductAnalysis, ProductMetrics, RawProduct } from '../types/product';
import type { ValidationIssue } from '../types/validation';
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

function extractMetrics(row: RawProduct): ProductMetrics {
  const out: ProductMetrics = {
    settlementQty: null,
    settlementAmount: null,
    principal: null,
    afterSalesAmount: null,
    nonMerchantAfterSalesSubsidy: null,
    nonMerchantAfterSalesAdjustment: null,
    consumerRefund: null,
    refundRate: null,
    afterSalesRate: null,
    profit: null,
    profitRate: null,
  };
  for (const k of METRIC_KEYS) {
    out[k] = row[k];
  }
  return out;
}

export interface MatchResult {
  products: ProductAnalysis[];
  issues: ValidationIssue[];
  info: AnalysisInfo;
}

export function buildAnalysis(
  summary: ParsedExcel,
  monthlies: ParsedMonthlyFile[],
  preIssues: ValidationIssue[],
): MatchResult {
  const issues: ValidationIssue[] = [...preIssues];

  // 汇总文件字段缺失检测
  const requiredFields: Array<[keyof RawProduct, string]> = [
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
  for (const [field, label] of requiredFields) {
    if (!summary.presentFields.has(field)) {
      issues.push({
        type: 'missing-field',
        level: 'warning',
        fileName: summary.fileName,
        message: `汇总文件缺少字段「${label}」，该字段将被视为空。`,
      });
    }
  }

  // 汇总文件内重复 SKC
  for (const skc of summary.duplicateSkcs) {
    issues.push({
      type: 'duplicate-skc',
      level: 'warning',
      fileName: summary.fileName,
      skcId: skc,
      message: `汇总文件内存在重复 SKC：${skc}`,
    });
  }

  // 主表：以汇总文件为基准
  const bySkc = new Map<string, ProductAnalysis>();
  for (const row of summary.rows) {
    bySkc.set(row.skcId, {
      skcId: row.skcId,
      spuId: row.spuId,
      productName: row.productName,
      image: row.image,
      summary: extractMetrics(row),
      months: {},
    });
  }

  // 挂载月度
  const monthPresence: Record<string, { shown: number; matched: number }> = {};
  for (const { month, parsed } of monthlies) {
    monthPresence[month] = { shown: 0, matched: 0 };
    // SKU 粒度文件：按 SKC 挂载 SKU 明细，供详情页展开
    if (parsed.skuRows.length > 0) {
      for (const skuRow of parsed.skuRows) {
        const product = bySkc.get(skuRow.skcId);
        if (!product) continue;
        if (!product.skuDetails) product.skuDetails = {};
        (product.skuDetails[month] ??= []).push(skuRow);
      }
    }
    for (const row of parsed.rows) {
      monthPresence[month].shown++;
      const product = bySkc.get(row.skcId);
      if (product) {
        product.months[month] = extractMetrics(row);
        monthPresence[month].matched++;
      } else {
        issues.push({
          type: 'month-only-skc',
          level: 'warning',
          month,
          skcId: row.skcId,
          fileName: parsed.fileName,
          message: `月度文件出现但汇总不存在的 SKC：${row.skcId}（${month}）`,
        });
      }
    }
  }

  // 汇总存在但某月不存在（按月份汇总计数提示）
  const monthList = sortMonths(Object.keys(monthPresence));
  for (const month of monthList) {
    const total = bySkc.size;
    const missing = total - monthPresence[month].matched;
    if (missing > 0) {
      issues.push({
        type: 'summary-only-in-month',
        level: 'warning',
        month,
        message: `${month}：汇总含 ${total} 个 SKC，该月仅匹配到 ${monthPresence[month].matched} 个（${missing} 个 SKC 在该月无数据，显示为「-」）。`,
      });
    }
  }

  const products = Array.from(bySkc.values());

  const info: AnalysisInfo = {
    summaryStatus: summary.hasSkcId ? '读取成功' : '异常（缺少 SKC ID）',
    skcCount: products.length,
    monthCount: monthList.length,
    timeRange: monthList.length > 0 ? [monthList[0], monthList[monthList.length - 1]] : null,
  };

  return { products, issues, info };
}

export { METRIC_KEYS };