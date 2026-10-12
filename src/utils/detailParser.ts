/**
 * 多维度明细导出（多 Sheet 工作簿）解析。
 *  - 结算交易收入明细：作为收入基准，按 SKC+SPU 汇总结算金额
 *  - 售后问题明细：按 SKC+SPU 汇总售后金额/条数
 *  - 消费者退款明细：按 SKC+SPU 汇总消费者退款金额/条数
 *  - 售后率 = 售后金额/结算收入；退款率 = 退款金额/结算收入
 * 同一 SKC+SPU 下的多个 SKU 合并为一行展示。
 */
import * as XLSX from 'xlsx';
import type { AfterSaleRow, DetailExportData, RefundRow } from '../types/detail';
import { parseNumber } from './valueParser';

/**
 * 多维度明细导出（多 Sheet 工作簿）解析。
 *  - 结算交易收入明细：按 SKC+SPU 分组汇总结算金额，作为各 SKU 的收入分母
 *  - 售后问题明细：一条 SKU 一行（不合并），记录售后金额/条数
 *  - 消费者退款明细：一条 SKU 一行（不合并），记录退款金额/条数
 *  - 售后率 = 售后金额 / 所在 SKC+SPU 组的结算收入；退款率同理
 */

const SHEET_INCOME = '结算交易收入明细';
const SHEET_AFTERSALES = '售后问题明细';
const SHEET_REFUND = '消费者退款明细';

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s === '' ? '' : s;
}

function toNum(v: unknown): number | null {
  return parseNumber(v);
}

/** 分组键：SKC+SPU，缺任一则退化为可用标识，避免不同商品混组 */
function groupKey(skcId: string, spuId: string): string {
  if (skcId && spuId) return `skc:${skcId}|spu:${spuId}`;
  if (skcId) return `skc:${skcId}`;
  if (spuId) return `spu:${spuId}`;
  return 'none';
}

/** 读取指定 Sheet 为数组对象（原始值） */
function readSheet<T>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: null, raw: true });
}

interface IncomeRow {
  spu?: unknown;
  skc?: unknown;
  '申报价格'?: unknown;
  '成本价'?: unknown;
  '结算金额'?: unknown;
}

interface AfterSaleDetailRow {
  spu?: unknown;
  skc?: unknown;
  sku?: unknown;
  'sku属性'?: unknown;
  '申报价格'?: unknown;
  '成本价'?: unknown;
  '售后金额'?: unknown;
  '备货单号'?: unknown;
  '结算日期'?: unknown;
}

interface RefundDetailRow {
  spu?: unknown;
  skc?: unknown;
  sku?: unknown;
  '申报价格'?: unknown;
  '成本价'?: unknown;
  '消费者退款'?: unknown;
  '备货单号'?: unknown;
  '结算日期'?: unknown;
}

interface GroupMeta {
  skcId: string;
  spuId: string;
  declaredPrice: number | null;
  costPrice: number | null;
}

export async function parseDetailExport(file: File): Promise<DetailExportData> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const issues: string[] = [];
  const incomeRows = readSheet<IncomeRow>(wb, SHEET_INCOME);
  if (incomeRows.length === 0) issues.push(`缺少「${SHEET_INCOME}」工作表或表头不符`);

  // 1) 收入基准 + 分组元信息（按 SKC+SPU）
  const incomeByKey = new Map<string, number>();
  const metaByKey = new Map<string, GroupMeta>();
  const ensureMeta = (key: string, skcId: string, spuId: string) => {
    if (!metaByKey.has(key)) {
      metaByKey.set(key, { skcId, spuId, declaredPrice: null, costPrice: null });
    }
    return metaByKey.get(key)!;
  };

  for (const r of incomeRows) {
    const skcId = toStr(r.skc);
    const spuId = toStr(r.spu);
    if (!skcId && !spuId) continue;
    const key = groupKey(skcId, spuId);
    const income = toNum(r['结算金额']) ?? 0;
    incomeByKey.set(key, (incomeByKey.get(key) ?? 0) + income);
    const meta = ensureMeta(key, skcId, spuId);
    if (meta.declaredPrice === null) meta.declaredPrice = toNum(r['申报价格']);
    if (meta.costPrice === null) meta.costPrice = toNum(r['成本价']);
  }

  // 2) 售后问题明细：一条 SKU 一行（同 SKU 跨日期聚合），比率用所在 SKC+SPU 组收入
  const aftersalesBySku = new Map<string, AfterSaleRow>();
  const seenAftersales = new Set<string>();
  for (const r of readSheet<AfterSaleDetailRow>(wb, SHEET_AFTERSALES)) {
    const sku = toStr(r.sku);
    const skcId = toStr(r.skc);
    const spuId = toStr(r.spu);
    const key = groupKey(skcId, spuId);
    const amount = toNum(r['售后金额']) ?? 0;
    if (amount === 0 && !(r['售后金额'] !== null && r['售后金额'] !== undefined)) continue;
    // 去重：同 SKU + 备货单号 + 金额 + 日期 完全相同的明细只计一次
    const dedupKey = `${sku}|${toStr(r['备货单号'])}|${amount}|${toStr(r['结算日期'])}`;
    if (seenAftersales.has(dedupKey)) continue;
    seenAftersales.add(dedupKey);
    const income = incomeByKey.get(key) ?? 0;
    const meta = ensureMeta(key, skcId, spuId);
    const skuKey = sku || `${key}|sku`;
    const cur = aftersalesBySku.get(skuKey);
    if (cur) {
      cur.afterSalesAmount += amount;
      cur.afterSalesQty += 1;
      cur.afterSalesRate = income > 0 ? cur.afterSalesAmount / income : null;
    } else {
      aftersalesBySku.set(skuKey, {
        skuId: sku,
        skcId,
        spuId,
        skuAttr: toStr(r['sku属性']),
        declaredPrice: toNum(r['申报价格']) ?? meta.declaredPrice,
        costPrice: toNum(r['成本价']) ?? meta.costPrice,
        afterSalesAmount: amount,
        afterSalesQty: 1,
        afterSalesRate: income > 0 ? amount / income : null,
        incomeAmount: income,
      });
    }
  }
  const afterSales = [...aftersalesBySku.values()];

  // 3) 消费者退款明细：一条 SKU 一行（同 SKU 跨日期聚合），比率用所在组收入
  const refundsBySku = new Map<string, RefundRow>();
  const seenRefunds = new Set<string>();
  for (const r of readSheet<RefundDetailRow>(wb, SHEET_REFUND)) {
    const sku = toStr(r.sku);
    const skcId = toStr(r.skc);
    const spuId = toStr(r.spu);
    const key = groupKey(skcId, spuId);
    const amount = toNum(r['消费者退款']) ?? 0;
    if (amount === 0 && !(r['消费者退款'] !== null && r['消费者退款'] !== undefined)) continue;
    // 去重：同 SKU + 备货单号 + 金额 + 日期 完全相同的明细只计一次
    const dedupKey = `${sku}|${toStr(r['备货单号'])}|${amount}|${toStr(r['结算日期'])}`;
    if (seenRefunds.has(dedupKey)) continue;
    seenRefunds.add(dedupKey);
    const income = incomeByKey.get(key) ?? 0;
    const meta = ensureMeta(key, skcId, spuId);
    const skuKey = sku || `${key}|sku`;
    const cur = refundsBySku.get(skuKey);
    if (cur) {
      cur.refundAmount += amount;
      cur.refundQty += 1;
      cur.refundRate = income > 0 ? cur.refundAmount / income : null;
    } else {
      refundsBySku.set(skuKey, {
        skuId: sku,
        skcId,
        spuId,
        declaredPrice: toNum(r['申报价格']) ?? meta.declaredPrice,
        costPrice: toNum(r['成本价']) ?? meta.costPrice,
        refundAmount: amount,
        refundQty: 1,
        refundRate: income > 0 ? amount / income : null,
        incomeAmount: income,
      });
    }
  }
  const refunds = [...refundsBySku.values()];

  return {
    fileName: file.name,
    afterSales,
    refunds,
    incomeSkuCount: incomeByKey.size,
    issues,
  };
}
