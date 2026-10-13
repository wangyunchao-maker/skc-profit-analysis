import type { RawProduct } from './product';

/** 解析后的单个 Excel 文件结果 */
export interface ParsedExcel {
  fileName: string;
  /** 是否存在 SKC ID 字段 */
  hasSkcId: boolean;
  /** 表头中识别到的内部字段集合 */
  presentFields: Set<string>;
  /** 标准化后的数据行（SKC 非空；SKU 粒度文件已按 SKC 汇总） */
  rows: RawProduct[];
  /** SKU 粒度文件的原始 SKU 明细行（SKC 粒度文件为空） */
  skuRows: RawProduct[];
  /** SKC 粒度文件内重复的 SKC 列表（SKU 粒度文件为空） */
  duplicateSkcs: string[];
}

/** 已确认月份并完成解析的月度文件 */
export interface ParsedMonthlyFile {
  month: string;
  parsed: ParsedExcel;
}

/** 汇总分析运行后的状态信息 */
export interface AnalysisInfo {
  summaryStatus: string;
  skcCount: number;
  monthCount: number;
  timeRange: [string, string] | null;
}