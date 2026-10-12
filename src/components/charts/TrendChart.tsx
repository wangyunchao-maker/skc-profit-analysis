import ReactECharts from 'echarts-for-react';
import { METRIC_CONFIG, type MetricKey } from '../../config/metrics';
import { formatCount, formatMoney, formatPercent } from '../../utils/format';

const LEFT_AXIS = 0;
const RIGHT_AXIS = 1;

const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
  '#4f46e5',
  '#ca8a04',
];

interface Props {
  months: string[];
  data: Record<MetricKey, (number | null)[]>;
  enabled: MetricKey[];
}

function formatByType(type: string, value: number | null): string {
  if (value === null) return '-';
  if (type === 'money') return formatMoney(value);
  if (type === 'percent') return formatPercent(value);
  return formatCount(value);
}

interface TooltipParam {
  axisValue: string;
  marker: string;
  value: number | number[] | null;
}

export function TrendChart({ months, data, enabled }: Props) {
  const series = enabled.map((key, idx) => {
    const isPercent = METRIC_CONFIG[key].type === 'percent';
    return {
      name: METRIC_CONFIG[key].label,
      type: 'line' as const,
      yAxisIndex: isPercent ? RIGHT_AXIS : LEFT_AXIS,
      data: data[key],
      smooth: true,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: false,
      lineStyle: { width: 2 },
      itemStyle: { color: PALETTE[idx % PALETTE.length] },
      emphasis: { focus: 'series' as const },
    };
  });

  const option = {
    color: PALETTE,
    animationDuration: 300,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937', fontSize: 12 },
      formatter: (params: TooltipParam[]) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const first = params[0];
        const lines = [`<div style="font-weight:600;margin-bottom:4px">${first.axisValue}</div>`];
        params.forEach((p, i) => {
          const key = enabled[i];
          const cfg = METRIC_CONFIG[key];
          const raw = p.value === null ? null : (p.value as number);
          lines.push(
            `<div style="display:flex;justify-content:space-between;gap:16px">` +
              `<span>${p.marker}${cfg.label}</span>` +
              `<b>${formatByType(cfg.type, raw)}</b></div>`,
          );
        });
        return lines.join('');
      },
    },
    legend: { show: true, type: 'scroll' as const, top: 0, textStyle: { fontSize: 12 } },
    grid: { left: 56, right: 56, top: 36, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: months,
      axisLabel: { color: '#6b7280' },
      axisLine: { lineStyle: { color: '#d1d5db' } },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '金额 / 数量',
        nameTextStyle: { color: '#9ca3af' },
        axisLabel: { color: '#6b7280' },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      {
        type: 'value' as const,
        name: '百分比',
        nameTextStyle: { color: '#9ca3af' },
        axisLabel: { color: '#6b7280', formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        splitLine: { show: false },
      },
    ],
    series,
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge />;
}