import type { TeamMember, Target, SummaryRow } from '../../types';
import { formatHours, parseShift } from '../../lib/helpers';
import { Card, CardContent } from '../ui';

interface LaborViewProps {
  roster: TeamMember[];
  targets: Target[];
  summary: SummaryRow[];
  totals: { available: number; scheduled: number; difference: number; overage: number; fullTime: number; partTime: number };
  weeklyHoursAvailable: string;
  autoDeductLunch: boolean;
}

export function LaborView({ roster, targets, summary, totals, weeklyHoursAvailable, autoDeductLunch }: LaborViewProps) {
  const budget = parseFloat(weeklyHoursAvailable) || 0;

  // Per-person weekly hours
  const personHours = roster
    .filter(p => p.rosterStatus !== 'Inactive')
    .map(p => {
      const total = p.shifts.reduce((sum, s) => {
        const parsed = parseShift(s, autoDeductLunch);
        return sum + (parsed?.hours ?? 0);
      }, 0);
      return { ...p, weeklyHours: total };
    })
    .sort((a, b) => b.weeklyHours - a.weeklyHours);

  // Daily scheduled hours
  const dailyHours = summary.map((day, i) => ({
    day: day.day,
    date: targets[i]?.date ?? '',
    hours: day.scheduledHours,
  }));
  const maxDailyHours = Math.max(...dailyHours.map(d => d.hours), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Labor</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Hours breakdown by person and by day.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Budget', value: `${formatHours(budget)}h`, sub: 'Weekly target', color: 'text-primary' },
          { label: 'Scheduled', value: `${formatHours(totals.scheduled)}h`, sub: totals.overage > 0 ? `+${formatHours(totals.overage)}h over` : `-${formatHours(totals.difference)}h under`, color: totals.overage > 0 ? 'text-error' : 'text-status-opener-text' },
          { label: 'Full Time', value: `${formatHours(totals.fullTime)}h`, sub: `${Math.round((totals.fullTime / (totals.scheduled || 1)) * 100)}% of total`, color: 'text-on-surface' },
          { label: 'Part Time', value: `${formatHours(totals.partTime)}h`, sub: `${Math.round((totals.partTime / (totals.scheduled || 1)) * 100)}% of total`, color: 'text-on-surface' },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="text-label-bold uppercase text-on-surface-variant mb-1">{label}</div>
              <div className={`text-headline-lg font-bold font-data-tabular tabular-nums ${color}`}>{value}</div>
              <div className="text-body-sm text-on-surface-variant mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily hours bar chart */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Scheduled Hours by Day</h2>
          <div className="flex items-end gap-3 h-36">
            {dailyHours.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-body-sm font-data-tabular tabular-nums text-on-surface-variant font-semibold">
                  {formatHours(d.hours)}h
                </span>
                <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.round((d.hours / maxDailyHours) * 100)}%`, minHeight: '4px' }} />
                <span className="text-label-bold text-on-surface-variant">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-person table */}
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="p-3 text-left text-label-bold uppercase text-on-surface-variant">Name</th>
                <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Type</th>
                <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Coverage</th>
                <th className="p-3 text-right text-label-bold uppercase text-on-surface-variant">Weekly Hrs</th>
                <th className="p-3 text-left text-label-bold uppercase text-on-surface-variant w-48">% of Budget</th>
              </tr>
            </thead>
            <tbody>
              {personHours.map((p, i) => {
                const pct = budget > 0 ? Math.min(100, (p.weeklyHours / budget) * 100) : 0;
                return (
                  <tr key={p.id} className={`border-b border-outline-variant/20 transition-colors hover:bg-surface-container-low ${i % 2 === 0 ? '' : 'bg-surface-container-lowest'}`}>
                    <td className="p-3 font-semibold text-on-surface">{p.name || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-bold ${p.status === 'FT' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-bold ${p.coverageStatus === 'Excluded' ? 'bg-surface-container text-on-surface-variant' : 'bg-status-opener-bg text-status-opener-text'}`}>
                        {p.coverageStatus ?? 'Included'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-data-tabular tabular-nums font-bold text-on-surface">
                      {formatHours(p.weeklyHours)}h
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-body-sm font-data-tabular tabular-nums text-on-surface-variant w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant/40 bg-surface-container-low">
                <td className="p-3 font-bold text-on-surface" colSpan={3}>Total</td>
                <td className="p-3 text-right font-bold font-data-tabular tabular-nums text-on-surface">{formatHours(totals.scheduled)}h</td>
                <td className="p-3" />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
