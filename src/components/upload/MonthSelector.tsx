import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  value: string | null;
  options: string[];
  onChange: (month: string) => void;
  isDuplicate: boolean;
}

const MONTH_RE = /^(\d{4})-(\d{2})$/;

/**
 * 月份选择器：先选年份、再点月份，避免在近百个选项里滚动查找。
 * 默认定位到当前年份或已选月份所在年份。
 */
export function MonthSelector({ value, options, onChange, isDuplicate }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const years = useMemo(
    () =>
      [...new Set(options.map((o) => Number(o.slice(0, 4))).filter((y) => Number.isFinite(y)))].sort(
        (a, b) => a - b,
      ),
    [options],
  );
  const minYear = years[0] ?? new Date().getFullYear();
  const maxYear = years[years.length - 1] ?? minYear;

  const clampYear = (y: number) => Math.min(maxYear, Math.max(minYear, y));
  const currentYear = value && MONTH_RE.test(value) ? Number(value.slice(0, 4)) : new Date().getFullYear();
  const [year, setYear] = useState(() => clampYear(currentYear));

  // 每次打开时回到已选月份所在年份
  useEffect(() => {
    if (open) setYear(clampYear(currentYear));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const yearMonths = options.filter((o) => o.startsWith(`${year}-`));

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="选择月份"
        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
          isDuplicate
            ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
            : value
              ? 'border-blue-300 bg-white text-gray-700 focus:ring-blue-400'
              : 'border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-400'
        }`}
      >
        {value ?? '选择月份'}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => clampYear(y - 1))}
              disabled={year <= minYear}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="上一年"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">{year} 年</span>
            <button
              type="button"
              onClick={() => setYear((y) => clampYear(y + 1))}
              disabled={year >= maxYear}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="下一年"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {yearMonths.map((m) => {
              const active = m === value;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  className={`rounded px-2 py-1.5 text-sm ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {Number(m.slice(5))}月
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
