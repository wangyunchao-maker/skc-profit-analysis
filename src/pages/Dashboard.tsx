import { useMemo, useState } from 'react';
import { BarChart3, FileUp, Loader2, Settings2, Sparkles } from 'lucide-react';
import { Header } from '../components/Header';
import { SummaryUploader } from '../components/upload/SummaryUploader';
import { MonthlyUploader } from '../components/upload/MonthlyUploader';
import { DetailUploader } from '../components/upload/DetailUploader';
import { DetailView } from '../components/detail/DetailView';
import { SearchBar, type ProfitFilter } from '../components/dashboard/SearchBar';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { DataStatus } from '../components/dashboard/DataStatus';
import { ValidationPanel } from '../components/validation/ValidationPanel';
import { ProductTable, type SortConfig } from '../components/table/ProductTable';
import type { AnalysisInfo } from '../types/excel';
import type { ProductAnalysis } from '../types/product';
import type { ValidationIssue } from '../types/validation';
import type { DetailExportData } from '../types/detail';
import type { MetricKey } from '../config/metrics';
import { parseDetailExport } from '../utils/detailParser';
import {
  analyze,
  detectMonthFromFile,
  type UploadedMonthly,
} from '../utils/analyzer';
import { sortMonths } from '../utils/monthParser';
import { sumMetrics } from '../utils/metrics';

type Status = 'idle' | 'loading' | 'ready';
type Tab = 'profit' | 'detail';

export function Dashboard() {
  const productsToSettlementMap = (): Map<string, number> => {
    const m = new Map<string, number>();
    for (const p of products) {
      const q = p.summary?.settlementQty;
      if (q != null && p.skcId) m.set(p.skcId, q);
    }
    return m;
  };

  const [tab, setTab] = useState<Tab>('profit');

  // ---------- 利润分析（汇总 + 月度） ----------
  const [summaryName, setSummaryName] = useState<string | null>(null);

  const [monthlies, setMonthlies] = useState<UploadedMonthly[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [info, setInfo] = useState<AnalysisInfo | null>(null);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<ProfitFilter>('all');
  const [refundRateMin, setRefundRateMin] = useState('');
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // summary file 状态
  const [summaryFile, setSummaryFile] = useState<File | null>(null);

  // ---------- 售后退款明细（多维度明细导出） ----------
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [detailStatus, setDetailStatus] = useState<Status>('idle');
  const [detailData, setDetailData] = useState<DetailExportData | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const onDetailUpload = (file: File) => {
    setDetailFile(file);
    setDetailStatus('idle');
    setDetailData(null);
    setDetailError(null);
  };

  const onDetailRemove = () => {
    setDetailFile(null);
    setDetailStatus('idle');
    setDetailData(null);
    setDetailError(null);
  };

  const handleDetailAnalyze = async () => {
    if (!detailFile) return;
    setDetailStatus('loading');
    setDetailError(null);
    try {
      const data = await parseDetailExport(detailFile);
      setDetailData(data);
      setDetailStatus('ready');
    } catch (err) {
      console.error(err);
      setDetailError(`解析失败：${String(err)}`);
      setDetailStatus('idle');
    }
  };

  const resetAnalysis = () => {
    setStatus('idle');
    setProducts([]);
    setIssues([]);
    setInfo(null);
    setExpanded(new Set());
  };

  const onSummaryUpload = (file: File) => {
    setSummaryFile(file);
    setSummaryName(file.name);
    resetAnalysis();
  };

  const onSummaryRemove = () => {
    setSummaryFile(null);
    setSummaryName(null);
    resetAnalysis();
  };

  const onMonthlyAdd = (files: FileList | null) => {
    if (!files) return;
    const additions: UploadedMonthly[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      month: detectMonthFromFile(file.name),
    }));
    if (additions.length) {
      setMonthlies((prev) => [...prev, ...additions]);
      resetAnalysis();
    }
  };

  const onMonthlyRemove = (id: string) => {
    setMonthlies((prev) => prev.filter((f) => f.id !== id));
    resetAnalysis();
  };

  const onChangeMonth = (id: string, month: string) => {
    setMonthlies((prev) => prev.map((f) => (f.id === id ? { ...f, month } : f)));
  };

  const allMonthsSet = monthlies.length > 0 && monthlies.every((f) => f.month !== null);
  const monthset = new Set(monthlies.map((f) => f.month).filter(Boolean) as string[]);
  const noDuplicateMonths = monthset.size === monthlies.length;
  const canAnalyze = summaryFile !== null && allMonthsSet && noDuplicateMonths;

  const handleAnalyze = async () => {
    if (!summaryFile) return;
    setStatus('loading');
    setLoadingMsg('正在读取 Excel...');
    try {
      const result = await analyze({ file: summaryFile }, monthlies);
      setLoadingMsg('正在匹配 SKC...');
      // 让 UI 刷新加载文案
      await new Promise((r) => setTimeout(r, 30));
      setProducts(result.products);
      setIssues(result.issues);
      setInfo(result.info);
      setStatus('ready');
      setExpanded(new Set());
    } catch (err) {
      console.error(err);
      setIssues([
        {
          type: 'parse-error',
          level: 'error',
          message: `分析过程发生错误：${String(err)}`,
        },
      ]);
      setStatus('idle');
    }
  };

  const months = useMemo(() => {
    return sortMonths(
      monthlies.map((f) => f.month).filter((m): m is string => m !== null),
    );
  }, [monthlies]);

  // 汇总指标（基于全部 SKC 的汇总数据）
  const totals = useMemo(() => {
    const m = sumMetrics(products.map((p) => p.summary));
    return { skcCount: products.length, ...m };
  }, [products]);

  // 过滤 + 排序
  const visible = useMemo(() => {
    let list = products;
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      // 支持多个搜索词：换行/逗号/分号/空格/竖线 分隔，命中任意一个即可
      const tokens = kw.split(/[\s,，;；|]+/).map((t) => t.trim()).filter(Boolean);
      const hasTokens = tokens.some(
        (t) =>
          products.some(
            (p) =>
              p.skcId.toLowerCase().includes(t) ||
              (p.spuId ?? '').toLowerCase().includes(t) ||
              (p.productName ?? '').toLowerCase().includes(t),
          ),
      );
      if (hasTokens) {
        list = list.filter((p) => {
          const hay = `${p.skcId} ${p.spuId ?? ''} ${p.productName ?? ''}`.toLowerCase();
          return tokens.some((t) => hay.includes(t));
        });
      } else {
        list = products.filter(
          (p) =>
            p.skcId.toLowerCase().includes(kw) ||
            (p.spuId ?? '').toLowerCase().includes(kw) ||
            (p.productName ?? '').toLowerCase().includes(kw),
        );
      }
    }
    if (filter !== 'all') {
      list = list.filter((p) => {
        const profit = p.summary.profit;
        if (profit === null || Number.isNaN(profit)) return false;
        return filter === 'profit' ? profit > 0 : profit < 0;
      });
    }
    // 退款率筛选：只看退款率 ≥ 输入值（%）的商品
    const refundMin = Number(refundRateMin);
    if (refundRateMin.trim() !== '' && Number.isFinite(refundMin)) {
      list = list.filter((p) => p.summary.refundRate !== null && p.summary.refundRate * 100 >= refundMin);
    }
    if (sort) {
      const { key, dir } = sort;
      const mul = dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = a.summary[key];
        const vb = b.summary[key];
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va - vb) * mul;
      });
    }
    return list;
  }, [products, keyword, filter, refundRateMin, sort]);

  const toggleSort = (key: MetricKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null;
    });
  };

  const toggleDetail = (skcId: string) => {
    // 同一时间只展开一个商品的详情，展开新的会自动收起上一个
    setExpanded((prev) => (prev.has(skcId) ? new Set() : new Set([skcId])));
  };

  return (
    <div className="min-h-screen min-w-[1280px]">
      <Header />
      <main className="space-y-4 p-5">
        {/* 页签切换 */}
        <div className="sticky top-0 z-30 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('profit')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${
              tab === 'profit' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            利润分析
          </button>
          <button
            type="button"
            onClick={() => setTab('detail')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${
              tab === 'detail' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileUp className="h-4 w-4" />
            售后 / 退款明细
          </button>
        </div>

        {/* ============ 售后退款明细页 ============ */}
        {tab === 'detail' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                <DetailUploader fileName={detailFile?.name ?? null} onUpload={onDetailUpload} onRemove={onDetailRemove} />
                {detailStatus === 'idle' && detailFile && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleDetailAnalyze}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <FileUp className="h-4 w-4" />
                      生成售后 / 退款明细
                    </button>
                  </div>
                )}
              </div>
              {detailStatus === 'idle' && !detailFile && (
                <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
                  上传「多维度明细导出」Excel（含结算交易收入 / 售后问题 / 消费者退款工作表），数据仅在本浏览器本地解析。
                </p>
              )}
            </div>

            {detailStatus === 'loading' && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-16 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                正在读取明细...
              </div>
            )}

            {detailError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
            )}

            {detailStatus === 'ready' && detailData && (
              <>
                {detailData.issues.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {detailData.issues.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    <Sparkles className="h-4 w-4" />
                    明细生成完成
                  </span>
                  <span>收入明细 {detailData.incomeSkuCount} 个 sku</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailStatus('idle');
                      setDetailData(null);
                    }}
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    修改文件
                  </button>
                </div>
                <DetailView data={detailData} settlementQtyBySkc={productsToSettlementMap()} />
              </>
            )}
          </div>
        )}

        {/* ============ 利润分析页 ============ */}
        {tab === 'profit' && (
          <>
        {/* 正常状态 - 分析后视图 */}
        {status === 'ready' && info && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
              <Sparkles className="h-4 w-4" />
              数据分析完成
            </span>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings2 className="h-4 w-4" />
              修改文件
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              重新分析
            </button>
          </div>
        )}

        {/* 上传区域 */}
        {(status === 'idle' || status === 'ready') && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              <SummaryUploader fileName={summaryName} onUpload={onSummaryUpload} onRemove={onSummaryRemove} />
              <MonthlyUploader files={monthlies} onAdd={onMonthlyAdd} onRemove={onMonthlyRemove} onChangeMonth={onChangeMonth} />
            </div>

            {status === 'idle' && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="text-xs text-gray-500">
                  所有 Excel 数据均在当前浏览器本地解析，不会上传服务器。
                  {!allMonthsSet && monthlies.length > 0 && ' · 请为尚未设置月份的文件选择月份。'}
                  {allMonthsSet && !noDuplicateMonths && ' · 存在重复月份，请修改或删除。'}
                </div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className={`mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                    canAnalyze
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-200 text-gray-400'
                  }`}
                >
                  <FileUp className="h-4 w-4" />
                  开始分析
                </button>
              </div>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            {loadingMsg}
          </div>
        )}

        {/* 分析结果 */}
        {status === 'ready' && info && (
          <>
            <DataStatus info={info} />
            <SummaryCards
              skcCount={totals.skcCount}
              totalSettlementQty={totals.settlementQty}
              totalSettlementAmount={totals.settlementAmount}
              totalProfit={totals.profit}
            />
            <ValidationPanel issues={issues} />
            <SearchBar
              keyword={keyword}
              onKeywordChange={setKeyword}
              filter={filter}
              onFilterChange={setFilter}
              refundRateMin={refundRateMin}
              onRefundRateMinChange={setRefundRateMin}
            />
            <ProductTable
              products={visible}
              months={months}
              expanded={expanded}
              onToggleDetail={toggleDetail}
              sort={sort}
              onSort={toggleSort}
            />
            <div className="pb-4 text-right text-xs text-gray-400">
              筛选结果 {visible.length} / {products.length}
            </div>
          </>
        )}

        {/* 空状态（未上传任何文件） */}
        {status === 'idle' && !summaryFile && monthlies.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <FileUp className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-gray-500">上传汇总文件和月度文件开始分析</p>
            <p className="mt-1 text-xs text-gray-400">数据仅在本浏览器本地处理，不会上传服务器</p>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}