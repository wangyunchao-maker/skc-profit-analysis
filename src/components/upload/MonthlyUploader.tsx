import { FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import type { UploadedMonthly } from '../../utils/analyzer';
import { generateMonthOptions } from '../../utils/monthParser';
import { MonthSelector } from './MonthSelector';

interface Props {
  files: UploadedMonthly[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onChangeMonth: (id: string, month: string) => void;
}

export function MonthlyUploader({ files, onAdd, onRemove, onChangeMonth }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const monthOptions = generateMonthOptions(2023, 2030);

  const countByMonth = new Map<string, number>();
  for (const f of files) {
    if (f.month) countByMonth.set(f.month, (countByMonth.get(f.month) ?? 0) + 1);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">月度文件</h3>
        <span className="text-xs text-gray-400">可上传多个</span>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
      >
        <UploadCloud className="h-5 w-5" />
        上传多个月度 Excel
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-xs text-gray-500">已上传 {files.length} 个文件</div>
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700" title={f.name}>
                {f.name}
              </span>
              <MonthSelector
                value={f.month}
                options={monthOptions}
                onChange={(m) => onChangeMonth(f.id, m)}
                isDuplicate={(countByMonth.get(f.month ?? '') ?? 0) > 1}
              />
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}