import { BarChart3, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-800">SKC 月度利润分析</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          本地 Excel 数据分析 · 数据不会上传服务器
        </div>
      </div>
    </header>
  );
}