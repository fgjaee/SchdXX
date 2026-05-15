import type { TeamMember, SummaryRow } from '../../types';
import { formatHours } from '../../lib/helpers';
import { Card, CardContent } from '../ui';

interface DashboardViewProps {
  roster: TeamMember[];
  summary: SummaryRow[];
  totals: {
    available: number;
    scheduled: number;
    coreScheduled: number;
    excludedScheduled: number;
    fullTime: number;
    partTime: number;
    difference: number;
    overage: number;
  };
  weeklyHoursAvailable: string;
}

export function DashboardView({ roster, summary, totals, weeklyHoursAvailable }: DashboardViewProps) {
  const isOverBudget = totals.difference < 0;
  const budgetUsed = totals.available > 0 ? Math.min(100, (totals.scheduled / totals.available) * 100) : 0;
  const totalHours = totals.fullTime + totals.partTime || 1;
  const ftPercent = Math.round((totals.fullTime / totalHours) * 100);
  const ptPercent = 100 - ftPercent;
  const activeRoster = roster.filter(p => p.rosterStatus === 'Active');
  const ftCount = activeRoster.filter(p => p.status === 'FT').length;
  const ptCount = activeRoster.filter(p => p.status === 'PT').length;

  const coverageIssues = summary.filter(d => d.openDelta < 0 || d.closeDelta < 0 || d.overnightDelta < 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Dashboard</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Weekly overview of labor, staffing, and coverage health.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-label-bold uppercase text-on-surface-variant mb-1">Weekly Budget</div>
            <div className="text-headline-lg text-on-surface font-bold font-data-tabular tabular-nums">{weeklyHoursAvailable}h</div>
            <div className="text-body-sm text-on-surface-variant mt-1">Target allocation</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-label-bold uppercase text-on-surface-variant mb-1">Scheduled</div>
            <div className={`text-headline-lg font-bold font-data-tabular tabular-nums ${isOverBudget ? 'text-error' : 'text-status-opener-text'}`}>
              {formatHours(totals.scheduled)}h
            </div>
            <div className={`text-body-sm mt-1 ${isOverBudget ? 'text-error' : 'text-status-opener-text'}`}>
              {isOverBudget ? `+${formatHours(totals.overage)}h over` : `-${formatHours(totals.difference)}h under`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-label-bold uppercase text-on-surface-variant mb-1">Active Team</div>
            <div className="text-headline-lg text-on-surface font-bold font-data-tabular tabular-nums">{activeRoster.length}</div>
            <div className="text-body-sm text-on-surface-variant mt-1">{ftCount} FT · {ptCount} PT</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-label-bold uppercase text-on-surface-variant mb-1">Coverage Issues</div>
            <div className={`text-headline-lg font-bold font-data-tabular tabular-nums ${coverageIssues.length > 0 ? 'text-error' : 'text-status-opener-text'}`}>
              {coverageIssues.length}
            </div>
            <div className={`text-body-sm mt-1 ${coverageIssues.length > 0 ? 'text-error' : 'text-status-opener-text'}`}>
              {coverageIssues.length === 0 ? 'All days covered' : 'Days with gaps'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget utilization */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline-md text-headline-md text-on-surface">Budget Utilization</h2>
            <span className={`text-label-bold font-label-bold px-2 py-1 rounded-full ${isOverBudget ? 'bg-error-container text-on-error-container' : 'bg-status-opener-bg text-status-opener-text'}`}>
              {budgetUsed.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isOverBudget ? 'bg-error' : 'bg-status-opener-text'}`}
              style={{ width: `${Math.min(100, budgetUsed)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-body-sm text-on-surface-variant font-data-tabular tabular-nums">
            <span>0h</span>
            <span>{formatHours(totals.scheduled)}h scheduled</span>
            <span>{weeklyHoursAvailable}h budget</span>
          </div>
        </CardContent>
      </Card>

      {/* FT/PT breakdown + Coverage per day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Staff Mix (by hours)</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-body-md text-on-surface mb-1">
                  <span>Full Time</span>
                  <span className="font-data-tabular tabular-nums font-semibold">{formatHours(totals.fullTime)}h · {ftPercent}%</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${ftPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-body-md text-on-surface mb-1">
                  <span>Part Time</span>
                  <span className="font-data-tabular tabular-nums font-semibold">{formatHours(totals.partTime)}h · {ptPercent}%</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${ptPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-body-md text-on-surface mb-1">
                  <span>Core (counted)</span>
                  <span className="font-data-tabular tabular-nums font-semibold">{formatHours(totals.coreScheduled)}h</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.round((totals.coreScheduled / (totals.scheduled || 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Daily Coverage Health</h2>
            <div className="space-y-2">
              {summary.map(day => {
                const ok = day.openDelta >= 0 && day.closeDelta >= 0 && day.overnightDelta >= 0;
                const issues = [];
                if (day.openDelta < 0) issues.push(`${Math.abs(day.openDelta)} opener${Math.abs(day.openDelta) > 1 ? 's' : ''} short`);
                if (day.closeDelta < 0) issues.push(`${Math.abs(day.closeDelta)} closer${Math.abs(day.closeDelta) > 1 ? 's' : ''} short`);
                if (day.overnightDelta < 0) issues.push(`${Math.abs(day.overnightDelta)} overnight short`);
                return (
                  <div key={day.day} className={`flex items-center justify-between rounded-md px-3 py-2 ${ok ? 'bg-status-opener-bg' : 'bg-error-container'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${ok ? 'text-status-opener-text' : 'text-on-error-container'}`}>
                        {ok ? 'check_circle' : 'warning'}
                      </span>
                      <span className={`font-body-md font-semibold ${ok ? 'text-status-opener-text' : 'text-on-error-container'}`}>{day.day}</span>
                      <span className={`text-body-sm ${ok ? 'text-status-opener-text' : 'text-on-error-container'}`}>{day.date}</span>
                    </div>
                    <span className={`text-body-sm font-medium ${ok ? 'text-status-opener-text' : 'text-on-error-container'}`}>
                      {ok ? 'All roles met' : issues.join(', ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
