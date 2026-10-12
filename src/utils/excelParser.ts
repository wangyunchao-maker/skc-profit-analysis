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
    afterSalesRate: null,
    profit: null,
    profitRate: null,
  };
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

  const rows: RawProduct[] = [];
  const duplicateSkcs: string[] = [];
  const seen = new Set<string>();

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
    if (seen.has(skc)) {
      duplicateSkcs.push(skc);
      continue;
    }
    seen.add(skc);
    rows.push(rec);
  }

  return { fileName: file.name, hasSkcId, presentFields, rows, duplicateSkcs };
}