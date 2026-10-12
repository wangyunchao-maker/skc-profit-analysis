import { METRIC_CONFIG, type MetricKey } from '../../config/metrics';
import type { ProductAnalysis } from '../../types/product';
import { formatMetric, formatProfitClass } from '../../utils/format';
import { emptyMetrics } from '../../utils/metrics';

const METRIC_KEYS = Object.keys(METRIC_CONFIG) as MetricKey[];

interface Props {
  product: ProductAnalysis;
  months: string[];
}

export function MonthlyTable({ product, months }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-1.5 pr-3 font-medium">月份</th>
            {METRIC_KEYS.map((key) => (
              <th key={key} className="whitespace-nowrap px-3 py-1.5 font-medium">
                {METRIC_CONFIG[key].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((month) => {
            const metrics = product.months[month] ?? emptyMetrics();
            return (
              <tr key={month} className="border-b border-gray-100">
                <td className="whitespace-nowrap py-1.5 pr-3 font-medium text-gray-700">{month}</td>
                {METRIC_KEYS.map((key) => (
                  <td
                    key={key}
                    className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${
                      key === 'profit' || key === 'profitRate' ? formatProfitClass(metrics[key]) : 'text-gray-700'
                    }`}
                  >
                    {formatMetric(key, metrics[key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}