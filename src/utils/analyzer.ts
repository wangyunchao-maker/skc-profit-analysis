/**
 * 分析流程编排：读取月度 SKU 文件 -> 校验月份 -> 按 SKC 汇总 -> 生成结果。
 * 不再需要汇总文件，汇总指标由各月 SKU 明细累加得出。
 */
import type { AnalysisInfo, ParsedMonthlyFile } from '../types/excel';
import type { ProductAnalysis } from '../types/product';
import type { ValidationIssue } from '../types/validation';
import { parseExcel } from './excelParser';
import { parseMonthFromFilename } from './monthParser';
import { buildAnalysis } from './productMatcher';

export interface UploadedMonthly {
  id: string;
  file: File;
  name: string;
  month: string | null;
}

export interface AnalyzeResult {
  products: ProductAnalysis[];
  issues: ValidationIssue[];
  info: AnalysisInfo;
}

/** 上传时立即识别月份（仅依据文件名） */
export function detectMonthFromFile(fileName: string): string | null {
  return parseMonthFromFilename(fileName);
}

/** 月份预校验：返回错误级别 issues（重复月份 / 未设置月份） */
export function validateMonths(monthlies: UploadedMonthly[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>(); // month -> fileName
  for (const mf of monthlies) {
    if (!mf.month) {
      issues.push({
        type: 'month-unset',
        level: 'error',
        fileName: mf.name,
        message: `文件「${mf.name}」尚未设置月份。`,
      });
      continue;
    }
    if (seen.has(mf.month)) {
      issues.push({
        type: 'month-duplicate',
        level: 'error',
        month: mf.month,
        message: `检测到重复月份：${mf.month}（${seen.get(mf.month)} 与 ${mf.name}）。`,
      });
    } else {
      seen.set(mf.month, mf.name);
    }
  }

  return issues;
}

/** 校验个月内不允许两个文件用同一月份 */
export function hasDuplicateMonths(monthlies: Array<{ month: string | null }>): boolean {
  const seen = new Set<string>();
  for (const mf of monthlies) {
    if (mf.month) {
      if (seen.has(mf.month)) return true;
      seen.add(mf.month);
    }
  }
  return false;
}

/** 完整分析流程（在点击「开始分析」时调用一次） */
export async function analyze(monthlies: UploadedMonthly[]): Promise<AnalyzeResult> {
  const preIssues: ValidationIssue[] = [];

  // 读取各月度文件：必须是带 SKC ID 的 SKU 维度导出
  const monthliesParsed: ParsedMonthlyFile[] = [];
  for (const mf of monthlies) {
    if (!mf.month) continue;
    const parsed = await parseExcel(mf.file);
    if (!parsed.hasSkcId) {
      preIssues.push({
        type: 'missing-skc',
        level: 'error',
        fileName: parsed.fileName,
        message: `月度文件无法使用：没有找到 SKC ID 字段，无法把 SKU 明细归并到 SKC（${parsed.fileName}）。`,
      });
      continue;
    }
    if (!parsed.isSkuLevel) {
      preIssues.push({
        type: 'missing-field',
        level: 'error',
        fileName: parsed.fileName,
        message: `月度文件必须按 SKU 维度导出：未找到「SKU ID」或「SKU货号」字段，无法按 SKC 合并计算（${parsed.fileName}）。`,
      });
      continue;
    }
    monthliesParsed.push({ month: mf.month, parsed });
  }

  return buildAnalysis(monthliesParsed, preIssues);
}
