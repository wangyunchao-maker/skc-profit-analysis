import { METRIC_CONFIG, type MetricKey } from '../../config/metrics';

interface Props {
  enabled: MetricKey[];
  onToggle: (key: MetricKey) => void;
}

export function MetricSelector({ enabled, onToggle }: Props) {
  const keys = Object.keys(METRIC_CONFIG) as MetricKey[];
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key) => {
        const isOn = enabled.includes(key);
        return (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs ${
              isOn ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => onToggle(key)}
              className="accent-blue-600"
            />
            {METRIC_CONFIG[key].label}
          </label>
        );
      })}
    </div>
  );
}