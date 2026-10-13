import { useMemo, useState } from 'react';
import type { DetailExportData } from '../../types/detail';
import { PLACEHOLDER } from '../../utils/format';

const PAGE_SIZES = [10, 20, 50, 100, 200];

const num2 = (v: number | null): string =>
  v === null || Number.isNaN(v) ? PLACEHOLDER : v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (v: number | null): string =>
  v === null || Number.isNaN(v) ? PLACEHOLDER : `${(v * 100).toFixed(2)}%`;

const count = (v: number): string => v.toLocaleString('zh-CN');

/** 从 SKU 属性中提取 cm 尺码，如 "47.2*47.2inch/120*120cm" -> "120*120" */
function extractSize(attr: string): string {
  if (!attr) return '';
  const re = /(\d+(?:\.\d+)?)\s*[*\u00D7xX]\s*(\d+(?:\.\d+)?)\s*cm/gi;
  const m = re.exec(attr);
  if (!m) return '';
  const a = Number(m[1]);
  const b = Number(m[2]);
  return `${a}*${b}`;
}

/** 合并后的行：一条 SKU，前段落为消费者退款，后段落为售后问题 */
interface ComRow {
  spuId: string;
  skcId: string;
  skuId: string;
  skuAttr: string;
  skuSize: string;
  // 消费者退款
  rDeclaredPrice: number | null;
  rCostPrice: number | null;
  refundAmount: number;
  refundQty: number;
  refundRate: number | null;
  // 售后问题
  aDeclaredPrice: number | null;
  aCostPrice: number | null;
  skuAttrAS: string;
  afterSalesAmount: number;
  afterSalesQty: number;
  afterSalesRate: number | null;
}

function buildCombinedRows(data: DetailExportData): ComRow[] {
  // 一个 SPU 下面挂多个 SKU；同一 SKU 的售后/退款合并成一条
  const bySpu = new Map<string, Map<string, ComRow>>();
  const ensure = (spuId: string, skuId: string): ComRow => {
    let skus = bySpu.get(spuId);
    if (!skus) {
      skus = new Map();
      bySpu.set(spuId, skus);
    }
    let e = skus.get(skuId);
    if (!e) {
      e = {
        spuId,
        skcId: '',
        skuId,
        skuAttr: '',
        skuSize: '',
        rDeclaredPrice: null,
        rCostPrice: null,
        refundAmount: 0,
        refundQty: 0,
        refundRate: null,
        aDeclaredPrice: null,
        aCostPrice: null,
        skuAttrAS: '',
        afterSalesAmount: 0,
        afterSalesQty: 0,
        afterSalesRate: null,
      };
      skus.set(skuId, e);
    }
    return e;
  };

  for (const r of data.afterSales) {
    const e = ensure(r.spuId, r.skuId);
    e.skcId = r.skcId;
    e.skuAttrAS = r.skuAttr;
    e.skuSize = extractSize(r.skuAttr);
    e.aDeclaredPrice = r.declaredPrice;
    e.aCostPrice = r.costPrice;
    e.afterSalesAmount += r.afterSalesAmount;
    e.afterSalesQty += r.afterSalesQty;
    if (r.afterSalesRate !== null) e.afterSalesRate = r.afterSalesRate;
  }
  for (const r of data.refunds) {
    const e = ensure(r.spuId, r.skuId);
    e.skcId = r.skcId;
    e.rDeclaredPrice = r.declaredPrice;
    e.rCostPrice = r.costPrice;
    e.refundAmount += r.refundAmount;
    e.refundQty += r.refundQty;
    if (r.refundRate !== null) e.refundRate = r.refundRate;
  }

  const out: ComRow[] = [];
  for (const skus of bySpu.values()) for (const c of skus.values()) out.push(c);
  return out.sort(
    (a, b) => a.spuId.localeCompare(b.spuId, 'zh-CN') || a.skuId.localeCompare(b.skuId, 'zh-CN'),
  );
}

function Pager({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span>每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
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
          共 {total} 条 · 第 {page + 1}/{pageCount} 页
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function CombinedTable({
  rows,
  settlementQtyBySkc,
}: {
  rows: ComRow[];
  settlementQtyBySkc?: Map<string, number>;
}) {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const SORT_KEYS: Record<string, (r: ComRow) => number> = {
    declared: (r) => r.aDeclaredPrice ?? r.rDeclaredPrice ?? Number.NaN,
    cost: (r) => r.aCostPrice ?? r.rCostPrice ?? Number.NaN,
    settlementQty: (r) => (settlementQtyBySkc ? settlementQtyBySkc.get(r.skcId) ?? Number.NaN : Number.NaN),
    refundAmount: (r) => r.refundAmount,
    refundQty: (r) => r.refundQty,
    refundRate: (r) => r.refundRate ?? Number.NaN,
    afterAmount: (r) => r.afterSalesAmount,
    afterQty: (r) => r.afterSalesQty,
    afterRate: (r) => r.afterSalesRate ?? Number.NaN,
  };
  const toggleSort = (key: string) => {
    setSort((prev) => (prev && prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    // 切换排序时回到第一页，直接展示全局排序后的结果（排序作用于全部数据）
    setPage(0);
  };
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const get = SORT_KEYS[sort.key];
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const na = Number.isNaN(va) ? -Infinity : va;
      const nb = Number.isNaN(vb) ? -Infinity : vb;
      return (na - nb) * sort.dir;
    });
  }, [rows, sort, settlementQtyBySkc]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const cur = page >= pageCount ? pageCount - 1 : page;
  const pageRows = sortedRows.slice(cur * pageSize, cur * pageSize + pageSize);
  const rowKey = (r: ComRow) => `${r.spuId}\u0001${r.skcId}`;
  const segKey = (g: { spuId: string; skcId: string }) => `${g.spuId}\u0001${g.skcId}`;

  const toggleSeg = (g: { spuId: string; skcId: string }) => {
    setSelected((prev) => {
      const s = new Set(prev);
      const k = segKey(g);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return s;
    });
  };
  const copySkc = async () => {
    const skcs = rows
      .filter((r) => selected.has(rowKey(r)))
      .map((r) => r.skcId)
      .filter(Boolean);
    const text = [...new Set(skcs)].sort().join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert(`已复制 ${skcs.length} 个 SKC`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert(`已复制 ${skcs.length} 个 SKC`);
    }
  };

  // 按第一列 spu+skc 分组成段，整组同底色、相邻组交替，首行 rowSpan 合并
  const segments = useMemo(() => {
    const segs: { rows: ComRow[]; spuId: string; skcId: string }[] = [];
    for (const r of pageRows) {
      const last = segs[segs.length - 1];
      if (last && last.spuId === r.spuId && last.skcId === r.skcId) last.rows.push(r);
      else segs.push({ rows: [r], spuId: r.spuId, skcId: r.skcId });
    }
    return segs;
  }, [pageRows]);

  const allPageChecked = segments.length > 0 && segments.every((g) => selected.has(segKey(g)));
  const toggleAllPage = () => {
    setSelected((prev) => {
      const s = new Set(prev);
      for (const g of segments) {
        const k = segKey(g);
        if (allPageChecked) s.delete(k);
        else s.add(k);
      }
      return s;
    });
  };

  const arrow = (key: string) =>
    sort && sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ' ↕';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <span>已选 {selected.size} 条</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copySkc}
            disabled={selected.size === 0}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            复制选中 SKC
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            清空
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600">
                <th rowSpan={2} className="align-middle whitespace-nowrap px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allPageChecked}
                    onChange={toggleAllPage}
                    className="h-4 w-4 accent-blue-600"
                  />
                </th>
                <th rowSpan={2} className="align-middle whitespace-nowrap px-3 py-2 text-center">
                  SKC / SPU
                </th>
                <th rowSpan={2} className="align-middle whitespace-nowrap px-3 py-2 text-center">
                  SKU
                </th>
                <th rowSpan={2} className="align-middle whitespace-nowrap px-3 py-2 text-center">
                  尺码
                </th>
                <th
                  rowSpan={2}
                  onClick={() => toggleSort('declared')}
                  className="cursor-pointer select-none align-middle whitespace-nowrap px-3 py-2 text-center hover:bg-gray-200"
                >
                  申报价格{arrow('declared')}
                </th>
                <th
                  rowSpan={2}
                  onClick={() => toggleSort('cost')}
                  className="cursor-pointer select-none align-middle whitespace-nowrap px-3 py-2 text-center hover:bg-gray-200"
                >
                  成本价{arrow('cost')}
                </th>
                <th
                  rowSpan={2}
                  onClick={() => toggleSort('settlementQty')}
                  className="cursor-pointer select-none align-middle whitespace-nowrap px-3 py-2 text-center hover:bg-gray-200"
                >
                  结算量{arrow('settlementQty')}
                </th>
                <th colSpan={3} className="border-l border-gray-200 px-3 py-2 text-center text-blue-600">
                  消费者退款
                </th>
                <th colSpan={3} className="border-l border-gray-200 px-3 py-2 text-center text-amber-600">
                  售后问题
                </th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-100 text-xs font-medium text-gray-500">
                <th onClick={() => toggleSort('refundAmount')} className="cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  退款金额{arrow('refundAmount')}
                </th>
                <th onClick={() => toggleSort('refundQty')} className="cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  退款量{arrow('refundQty')}
                </th>
                <th onClick={() => toggleSort('refundRate')} className="cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  退款率{arrow('refundRate')}
                </th>
                <th onClick={() => toggleSort('afterAmount')} className="cursor-pointer select-none border-l border-gray-200 whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  售后金额{arrow('afterAmount')}
                </th>
                <th onClick={() => toggleSort('afterQty')} className="cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  售后量{arrow('afterQty')}
                </th>
                <th onClick={() => toggleSort('afterRate')} className="cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-center hover:bg-gray-200">
                  售后率{arrow('afterRate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, gi) => {
                const bg = gi % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                return seg.rows.map((r, ri) => (
                  <tr key={r.skuId || r.skcId + r.spuId} className={`border-b border-gray-100 ${bg} hover:bg-blue-50`}>
                    {ri === 0 ? (
                      <td
                        rowSpan={seg.rows.length}
                        className="px-2 py-1.5 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(segKey(seg))}
                          onChange={() => toggleSeg(seg)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                    ) : null}
                    {ri === 0 ? (
                      <td
                        rowSpan={seg.rows.length}
                        className="whitespace-nowrap px-3 py-1.5 align-middle tabular-nums text-gray-600"
                        title={`SKC: ${seg.skcId || ''}  SPU: ${seg.spuId || ''}`}
                      >
                        <div>SKC: {seg.skcId || '—'}</div>
                        <div>SPU: {seg.spuId || '—'}</div>
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-700">{r.skuId || PLACEHOLDER}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-700">{r.skuSize || PLACEHOLDER}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-700">{num2(r.aDeclaredPrice ?? r.rDeclaredPrice)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-700">{num2(r.aCostPrice ?? r.rCostPrice)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-700">
                      {settlementQtyBySkc?.has(r.skcId) ? count(settlementQtyBySkc.get(r.skcId)!) : PLACEHOLDER}
                    </td>

                    {/* 消费者退款段 */}
                    <td className="whitespace-nowrap border-l border-gray-200 px-3 py-1.5 text-right tabular-nums text-red-600">{num2(r.refundAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-700">{count(r.refundQty)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-red-600">{pct(r.refundRate)}</td>

                    {/* 售后问题段 */}
                    <td className="whitespace-nowrap border-l border-gray-200 px-3 py-1.5 text-right tabular-nums text-amber-600">{num2(r.afterSalesAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-700">{count(r.afterSalesQty)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-amber-600">{pct(r.afterSalesRate)}</td>
                  </tr>
                ));
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-10 text-center text-sm text-gray-400">
                    没有数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager
          total={rows.length}
          page={cur}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(0);
          }}
        />
      </div>
    </div>
  );
}

export function DetailView({
  data,
  settlementQtyBySkc,
}: {
  data: DetailExportData;
  settlementQtyBySkc?: Map<string, number>;
}) {
  const [keyword, setKeyword] = useState('');

  const combined = useMemo(() => {
    const all = buildCombinedRows(data);
    const kw = keyword.trim().toLowerCase();
    if (!kw) return all;
    // 支持多个搜索词：换行/逗号/分号/空格/竖线 分隔，命中任意一个即可
    const tokens = kw.split(/[\s,，;；|]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      return all.filter((r) => tokens.some((t) => `${r.skuId} ${r.skcId} ${r.spuId}`.toLowerCase().includes(t)));
    }
    return all.filter(
      (r) =>
        r.skuId.toLowerCase().includes(kw) ||
        r.skcId.toLowerCase().includes(kw) ||
        r.spuId.toLowerCase().includes(kw),
    );
  }, [data, keyword]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
            消费者退款 {data.refunds.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
            售后问题 {data.afterSales.length}
          </span>
          <span className="text-xs text-gray-400">合并为一张表查看</span>
        </div>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索 spu / skc / sku（可粘多行）"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400"
        />
      </div>

      <CombinedTable rows={combined} settlementQtyBySkc={settlementQtyBySkc} />
    </div>
  );
}