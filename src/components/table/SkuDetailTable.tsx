import { DETAIL_METRIC_ORDER, METRIC_CONFIG } from '../../config/metrics';
import type { ProductAnalysis, RawProduct } from '../../types/product';
import { formatMetric, formatMoney, formatProfitClass, hasMoneyValue } from '../../utils/format';

const METRIC_KEYS = DETAIL_METRIC_ORDER;

interface Props {
  product: ProductAnalysis;
  months: string[];
}

export function SkuDetailTable({ product, months }: Props) {
  const groups = months
    .map((month) => ({ month, skus: product.skuDetails?.[month] ?? [] }))
    .filter((g) => g.skus.length > 0);

  if (groups.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        该产品对应的月度文件为 SKC 粒度，没有 SKU 明细。
      </p>
    );
  }

  const missing = months.filter((m) => !product.skuDetails?.[m]?.length);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="whitespace-nowrap py-1.5 pr-3 font-medium">月份</th>
              <th className="whitespace-nowrap px-3 py-1.5 font-medium">SKU ID</th>
              <th className="whitespace-nowrap px-3 py-1.5 font-medium">SKU货号</th>
              <th className="whitespace-nowrap px-3 py-1.5 font-medium">商品规格</th>
              <th className="whitespace-nowrap px-3 py-1.5 font-medium">进价</th>
              {METRIC_KEYS.map((key) => (
                <th key={key} className="whitespace-nowrap px-3 py-1.5 font-medium">
                  {METRIC_CONFIG[key].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ month, skus }) =>
              skus.map((sku: RawProduct, idx) => (
                <tr key={`${month}-${sku.skuId ?? idx}`} className="border-b border-gray-100">
                  {idx === 0 && (
                    <td
                      rowSpan={skus.length}
                      className="whitespace-nowrap py-1.5 pr-3 align-top font-medium text-gray-700"
                    >
                      {month}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-700">{sku.skuId ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-500">{sku.skuCode ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{sku.specification ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-gray-700">
                    {formatMoney(sku.unitCost ?? null)}
                  </td>
                  {METRIC_KEYS.map((key) => (
                    <td
                      key={key}
                      className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${
                        key === 'profit' || key === 'profitRate'
                          ? formatProfitClass(sku[key])
                          : key === 'consumerRefund' && hasMoneyValue(sku[key])
                          ? 'text-red-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {formatMetric(key, sku[key])}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-gray-400">
          {missing.join('、')} 的月度文件为 SKC 粒度，无 SKU 明细。
        </p>
      )}
    </div>
  );
}