import { Search } from 'lucide-react';

type ProfitFilter = 'all' | 'profit' | 'loss';

interface Props {
  keyword: string;
  onKeywordChange: (v: string) => void;
  filter: ProfitFilter;
  onFilterChange: (f: ProfitFilter) => void;
  /** 退款率下限（百分比数值字符串，空表示不限） */
  refundRateMin: string;
  onRefundRateMinChange: (v: string) => void;
  /** 已保存的备注条数 */
  notesCount: number;
  /** 是否支持选择本地备注文件夹 */
  notesFolderSupported: boolean;
  /** 已记住的备注文件夹名 */
  notesFolderName: string | null;
  /** 操作结果提示 */
  notesMessage: string;
  onExportNotes: () => void;
  onImportNotes: (file: File) => void;
  onPickNotesFolder: () => void;
  onLoadNotesFromFolder: () => void;
}

const FILTER_OPTIONS: { value: ProfitFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'profit', label: '盈利' },
  { value: 'loss', label: '亏损' },
];

export type { ProfitFilter };

export function SearchBar({
  keyword,
  onKeywordChange,
  filter,
  onFilterChange,
  refundRateMin,
  onRefundRateMinChange,
  notesCount,
  notesFolderSupported,
  notesFolderName,
  notesMessage,
  onExportNotes,
  onImportNotes,
  onPickNotesFolder,
  onLoadNotesFromFolder,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索 SKC / SPU / 商品名称（可粘多行）"
          className="w-64 rounded-md border border-gray-300 py-1.5 pl-7 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="flex overflow-hidden rounded-md border border-gray-300">
        {FILTER_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onFilterChange(o.value)}
            className={`px-3 py-1.5 text-sm ${
              filter === o.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5">
        <span className="whitespace-nowrap text-sm text-gray-500">退款率 ≥</span>
        <input
          value={refundRateMin}
          onChange={(e) => onRefundRateMinChange(e.target.value.replace(/[^\d.]/g, ''))}
          inputMode="decimal"
          placeholder="5"
          className="w-14 text-sm focus:outline-none"
        />
        <span className="text-sm text-gray-500">%</span>
      </div>
      <div className="flex items-center gap-2">
        {notesFolderSupported && (
          <button
            type="button"
            onClick={onPickNotesFolder}
            title="选择一个文件夹，之后导出备注会直接覆盖写入该文件夹里的 SKC备注.json"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            {notesFolderName ? `备注文件夹：${notesFolderName}` : '选择备注文件夹'}
          </button>
        )}
        {notesFolderName && (
          <button
            type="button"
            onClick={onLoadNotesFromFolder}
            title="从已选的备注文件夹里读取 SKC备注.json 并载入"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            从文件夹加载
          </button>
        )}
        <button
          type="button"
          onClick={onExportNotes}
          title="导出备注；已选文件夹时直接写入文件夹，否则下载到本机"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          导出备注{notesCount > 0 ? `(${notesCount})` : ''}
        </button>
        <label
          title="选择本应用导出的备注 JSON 文件并载入"
          className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          加载备注文件
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportNotes(file);
              e.target.value = '';
            }}
          />
        </label>
        {notesMessage && <span className="text-sm text-emerald-600">{notesMessage}</span>}
      </div>
    </div>
  );
}