import type { AnalysisInfo } from '../../types/excel';

export function DataStatus({ info }: { info: AnalysisInfo }) {
  const timeText = info.timeRange ? `${info.timeRange[0]} ~ ${info.timeRange[1]}` : '-';
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
      <span>
        汇总文件：<span className="font-medium text-gray-800">{info.summaryStatus}</span>
      </span>
      <span>
        SKC：<span className="font-medium text-gray-800">{info.skcCount}</span>
      </span>
      <span>
        月份：<span className="font-medium text-gray-800">{info.monthCount}</span>
      </span>
      <span>
        时间：<span className="font-medium text-gray-800">{timeText}</span>
      </span>
    </div>
  );
}