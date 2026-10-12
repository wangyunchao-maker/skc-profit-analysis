import { useState } from 'react';
import { AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import type { ValidationIssue } from '../../types/validation';

interface Props {
  issues: ValidationIssue[];
}

export function ValidationPanel({ issues }: Props) {
  const [open, setOpen] = useState(false);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  const total = issues.length;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
        <ShieldCheck className="h-4 w-4" />
        数据正常
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-amber-800"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          发现 {total} 个问题
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">{errors} 错误</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">{warnings} 警告</span>
          <span>{open ? '收起 ▲' : '展开 ▼'}</span>
        </span>
      </button>

      {open && (
        <ul className="max-h-64 divide-y divide-amber-100 overflow-y-auto border-t border-amber-200 px-4">
          {issues.map((issue, idx) => (
            <li key={idx} className="flex items-start gap-2 py-2 text-xs text-amber-800">
              {issue.level === 'error' ? (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
              <span>
                {issue.fileName && <span className="text-gray-500">[{issue.fileName}] </span>}
                {issue.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}