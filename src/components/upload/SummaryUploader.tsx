import { FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';
import { useRef } from 'react';

interface Props {
  fileName: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function SummaryUploader({ fileName, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onUpload(files[0]);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">汇总文件</h3>
        <span className="text-xs text-gray-400">仅一个</span>
      </div>

      {fileName ? (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-600" />
            <span className="truncate text-sm text-gray-700">{fileName}</span>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              更换
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1 text-gray-400 hover:text-red-600"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          <UploadCloud className="h-5 w-5" />
          上传汇总 Excel
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}