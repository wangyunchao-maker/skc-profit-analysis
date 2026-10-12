interface Props {
  value: string | null;
  options: string[];
  onChange: (month: string) => void;
  isDuplicate: boolean;
}

export function MonthSelector({ value, options, onChange, isDuplicate }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
        isDuplicate
          ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
          : value
            ? 'border-blue-300 bg-white text-gray-700 focus:ring-blue-400'
            : 'border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-400'
      }`}
    >
      <option value="" disabled>
        {value ? value : '未识别 ▼'}
      </option>
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}