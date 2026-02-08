import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, subtext, className }: StatCardProps) {
  return (
    <div className={clsx('bg-wow-bg-medium border border-wow-border rounded-lg p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className="p-2 bg-wow-bg-light rounded-lg">
          <Icon size={20} className="text-wow-gold" />
        </div>
      </div>
    </div>
  );
}
