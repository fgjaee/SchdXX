import type { TeamMember, Target, SummaryRow } from '../../types';
import { Card, CardContent } from '../ui';

interface ComplianceViewProps {
  roster: TeamMember[];
  targets: Target[];
  summary: SummaryRow[];
}

export function ComplianceView({ roster, targets, summary }: ComplianceViewProps) {
  const activeRoster = roster.filter(p => p.rosterStatus === 'Active');

  // 6-day detection
  const sixDayPersons = activeRoster.filter(p => {
    const scheduled = p.shifts.map(s => s.trim().length > 0);
    for (let i = 0; i <= scheduled.length - 6; i++) {
      if (scheduled.slice(i, i + 6).every(Boolean)) return true;
    }
    return false;
  });

  // Per-day coverage compliance
  const coverageStatus = summary.map((day, i) => ({
    day: day.day,
    date: targets[i]?.date ?? '',
    openers: { have: day.open, need: parseInt(targets[i]?.openNeeded ?? '0'), ok: day.openDelta >= 0 },
    closers: { have: day.close, need: parseInt(targets[i]?.openNeeded ?? '0'), ok: day.closeDelta >= 0 },
    overnight: { have: day.overnight, need: parseInt(targets[i]?.overnightNeeded ?? '0'), ok: day.overnightDelta >= 0 },
  }));

  const allCoverageOk = coverageStatus.every(d => d.openers.ok && d.closers.ok && d.overnight.ok);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Compliance</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Rule adherence and scheduling policy checks.</p>
      </div>

      {/* Rule summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-label-bold uppercase text-on-surface-variant mb-1">6-Day Rule</div>
                <div className={`text-headline-md font-bold ${sixDayPersons.length === 0 ? 'text-status-opener-text' : 'text-error'}`}>
                  {sixDayPersons.length === 0 ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-body-sm text-on-surface-variant mt-1">
                  {sixDayPersons.length === 0 ? 'No 6-consecutive-day shifts' : `${sixDayPersons.length} employee${sixDayPersons.length > 1 ? 's' : ''} affected`}
                </div>
              </div>
              <span className={`material-symbols-outlined text-[32px] ${sixDayPersons.length === 0 ? 'text-status-opener-text' : 'text-error'}`}>
                {sixDayPersons.length === 0 ? 'check_circle' : 'cancel'}
              </span>
            </div>
            {sixDayPersons.length > 0 && (
              <div className="mt-3 space-y-1">
                {sixDayPersons.map(p => (
                  <div key={p.id} className="text-body-sm text-error bg-error-container rounded px-2 py-1">{p.name}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-label-bold uppercase text-on-surface-variant mb-1">Coverage Rules</div>
                <div className={`text-headline-md font-bold ${allCoverageOk ? 'text-status-opener-text' : 'text-error'}`}>
                  {allCoverageOk ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-body-sm text-on-surface-variant mt-1">
                  {allCoverageOk ? 'All days meet role minimums' : `${coverageStatus.filter(d => !d.openers.ok || !d.closers.ok || !d.overnight.ok).length} day${coverageStatus.filter(d => !d.openers.ok || !d.closers.ok || !d.overnight.ok).length > 1 ? 's' : ''} short`}
                </div>
              </div>
              <span className={`material-symbols-outlined text-[32px] ${allCoverageOk ? 'text-status-opener-text' : 'text-error'}`}>
                {allCoverageOk ? 'check_circle' : 'cancel'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-label-bold uppercase text-on-surface-variant mb-1">Overall Status</div>
                <div className={`text-headline-md font-bold ${sixDayPersons.length === 0 && allCoverageOk ? 'text-status-opener-text' : 'text-error'}`}>
                  {sixDayPersons.length === 0 && allCoverageOk ? 'PASS' : 'REVIEW NEEDED'}
                </div>
                <div className="text-body-sm text-on-surface-variant mt-1">
                  {sixDayPersons.length + coverageStatus.filter(d => !d.openers.ok || !d.closers.ok || !d.overnight.ok).length} total issue{(sixDayPersons.length + coverageStatus.filter(d => !d.openers.ok || !d.closers.ok || !d.overnight.ok).length) !== 1 ? 's' : ''}
                </div>
              </div>
              <span className={`material-symbols-outlined text-[32px] ${sixDayPersons.length === 0 && allCoverageOk ? 'text-status-opener-text' : 'text-amber-600'}`}>
                {sixDayPersons.length === 0 && allCoverageOk ? 'verified' : 'warning'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily coverage grid */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Daily Coverage Compliance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="p-3 text-left text-label-bold uppercase text-on-surface-variant">Day</th>
                  <th className="p-3 text-left text-label-bold uppercase text-on-surface-variant">Date</th>
                  <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Openers</th>
                  <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Closers</th>
                  <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Overnight</th>
                  <th className="p-3 text-center text-label-bold uppercase text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody>
                {coverageStatus.map(d => {
                  const allOk = d.openers.ok && d.closers.ok && d.overnight.ok;
                  return (
                    <tr key={d.day} className={`border-b border-outline-variant/20 ${allOk ? '' : 'bg-error-container/20'}`}>
                      <td className="p-3 font-bold text-on-surface">{d.day}</td>
                      <td className="p-3 text-on-surface-variant font-data-tabular tabular-nums">{d.date}</td>
                      <td className="p-3 text-center">
                        <span className={`font-data-tabular tabular-nums font-semibold ${d.openers.ok ? 'text-status-opener-text' : 'text-error'}`}>
                          {d.openers.have}/{d.openers.need}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-data-tabular tabular-nums font-semibold ${d.closers.ok ? 'text-status-opener-text' : 'text-error'}`}>
                          {d.closers.have}/{d.closers.need}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-data-tabular tabular-nums font-semibold ${d.overnight.ok ? 'text-status-opener-text' : 'text-error'}`}>
                          {d.overnight.have}/{d.overnight.need}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-bold ${allOk ? 'bg-status-opener-bg text-status-opener-text' : 'bg-error-container text-on-error-container'}`}>
                          <span className="material-symbols-outlined text-[14px]">{allOk ? 'check' : 'close'}</span>
                          {allOk ? 'Met' : 'Short'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
