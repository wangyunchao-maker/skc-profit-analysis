import { useState } from 'react';
import { TrendChart } from '../charts/TrendChart';
import { MetricSelector } from '../charts/MetricSelector';
import { MonthlyTable } from './MonthlyTable';
import { SkuDetailTable } from './SkuDetailTable';
import {
  DEFAULT_TREND_KEYS,
  METRIC_CONFIG,
  type MetricKey,
} from '../../config/metrics';
import type { ProductAnalysis } from '../../types/product';

const ALL_KEYS = Object.keys(METRIC_CONFIG) as MetricKey[];

interface Props {
  product: ProductAnalysis;
  months: string[];
}

export function ProductDetail({ product, months }: Props) {
  const [tab, setTab] = useState<'monthly' | 'trend' | 'sku'>('monthly');
  const [enabled, setEnabled] = useState<MetricKey[]>([...DEFAULT_TREND_KEYS]);

  const hasSkuDetail = months.some((m) => (product.skuDetails?.[m]?.length ?? 0) > 0);

  const toggle = (key: MetricKey) => {
    setEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const trendData = {} as Record<MetricKey, (number | null)[]>;
  for (const key of ALL_KEYS) {
    trendData[key] = months.map((month) => {
      const m = product.months[month];
      return m ? m[key] : null;
    });
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex gap-1">
        <button
          type="button"
          onClick={() => setTab('monthly')}
          className={`rounded px-3 py-1 text-sm ${
            tab === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          月度数据
        </button>
        <button
          type="button"
          onClick={() => setTab('trend')}
          className={`rounded px-3 py-1 text-sm ${
            tab === 'trend' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          趋势分析
        </button>
        {hasSkuDetail && (
          <button
            type="button"
            onClick={() => setTab('sku')}
            className={`rounded px-3 py-1 text-sm ${
              tab === 'sku' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            SKU 明细
          </button>
        )}
      </div>

      {tab === 'monthly' && <MonthlyTable product={product} months={months} />}
      {tab === 'trend' && (
        <div className="space-y-3">
          <MetricSelector enabled={enabled} onToggle={toggle} />
          <TrendChart months={months} data={trendData} enabled={enabled} />
        </div>
      )}
      {tab === 'sku' && <SkuDetailTable product={product} months={months} />}
    </div>
  );
}