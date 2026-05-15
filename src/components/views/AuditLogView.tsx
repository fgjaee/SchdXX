import { useRef, useState } from 'react';
import { Card, CardContent } from '../ui';

export interface AuditEntry {
  timestamp: Date;
  action: string;
  detail: string;
  category: 'roster' | 'shift' | 'settings' | 'system';
}

interface AuditLogViewProps {
  entries: AuditEntry[];
}

const categoryIcon: Record<AuditEntry['category'], string> = {
  roster: 'person',
  shift: 'schedule',
  settings: 'settings',
  system: 'computer',
};
const categoryColor: Record<AuditEntry['category'], string> = {
  roster: 'text-primary bg-primary/10',
  shift: 'text-tertiary bg-tertiary/10',
  settings: 'text-secondary bg-secondary/10',
  system: 'text-on-surface-variant bg-surface-container',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AuditLogView({ entries }: AuditLogViewProps) {
  const [filter, setFilter] = useState<'all' | AuditEntry['category']>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = entries.filter(e => filter === 'all' || e.category === filter);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Audit Log</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Session history of all roster changes (current session only).</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'roster', 'shift', 'settings', 'system'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-body-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}
          >
            {f === 'all' ? `All (${entries.length})` : `${f} (${entries.filter(e => e.category === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">history</span>
            <div className="font-headline-md text-on-surface">
              {entries.length === 0 ? 'No Activity Yet' : 'No Matching Events'}
            </div>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              {entries.length === 0
                ? 'Make changes to the roster and they will appear here during this session.'
                : 'Try changing the filter above.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-outline-variant/20 max-h-[600px] overflow-y-auto">
            {[...filtered].reverse().map((entry, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3 hover:bg-surface-container-low transition-colors">
                <span className="text-body-sm font-data-tabular tabular-nums text-on-surface-variant w-24 flex-shrink-0 pt-0.5">
                  {formatTime(entry.timestamp)}
                </span>
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${categoryColor[entry.category]}`}>
                  <span className="material-symbols-outlined text-[14px]">{categoryIcon[entry.category]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-body-md text-on-surface">{entry.action}</div>
                  <div className="text-body-sm text-on-surface-variant">{entry.detail}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
