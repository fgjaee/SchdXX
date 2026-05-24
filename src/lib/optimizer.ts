import type { TeamMember, Target, ShiftDefinitions, Day } from '../types';
import {
  days,
  parseShift,
  roleFor,
  checkAvailabilityViolation,
  toNumber,
  canWorkCoverageRole,
  dateAllowsPerson,
  availabilityAllowsShift,
  recommendedShiftFor,
  buildCoverageCountsForDay,
  coverageRoleForPersonShift,
  compareSeniority,
  seniorityTimestamp,
  isBackupCloser,
} from './helpers';

/**
 * Union-style Produce schedule revision engine.
 *
 * The old engine mostly asked, "Who is free?" This one asks the safer
 * question first: "Who is active, available, qualified, under caps, and next
 * by seniority/minimum-hour need?"
 */

type CoverageRole = 'overnight' | 'open' | 'close';

export type ScheduleChange = {
  personId: string;
  name: string;
  dayIndex: number;
  day: Day;
  from: string;
  to: string;
  reason: string;
  kind: 'add' | 'remove';
};

export type RevisionResult = {
  changes: ScheduleChange[];
  notes: string[];
};

export interface ReviseScheduleArgs {
  roster: TeamMember[];
  targets: Target[];
  shiftDefinitions: ShiftDefinitions;
  autoDeductLunch: boolean;
  minimumShiftLength: number;
  weeklyHoursAvailable: number;
}

type Candidate = {
  person: TeamMember;
  currentHours: number;
  minHours: number;
  maxHours: number;
  daysWorked: number;
  shift: string;
  shiftHours: number;
  backupCloserPenalty: number;
};

const ROLE_ORDER: CoverageRole[] = ['overnight', 'open', 'close'];
const DEFAULT_MAX_HOURS = 40;

function isFullTime(p: TeamMember): boolean {
  return p.status === 'FT';
}

function isActiveSchedulable(p: TeamMember): boolean {
  return p.rosterStatus !== 'Inactive' && (p.coverageStatus || 'Included') !== 'Excluded' && !p.scheduleLocked;
}

function maxDaysFor(p: TeamMember): number {
  return isFullTime(p) ? 5 : 6;
}

function maxHoursFor(p: TeamMember): number {
  return typeof p.maxHours === 'number' && p.maxHours > 0 ? p.maxHours : DEFAULT_MAX_HOURS;
}

function minHoursFor(p: TeamMember): number {
  if (typeof p.minHours === 'number' && p.minHours > 0) return p.minHours;
  return isFullTime(p) ? 40 : 0;
}

function shiftHours(shift: string, autoDeductLunch: boolean): number {
  return parseShift(shift, autoDeductLunch)?.hours || 0;
}

function weeklyHoursOf(p: TeamMember, autoDeductLunch: boolean): number {
  return p.shifts.reduce((sum, shift) => sum + shiftHours(shift, autoDeductLunch), 0);
}

function workedDaysOf(p: TeamMember): number {
  return p.shifts.filter(s => s && s.trim()).length;
}

function totalHours(roster: TeamMember[], autoDeductLunch: boolean): number {
  return roster.reduce((sum, p) => p.rosterStatus === 'Inactive' ? sum : sum + weeklyHoursOf(p, autoDeductLunch), 0);
}

function neededFor(target: Target | undefined): Record<CoverageRole, number> {
  return {
    overnight: Math.max(0, toNumber(target?.overnightNeeded ?? '0')),
    open: Math.max(0, toNumber(target?.openNeeded ?? '0')),
    close: Math.max(0, toNumber(target?.closeNeeded ?? '0')),
  };
}

function compareCandidates(a: Candidate, b: Candidate): number {
  // Keep Nabil as backup closer unless he is truly needed.
  if (a.backupCloserPenalty !== b.backupCloserPenalty) return a.backupCloserPenalty - b.backupCloserPenalty;

  const s = seniorityTimestamp(a.person) - seniorityTimestamp(b.person);
  if (s !== 0 && !Number.isNaN(s)) return s;

  const aBelowMin = a.currentHours < a.minHours;
  const bBelowMin = b.currentHours < b.minHours;
  if (aBelowMin !== bBelowMin) return aBelowMin ? -1 : 1;

  if (a.currentHours !== b.currentHours) return a.currentHours - b.currentHours;
  if (a.daysWorked !== b.daysWorked) return a.daysWorked - b.daysWorked;

  return a.person.name.localeCompare(b.person.name);
}

function candidateFor(
  p: TeamMember,
  dayIndex: number,
  target: Target | undefined,
  role: CoverageRole,
  autoDeductLunch: boolean
): Candidate | null {
  if (!isActiveSchedulable(p)) return null;
  if ((p.shifts[dayIndex] || '').trim()) return null;
  if (!dateAllowsPerson(p, dayIndex, target?.date)) return null;
  if (!canWorkCoverageRole(p, role)) return null;

  const shift = recommendedShiftFor(p, role);
  if (!shift) return null;
  if (!availabilityAllowsShift(p, dayIndex, shift)) return null;

  const currentHours = weeklyHoursOf(p, autoDeductLunch);
  const shiftHrs = shiftHours(shift, autoDeductLunch);
  const maxHours = maxHoursFor(p);
  const daysWorked = workedDaysOf(p);

  if (daysWorked >= maxDaysFor(p)) return null;
  if (currentHours + shiftHrs > maxHours) return null;

  return {
    person: p,
    currentHours,
    minHours: minHoursFor(p),
    maxHours,
    daysWorked,
    shift,
    shiftHours: shiftHrs,
    backupCloserPenalty: role === 'close' && isBackupCloser(p) ? 1 : 0,
  };
}

function roleWouldRemainCovered(
  roster: TeamMember[],
  p: TeamMember,
  dayIndex: number,
  defs: ShiftDefinitions,
  targets: Target[]
): boolean {
  const role = coverageRoleForPersonShift(p, p.shifts[dayIndex] || '', defs);
  if (role !== 'open' && role !== 'close' && role !== 'overnight') return true;

  const after = roster.map(r => r.id === p.id ? { ...r, shifts: r.shifts.map((s, i) => i === dayIndex ? '' : s) } : r);
  const counts = buildCoverageCountsForDay(after, dayIndex, defs);
  const need = neededFor(targets[dayIndex]);
  return counts[role] >= need[role];
}

function cutComparator(a: { p: TeamMember; role: string; hrs: number }, b: { p: TeamMember; role: string; hrs: number }): number {
  // Least senior first for cuts.
  const s = seniorityTimestamp(b.p) - seniorityTimestamp(a.p);
  if (s !== 0 && !Number.isNaN(s)) return s;

  const rank = (role: string) => role === 'mid' ? 0 : role === 'close' ? 1 : role === 'overnight' ? 2 : role === 'open' ? 3 : 0;
  const rr = rank(a.role) - rank(b.role);
  if (rr !== 0) return rr;

  return b.hrs - a.hrs;
}

export function reviseSchedule(args: ReviseScheduleArgs): RevisionResult {
  const { targets, shiftDefinitions: defs, autoDeductLunch, weeklyHoursAvailable } = args;
  const roster = args.roster.map(p => ({ ...p, shifts: [...p.shifts] })).sort(compareSeniority);
  const changes: ScheduleChange[] = [];
  const notes: string[] = [];

  const record = (p: TeamMember, d: number, from: string, to: string, reason: string, kind: 'add' | 'remove') => {
    changes.push({ personId: p.id, name: p.name, dayIndex: d, day: days[d], from, to, reason, kind });
  };

  // Pass 0: remove availability violations only for flexible PT staff.
  for (const p of roster) {
    if (p.rosterStatus === 'Inactive') continue;
    for (let d = 0; d < 7; d++) {
      const shift = p.shifts[d] || '';
      if (!shift.trim()) continue;
      const chk = checkAvailabilityViolation(shift, p.unavailable[d] || '');
      if (!chk.isViolation && !chk.isHardBlock) continue;

      if (p.status === 'FT' || p.scheduleLocked) {
        notes.push(`${p.name}: ${days[d]} ${shift} conflicts with availability (${p.unavailable[d] || 'blank'}) and was left for manual review.`);
        continue;
      }

      record(p, d, shift, '', `Clear availability conflict on ${days[d]}`, 'remove');
      p.shifts[d] = '';
    }
  }

  // Pass 1: fill coverage in the correct operational order.
  for (const role of ROLE_ORDER) {
    for (let d = 0; d < 7; d++) {
      const need = neededFor(targets[d]);
      let guard = 0;

      while (buildCoverageCountsForDay(roster, d, defs)[role] < need[role] && guard < 25) {
        guard++;
        const candidates = roster
          .map(p => candidateFor(p, d, targets[d], role, autoDeductLunch))
          .filter(Boolean) as Candidate[];
        candidates.sort(compareCandidates);

        const pick = candidates[0];
        if (!pick) {
          notes.push(`${days[d]}: short ${role} coverage. No active, available, qualified staff within seniority, day, and hour limits.`);
          break;
        }

        record(
          pick.person,
          d,
          '',
          pick.shift,
          `${role} coverage by seniority: active, available, qualified, ${pick.currentHours.toFixed(1)}h/${pick.minHours}h min`,
          'add'
        );
        pick.person.shifts[d] = pick.shift;
      }
    }
  }

  // Pass 2: best effort minimum-hours top-up, still respecting qualification.
  for (const p of roster) {
    if (!isActiveSchedulable(p)) continue;
    const min = minHoursFor(p);
    if (min <= 0) continue;

    let guard = 0;
    while (weeklyHoursOf(p, autoDeductLunch) < min && guard < 14) {
      guard++;
      const roleOrder: CoverageRole[] = canWorkCoverageRole(p, 'overnight')
        ? ['overnight']
        : canWorkCoverageRole(p, 'close') && !isBackupCloser(p)
          ? ['close', 'open']
          : ['open', 'close'];

      let added = false;
      for (let d = 0; d < 7 && !added; d++) {
        if ((p.shifts[d] || '').trim()) continue;
        for (const role of roleOrder) {
          const candidate = candidateFor(p, d, targets[d], role, autoDeductLunch);
          if (!candidate) continue;
          record(p, d, '', candidate.shift, `Meet ${p.name}'s ${min}h weekly minimum`, 'add');
          p.shifts[d] = candidate.shift;
          added = true;
          break;
        }
      }

      if (!added) {
        notes.push(`${p.name}: could not reach the ${min}h minimum due to availability, role limits, or hour/day caps.`);
        break;
      }
    }
  }

  // Pass 3: trim to budget, PT only, least senior first, never breaking coverage or minimums.
  if (weeklyHoursAvailable > 0) {
    let guard = 0;
    while (totalHours(roster, autoDeductLunch) > weeklyHoursAvailable && guard < 300) {
      guard++;
      let removed = false;

      for (let d = 0; d < 7 && !removed; d++) {
        const candidates = roster
          .filter(p => isActiveSchedulable(p) && !isFullTime(p) && !p.isTeamLeader && (p.shifts[d] || '').trim())
          .map(p => ({ p, role: coverageRoleForPersonShift(p, p.shifts[d] || '', defs), hrs: shiftHours(p.shifts[d] || '', autoDeductLunch) }))
          .filter(({ p, hrs }) => weeklyHoursOf(p, autoDeductLunch) - hrs >= minHoursFor(p))
          .filter(({ p }) => roleWouldRemainCovered(roster, p, d, defs, targets))
          .sort(cutComparator);

        const pick = candidates[0];
        if (!pick) continue;

        const from = pick.p.shifts[d];
        record(pick.p, d, from, '', `Trim labor to ${weeklyHoursAvailable}h budget without breaking coverage or minimum hours`, 'remove');
        pick.p.shifts[d] = '';
        removed = true;
      }

      if (!removed) {
        const over = Number((totalHours(roster, autoDeductLunch) - weeklyHoursAvailable).toFixed(1));
        notes.push(`Still ${over}h over budget. No further safe PT cuts without breaking coverage, availability, or minimum-hour rules.`);
        break;
      }
    }
  }

  if (changes.length === 0 && notes.length === 0) {
    notes.push('No automatic changes were needed.');
  }

  return { changes, notes };
}
