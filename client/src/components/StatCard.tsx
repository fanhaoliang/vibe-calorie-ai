type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  target: string;
  progress: number;
  progressLabel?: string;
  note: string;
  accent: 'sage' | 'honey' | 'mist' | 'danger';
  warning?: boolean;
};

export default function StatCard({
  icon,
  label,
  value,
  unit,
  target,
  progress,
  progressLabel,
  note,
  accent,
  warning = false
}: StatCardProps) {
  const color = {
    sage: 'from-[#3aa39e] to-[#1f6b6b]',
    honey: 'from-[#eca94f] to-[#dc8841]',
    mist: 'from-[#8a948d] to-[#657168]',
    danger: 'from-[#d95745] to-[#a93a31]'
  }[accent];
  const shellClass = warning
    ? 'border-[#c14b6e] bg-[#fbeef2] shadow-[0_22px_60px_rgba(159,58,49,0.13)]'
    : 'border-[#dde3e3]/90 bg-white/78 shadow-[0_22px_60px_rgba(79,92,72,0.10)]';
  const noteClass = warning ? 'text-[#8b2745]' : 'text-[#4a5860]';

  return (
    <section className={`rounded-[30px] border p-5 backdrop-blur ${shellClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#8a949b]">{label}</p>
          <div className="mt-2 flex items-end gap-2">
            <strong className={`text-3xl font-semibold ${warning ? 'text-[#8b2745]' : 'text-[#1d2a30]'}`}>{value}</strong>
            <span className="pb-1 text-sm text-[#8a949b]">{unit}</span>
          </div>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${color} p-3 text-white shadow-[0_14px_28px_rgba(93,127,105,0.18)]`}>
          {icon}
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-[#8a949b]">
          <span>{target}</span>
          <span>{progressLabel || `${progress}%`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e1e7e8]">
          <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <p className={`mt-3 text-sm leading-5 ${noteClass}`}>{note}</p>
    </section>
  );
}
