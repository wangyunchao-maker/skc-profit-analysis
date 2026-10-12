import { Search } from 'lucide-react';

type ProfitFilter = 'all' | 'profit' | 'loss';

interface Props {
  keyword: string;
  onKeywordChange: (v: string) => void;
  filter: ProfitFilter;
  onFilterChange: (f: ProfitFilter) => void;
}

const FILTER_OPTIONS: { value: ProfitFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'profit', label: '盈利' },
  { value: 'loss', label: '亏损' },
];

export type { ProfitFilter };

export function SearchBar({ keyword, onKeywordChange, filter, onFilterChange }: Props) {
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
    </div>
  );
}