/** 内部统一月份格式：YYYY-MM */
export type MonthKey = `${number}-${string}`;

/** 标准化月份为 YYYY-MM，两位数 = String(month).padStart(2, '0') */
function pad(month: number): string {
  return String(month).padStart(2, '0');
}

/**
 * 仅根据文件名识别月份，绝不读取 Excel 内容。
 * 支持：2026-06 / 2026_06 / 2026.06 / 202606 / 2026年06月 / 2026年6月
 *       商品利润2026-06 / 202606商品利润 等
 */
export function parseMonthFromFilename(filename: string): string | null {
  if (!filename) return null;
  // 去除扩展名
  const base = filename.replace(/\.[^.]+$/, '');

  // 匹配 YYYY[分隔]MM
  const re = /((?:19|20)\d{2})(?:[-._/年]|年)?\s*(\d{1,2})(?:月)?/;
  const m = base.match(re);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${year}-${pad(month)}`;
}

/** 月份展示形式：2026-06 */
export function formatMonthLabel(month: string): string {
  return month;
}

/** 按时间升序排序月份 */
export function sortMonths(months: string[]): string[] {
  return [...months].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** 生成月份下拉选项（近若干年） */
export function generateMonthOptions(startYear = 2023, endYear = 2028): string[] {
  const res: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      res.push(`${y}-${pad(mo)}`);
    }
  }
  return res;
}