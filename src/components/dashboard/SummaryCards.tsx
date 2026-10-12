import { formatCount, formatMoney } from '../../utils/format';

interface Props {
  skcCount: number;
  totalSettlementQty: number | null;
  totalSettlementAmount: number | null;
  totalProfit: number | null;
}

function Card({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${valueClass ?? 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}

export function SummaryCards({ skcCount, totalSettlementQty, totalSettlementAmount, totalProfit }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card label="SKC 数量" value={formatCount(skcCount)} />
      <Card label="总结算单量" value={formatCount(totalSettlementQty)} />
      <Card label="总结算金额" value={formatMoney(totalSettlementAmount)} />
      <Card
        label="总利润"
        value={formatMoney(totalProfit)}
        valueClass={totalProfit !== null && totalProfit < 0 ? 'text-red-600' : 'text-emerald-600'}
      />
    </div>
  );
}