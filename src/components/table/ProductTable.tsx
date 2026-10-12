import { Fragment, useEffect, useMemo, useState } from 'react';
import { CheckSquare, ChevronDown, ChevronUp, ChevronsUpDown, Copy } from 'lucide-react';
import { METRIC_CONFIG, SORTABLE_KEYS, type MetricKey } from '../../config/metrics';
import type { ProductAnalysis } from '../../types/product';
import { formatMetric, formatProfitClass } from '../../utils/format';
import { ZoomImage } from '../ZoomImage';
import { ProductDetail } from './ProductDetail';

export interface SortConfig {
  key: MetricKey;
  dir: 'asc' | 'desc';
}

export type ProfitFilter = 'all' | 'profit' | 'loss';

interface ColumnDef {
  key: 'select' | 'image' | 'skcId' | 'spuId' | MetricKey | 'action';
  label: string;
  sticky?: 'left' | 'right';
}

const COLUMNS: ColumnDef[] = [
  { key: 'select', label: '勾选', sticky: 'left' },
  { key: 'image', label: '图片', sticky: 'left' },
  { key: 'skcId', label: 'SKC ID', sticky: 'left' },
  { key: 'spuId', label: 'SPU ID' },
  ...SORTABLE_KEYS.map((k) => ({ key: k as ColumnDef['key'], label: METRIC_CONFIG[k].label })),
  { key: 'action', label: '操作', sticky: 'right' },
];

const STICKY_LEFT = 'sticky left-0 z-10 bg-white';
const STICKY_RIGHT = 'sticky right-0 z-10 bg-white';
const RED_KEYS = new Set<string>(['consumerRefund', 'afterSalesAmount']);
const PAGE_SIZES = [10, 20, 50, 100, 200];

interface Props {
  products: ProductAnalysis[];
  months: string[];
  expanded: Set<string>;
  onToggleDetail: (skcId: string) => void;
  sort: SortConfig | null;
  onSort: (key: MetricKey) => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ProductTable({ products, months, expanded, onToggleDetail, sort, onSort }: Props) {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const current = page >= pageCount ? pageCount - 1 : page;

  // 数据量或每页条数变化时，页码回退到合法范围
  useEffect(() => {
    setPage((prev) => {
      const maxPage = Math.max(0, Math.ceil(products.length / pageSize) - 1);
      return Math.min(prev, maxPage);
    });
  }, [products.length, pageSize]);

  const pageRows = useMemo(
    () => products.slice(current * pageSize, current * pageSize + pageSize),
    [products, current, pageSize]
  );

  const pageSkcs = pageRows.map((p) => p.skcId);
  const allVisibleSelected = pageSkcs.length > 0 && pageSkcs.every((id) => selected.has(id));

  const toggleSelect = (skcId: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(skcId)) next.delete(skcId);
      else next.add(skcId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) pageSkcs.forEach((id) => next.delete(id));
      else pageSkcs.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleCopy = async () => {
    if (selected.size === 0) return;
    // 每个 SKC 一行
    const lines = products.filter((p) => selected.has(p.skcId)).map((p) => p.skcId).join('\n');
    const ok = await copyText(lines);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* 选择与复制工具条 */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? `已复制 ${selected.size} 项` : `复制选中的 SKC / SPU`}
        </button>
        <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
        {selected.size > 0 && (
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-blue-600 hover:text-blue-800">
            清空
          </button>
        )}
      </div>

      <div className="table-scroll overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className={`${STICKY_LEFT} whitespace-nowrap px-2 py-2`}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  title="勾选本页全部"
                  className="h-4 w-4 cursor-pointer"
                />
              </th>
              {COLUMNS.filter((c) => c.key !== 'select').map((col) => {
                const isMetric = col.key !== 'image' && col.key !== 'skcId' && col.key !== 'spuId' && col.key !== 'action';
                const sortable = isMetric && SORTABLE_KEYS.includes(col.key as MetricKey);
                const key = col.key as MetricKey;
                const active = sort?.key === key;
                return (
                  <th
                    key={String(col.key)}
                    className={`whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 ${
                      col.sticky === 'left' ? STICKY_LEFT : col.sticky === 'right' ? STICKY_RIGHT : ''
                    }`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(key)}
                        className="inline-flex items-center gap-1 hover:text-gray-800"
                        title="点击排序"
                      >
                        {col.label}
                        {active ? (
                          sort?.dir === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => {
              const isOpen = expanded.has(p.skcId);
              const checked = selected.has(p.skcId);
              return (
                <Fragment key={p.skcId}>
                  <tr className={`border-b border-gray-100 hover:bg-gray-50 ${checked ? 'bg-blue-50/40' : ''}`}>
                    <td className={`${STICKY_LEFT} whitespace-nowrap px-2 py-1.5`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(p.skcId)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className={`${STICKY_LEFT} whitespace-nowrap px-3 py-1.5`}>
                      <ZoomImage image={p.image} />
                    </td>
                    <td className={`${STICKY_LEFT} whitespace-nowrap px-3 py-1.5 font-medium tabular-nums text-gray-800`}>
                      {p.skcId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-500">{p.spuId ?? '-'}</td>
                    {SORTABLE_KEYS.map((key) => {
                      const val = p.summary[key];
                      return (
                        <td
                          key={key}
                          className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${
                            key === 'profit' || key === 'profitRate'
                              ? formatProfitClass(val)
                              : RED_KEYS.has(key)
                              ? 'text-red-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {formatMetric(key, val)}
                        </td>
                      );
                    })}
                    <td className={`${STICKY_RIGHT} whitespace-nowrap px-3 py-1.5 text-right`}>
                      <button
                        type="button"
                        onClick={() => onToggleDetail(p.skcId)}
                        className={isOpen ? 'text-blue-500' : 'text-blue-600 hover:text-blue-800'}
                      >
                        {isOpen ? '收起' : '详情'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50">
                      <td colSpan={COLUMNS.length + 1} className="px-3 py-2">
                        <ProductDetail product={p} months={months} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-10 text-center text-sm text-gray-400">
                  没有匹配的商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {products.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>条</span>
            <span className="ml-2">
              共 {products.length} 条 · 第 {current + 1}/{pageCount} 页
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}