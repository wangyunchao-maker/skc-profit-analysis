/**
 * Excel 读取与标准化。仅读取第一个 Sheet，不做任何匹配/图表/UI 逻辑。
 */
import * as XLSX from 'xlsx';
import { NUMBER_FIELDS, PERCENT_FIELDS, type InternalField } from '../config/columnAliases';
import type { ParsedExcel } from '../types/excel';
import type { RawProduct } from '../types/product';
import { mapHeaderToField } from './columnMapper';
import { extractEmbeddedImages } from './imageExtractor';
import { parsePercent } from './percentageParser';
import { parseNumber } from './valueParser';

function toText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function toSkc(value: unknown): string {
  const s = toText(value);
  return s ?? '';
}

function emptyRow(): RawProduct {
  return {
    skcId: '',
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
}

/** SKU 粒度文件按 SKC 汇总时，这些数值/比率字段直接相加（本金按各 SKU 真实成本相加，
 * 售后率与 SKC 粒度文件口径一致，同样为各 SKU 值相加）。比率类字段不参与加权。 */
const ADDITIVE_FIELDS: InternalField[] = [
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

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

/** 退款率为派生指标（平台文件不提供该列）：消费者退款 ÷ 结算金额 */
function deriveRefundRate(consumerRefund: number | null, settlementAmount: number | null): number | null {
  if (consumerRefund === null || settlementAmount === null || settlementAmount === 0) return null;
  return consumerRefund / settlementAmount;
}

function assignField(rec: RawProduct, field: InternalField, value: unknown): void {
  switch (field) {
    case 'skcId':
      rec.skcId = toSkc(value);
      break;
    case 'spuId':
      rec.spuId = toText(value);
      break;
    case 'productName':
      rec.productName = toText(value);
      break;
    case 'skcCode':
      rec.skcCode = toText(value);
      break;
    case 'skuId':
      rec.skuId = toText(value);
      break;
    case 'skuCode':
      rec.skuCode = toText(value);
      break;
    case 'specification':
      rec.specification = toText(value);
      break;
    case 'image':
      rec.image = toText(value);
      break;
    default:
      if (PERCENT_FIELDS.includes(field)) {
        (rec as unknown as Record<string, number | null>)[field] = parsePercent(value);
      } else if (NUMBER_FIELDS.includes(field)) {
        (rec as unknown as Record<string, number | null>)[field] = parseNumber(value);
      }
  }
}

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const empty: ParsedExcel = {
    fileName: file.name,
    hasSkcId: false,
    presentFields: new Set(),
    rows: [],
    skuRows: [],
    duplicateSkcs: [],
  };
  if (!sheet) return empty;

  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  if (jsonRows.length === 0) return empty;

  // 用第一行对象键作为表头，映射到内部字段
  const headerToField = new Map<string, InternalField>();
  for (const original of Object.keys(jsonRows[0])) {
    const field = mapHeaderToField(original);
    if (field) headerToField.set(original, field);
  }

  const presentFields = new Set<string>(headerToField.values());
  const hasSkcId = presentFields.has('skcId');
  // 月度文件可能按 SKU 粒度导出（同一 SKC 对应多行），需要按 SKC 汇总
  const skuLevel = presentFields.has('skuId') || presentFields.has('skuCode');

  const rows: RawProduct[] = [];
  /** SKU 粒度文件保留原始 SKU 行，供详情页展开查看 */
  const skuRows: RawProduct[] = [];
  const duplicateSkcs: string[] = [];
  const seen = new Set<string>();
  const bySkc = new Map<string, RawProduct>();

  const images = await extractEmbeddedImages(buffer);

  for (let i = 0; i < jsonRows.length; i++) {
    const raw = jsonRows[i]!;
    const rec = emptyRow();
    for (const [original, field] of headerToField) {
      assignField(rec, field, raw[original]);
    }
    // 内嵌图片按行挂载：json 行 i 对应 sheet 行 i+1（0 行为表头）
    const sheetRow = i + 1;
    const img = images.get(sheetRow);
    if (img) rec.image = img;

    const skc = rec.skcId;
    if (!skc) continue; // 跳过无 SKC 的行（如空行/合计行）

    if (!skuLevel) {
      // SKC 粒度文件：每个 SKC 一行，出现重复视为异常
      if (seen.has(skc)) {
        duplicateSkcs.push(skc);
        continue;
      }
      seen.add(skc);
      rows.push(rec);
      continue;
    }

    // SKU 粒度文件：把同一 SKC 的多个 SKU 汇总成一条 SKC 记录，同时保留 SKU 明细
    skuRows.push(rec);
    let merged = bySkc.get(skc);
    if (!merged) {
      merged = { ...rec };
      bySkc.set(skc, merged);
      rows.push(merged);
    } else {
      const dst = merged as unknown as Record<string, number | null>;
      const src = rec as unknown as Record<string, number | null>;
      for (const field of ADDITIVE_FIELDS) {
        dst[field] = addNullable(dst[field], src[field]);
      }
      if (!merged.image && rec.image) merged.image = rec.image;
    }
  }

  // SKU 汇总后的比率字段需重算，避免把比率直接相加
  if (skuLevel) {
    for (const merged of bySkc.values()) {
      merged.profitRate =
        merged.profit !== null && merged.principal !== null && merged.principal !== 0
          ? merged.profit / merged.principal
          : null;
    }
  }

  // 退款率为派生指标，按「消费者退款 ÷ 结算金额」在各层级重算（SKU 汇总后的 SKC 行、单个 SKU 行同理）
  for (const row of rows) {
    row.refundRate = deriveRefundRate(row.consumerRefund, row.settlementAmount);
  }
  for (const row of skuRows) {
    row.refundRate = deriveRefundRate(row.consumerRefund, row.settlementAmount);
  }

  return { fileName: file.name, hasSkcId, presentFields, rows, skuRows, duplicateSkcs };
}