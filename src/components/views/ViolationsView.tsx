import type { TeamMember, Target, SummaryRow } from '../../types';
import { checkAvailabilityViolation, days } from '../../lib/helpers';
import { Card, CardContent } from '../ui';

interface ViolationsViewProps {
  roster: TeamMember[];
  targets: Target[];
  summary: SummaryRow[];
}

interface Violation {
  type: 'availability' | 'coverage' | 'sixth-day';
  severity: 'error' | 'warning';
  person?: string;
  day?: string;
  date?: string;
  message: string;
}

export function ViolationsView({ roster, targets, summary }: ViolationsViewProps) {
  const violations: Violation[] = [];

  // 1. Availability violations
  roster.forEach(person => {
    person.shifts.forEach((shift, i) => {
      const avail = person.unavailable?.[i] ?? '';
      const check = checkAvailabilityViolation(shift, avail);
      if (check.isViolation) {
        violations.push({
          type: 'availability',
          severity: check.isHardBlock ? 'error' : 'warning',
          person: person.name,
          day: days[i],
          date: targets[i]?.date,
          message: check.isHardBlock
            ? `${person.name} is unavailable on ${days[i]} (${targets[i]?.date ?? ''}) but has a shift: "${shift}"`
            : `${person.name} shift "${shift}" on ${days[i]} conflicts with availability: "${avail}"`,
        });
      }
    });
  });

  // 2. Sixth-day violations (7 consecutive scheduled days)
  roster.forEach(person => {
    const scheduled = person.shifts.map(s => s.trim().length > 0);
    for (let i = 0; i <= scheduled.length - 6; i++) {
      if (scheduled.slice(i, i + 6).every(Boolean)) {
        violations.push({
          type: 'sixth-day',
          severity: 'error',
          person: person.name,
          day: days[i + 5],
          date: targets[i + 5]?.date,
          message: `${person.name} is scheduled 6 consecutive days (${days[i]}–${days[i + 5]})`,
        });
        break;
      }
    }
  });

  // 3. Coverage shortfalls
  summary.forEach((day, i) => {
    const target = targets[i];
    if (day.openDelta < 0) {
      violations.push({
        type: 'coverage',
        severity: 'warning',
        day: day.day,
        date: target?.date,
        message: `${day.day} (${target?.date ?? ''}): ${Math.abs(day.openDelta)} opener${Math.abs(day.openDelta) > 1 ? 's' : ''} short (have ${day.open}, need ${parseInt(target?.openNeeded ?? '0')})`,
      });
    }
    if (day.closeDelta < 0) {
      violations.push({
        type: 'coverage',
        severity: 'warning',
        day: day.day,
        date: target?.date,
        message: `${day.day} (${target?.date ?? ''}): ${Math.abs(day.closeDelta)} closer${Math.abs(day.closeDelta) > 1 ? 's' : ''} short`,
      });
    }
    if (day.overnightDelta < 0) {
      violations.push({
        type: 'coverage',
        severity: 'warning',
        day: day.day,
        date: target?.date,
        message: `${day.day} night: overnight coverage short by ${Math.abs(day.overnightDelta)}`,
      });
    }
  });

  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  const passed = violations.length === 0;

  const typeIcon: Record<Violation['type'], string> = {
    availability: 'event_busy',
    'sixth-day': 'calendar_today',
    coverage: 'group',
  };

  const typeLabel: Record<Violation['type'], string> = {
    availability: 'Availability',
    'sixth-day': '6th Day',
    coverage: 'Coverage',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Violations</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">All scheduling rule violations found in the current roster.</p>
      </div>

      {/* Summary banner */}
      <div className={`rounded-xl px-5 py-4 flex items-center gap-4 border ${passed ? 'bg-status-opener-bg border-status-opener-text/20' : 'bg-error-container border-error/20'}`}>
        <span className={`material-symbols-outlined text-[32px] ${passed ? 'text-status-opener-text' : 'text-on-error-container'}`}>
          {passed ? 'verified' : 'report_problem'}
        </span>
        <div>
          <div className={`font-headline-md font-bold ${passed ? 'text-status-opener-text' : 'text-on-error-container'}`}>
            {passed ? 'No Violations Found' : `${violations.length} Issue${violations.length > 1 ? 's' : ''} Detected`}
          </div>
          <div className={`text-body-md ${passed ? 'text-status-opener-text' : 'text-on-error-container'}`}>
            {passed ? 'Current roster passes all validation rules.' : `${errors.length} error${errors.length !== 1 ? 's' : ''} · ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Stats */}
      {!passed && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Availability', count: violations.filter(v => v.type === 'availability').length, icon: 'event_busy', color: 'text-error', bg: 'bg-error-container' },
            { label: '6-Day Shifts', count: violations.filter(v => v.type === 'sixth-day').length, icon: 'calendar_today', color: 'text-error', bg: 'bg-error-container' },
            { label: 'Coverage Gaps', count: violations.filter(v => v.type === 'coverage').length, icon: 'group', color: 'text-amber-700', bg: 'bg-amber-50' },
          ].map(({ label, count, icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
                </div>
                <div>
                  <div className={`text-headline-md font-bold font-data-tabular ${color}`}>{count}</div>
                  <div className="text-body-sm text-on-surface-variant">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Violation list */}
      {violations.length > 0 && (
        <Card>
          <CardContent className="p-0 divide-y divide-outline-variant/20">
            {violations.map((v, i) => (
              <div key={i} className={`flex items-start gap-4 px-5 py-4 ${v.severity === 'error' ? 'bg-error-container/30' : 'bg-amber-50/50'}`}>
                <span className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0 ${v.severity === 'error' ? 'text-error' : 'text-amber-700'}`}>
                  {typeIcon[v.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-label-bold uppercase px-1.5 py-0.5 rounded text-[10px] ${v.severity === 'error' ? 'bg-error text-on-error' : 'bg-amber-600 text-white'}`}>
                      {v.severity}
                    </span>
                    <span className="text-label-bold uppercase text-on-surface-variant text-[11px]">{typeLabel[v.type]}</span>
                    {v.person && <span className="text-body-sm font-semibold text-on-surface">{v.person}</span>}
                    {v.day && <span className="text-body-sm text-on-surface-variant">{v.day}{v.date ? ` · ${v.date}` : ''}</span>}
                  </div>
                  <p className="text-body-md text-on-surface">{v.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {passed && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-status-opener-text">task_alt</span>
            <div className="font-headline-md text-on-surface">All Clear</div>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Your schedule passes all availability, 6-day, and coverage validation rules.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
