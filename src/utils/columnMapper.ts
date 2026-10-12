/**
 * 中文表头 -> 内部字段 的运行时映射。
 */
import { COLUMN_ALIASES, type InternalField } from '../config/columnAliases';

/** 表头归一化：去空白、去下划线/中划线、转小写 */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_\-\/]/g, '');
}

const aliasToField = new Map<string, InternalField>();
for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) {
    aliasToField.set(normalizeHeader(alias), field as InternalField);
  }
}

export function mapHeaderToField(header: string): InternalField | null {
  return aliasToField.get(normalizeHeader(header)) ?? null;
}