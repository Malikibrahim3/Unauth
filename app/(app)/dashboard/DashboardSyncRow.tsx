import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export function DashboardSyncRow({
  label,
  connected,
  icon: Icon,
  hasData = false,
  syncedAt,
}: {
  label: string;
  connected: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  hasData?: boolean;
  syncedAt?: string | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-caption" style={{ color: 'var(--text)' }}>{label}</span>
      </div>
      {connected ? (
        <span className="flex items-center gap-1.5 text-caption font-medium" style={{ color: 'var(--neutral)' }}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {syncedAt ? `Synced ${syncedAt}` : 'Connected'}
        </span>
      ) : hasData ? (
        <span className="flex items-center gap-1.5 text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
          <Clock className="h-3.5 w-3.5" /> Historical data
        </span>
      ) : (
        <Link
          href="/settings/integrations"
          className="flex items-center gap-1.5 text-caption font-medium hover:underline"
          style={{ color: 'var(--warning)' }}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Connect source
        </Link>
      )}
    </div>
  );
}
