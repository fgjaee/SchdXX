import type { Day, Role, Target, TeamMember, ParsedShift, ShiftDefinitions } from '../types';

export const days: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const storageKey = "editable-roster-staffing-view-v3";
export const dailyTruckStartDate = "2026-05-17";

export const defaultShiftDefinitions: ShiftDefinitions = {
  // Produce morning coverage includes the early openers and 9:00 AM starts.
  // 9:10 AM and later should be treated as mid coverage.
  open: { start: 3, end: 9 },
  mid: { start: 9.01, end: 11.99 },
  close: { start: 12, end: 20.99 },
  overnight: { start: 21, end: 2.99 },
};

export function emptyShifts(): string[] {
  return Array(days.length).fill("");
}

export function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function addDays(date: string, amount: number): string {
  const parts = date.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return "";
  const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
  parsed.setDate(parsed.getDate() + amount);
  return `${parsed.getFullYear()}-${padNumber(parsed.getMonth() + 1)}-${padNumber(parsed.getDate())}`;
}

export function nextDay(day: Day): Day {
  return days[(days.indexOf(day) + 1) % days.length];
}

export function defaultTruckForDate(day: Day, date: string): boolean {
  if (date >= dailyTruckStartDate) return true;
  return day !== "Thu";
}

export function defaultOpenNeededForDate(day: Day, date: string): string {
  return defaultTruckForDate(day, date) ? "5" : "4";
}

export function defaultOvernightNeededForNight(day: Day, date: string): string {
  const nextMorningDate = addDays(date, 1);
  const nextMorningDay = nextDay(day);
  return defaultTruckForDate(nextMorningDay, nextMorningDate) ? "1" : "0";
}

export function parseTime(text: string): number | null {
  const normalized = text
    .trim()
    .replace(/\./g, "")
    .replace(/:\s+/g, ":")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/\bA\b$/, "AM")
    .replace(/\bP\b$/, "PM");
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = match[3];
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour + minute / 60;
}

export function parseShift(shift: string, autoDeductLunch = false): ParsedShift | null {
  const cleaned = String(shift || "")
    .replace(/[–—]/g, "-")
    .replace(/:\s+/g, ":")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(/\s*-\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (start === null || end === null) return null;
  if (end <= start) end += 24;
  let hours = end - start;
  if (autoDeductLunch && hours >= 6) hours -= 0.5;
  return { start, end, hours: Number(hours.toFixed(2)) };
}

function normalizeAvailabilityText(value: string): string {
  return String(value || "")
    .trim()
    .replace(/:\s+/g, ":")
    .replace(/\s+/g, " ");
}

function isNoAvailabilityBlock(value: string): boolean {
  const v = normalizeAvailabilityText(value).toLowerCase();
  return v === "unavailable" || v === "n/a" || v === "na" || v === "off" || v === "not available" || v === "cannot work" || v === "can't work";
}

function isAvailabilityOpen(value: string): boolean {
  const v = normalizeAvailabilityText(value).toLowerCase();
  return !v || v === "available" || v === "open" || v === "preferred off" || v === "preference off" || v === "preferred day off" || v === "time off" || v === "paid day off" || v === "unpaid" || v === "paid";
}

function availabilityPayload(value: string): string {
  return normalizeAvailabilityText(value)
    .replace(/^limited\s*:\s*/i, "")
    .replace(/^close only\s*:\s*/i, "")
    .replace(/^available\s*:\s*/i, "");
}

export function isOvernightShiftText(shiftText: string, defs: ShiftDefinitions = defaultShiftDefinitions): boolean {
  const parsed = parseShift(shiftText, false);
  if (!parsed) return false;
  const s = parsed.start % 24;
  return defs.overnight.start > defs.overnight.end
    ? s >= defs.overnight.start || s <= defs.overnight.end
    : s >= defs.overnight.start && s <= defs.overnight.end;
}

export function checkAvailabilityViolation(shiftText: string, availabilityText: string): { isViolation: boolean; message: string | null; isHardBlock: boolean } {
  const raw = normalizeAvailabilityText(availabilityText);
  if (isAvailabilityOpen(raw)) return { isViolation: false, message: raw || null, isHardBlock: false };
  if (isNoAvailabilityBlock(raw)) {
    return { isViolation: shiftText.trim().length > 0, message: availabilityText, isHardBlock: true };
  }

  const lower = raw.toLowerCase();
  const shiftParsed = parseShift(shiftText, false);

  if (lower.includes("morning only")) {
    const ok = !!shiftParsed && shiftParsed.start >= 3 && shiftParsed.start <= 9.01;
    return { isViolation: !ok && !!shiftText.trim(), message: raw, isHardBlock: false };
  }

  if (lower.includes("overnight only")) {
    const ok = isOvernightShiftText(shiftText);
    return { isViolation: !ok && !!shiftText.trim(), message: raw, isHardBlock: false };
  }

  if (lower.includes("early am") || lower.includes("early morning")) {
    const ok = !!shiftParsed && (shiftParsed.start <= 4.5 || isOvernightShiftText(shiftText));
    return { isViolation: !ok && !!shiftText.trim(), message: raw, isHardBlock: false };
  }

  const payload = availabilityPayload(raw);
  const availBlocks = payload.split(/,|\/|\bor\b|\band\b/i).map((s) => s.trim()).filter(Boolean);
  const parsedBlocks = availBlocks.map((b) => parseShift(b, false)).filter(Boolean) as ParsedShift[];
  if (parsedBlocks.length === 0) {
    const looksLikePreference = /preferred|preference|summer|school year/i.test(raw);
    return { isViolation: false, message: raw, isHardBlock: !looksLikePreference && !!shiftText.trim() };
  }
  if (!shiftText.trim()) return { isViolation: false, message: `Avail: ${availabilityText}`, isHardBlock: false };
  if (!shiftParsed) return { isViolation: true, message: "Invalid Shift Format", isHardBlock: false };

  const sStart = shiftParsed.start;
  const sEnd = shiftParsed.end;
  const matchesAny = parsedBlocks.some((a) => {
    const aStart = a.start;
    const aEnd = a.end;
    return (sStart >= aStart && sEnd <= aEnd) || (sStart + 24 >= aStart && sEnd + 24 <= aEnd) || (sStart >= aStart + 24 && sEnd <= aEnd + 24);
  });

  if (!matchesAny) return { isViolation: true, message: "Outside Availability", isHardBlock: false };
  return { isViolation: false, message: `Avail: ${availabilityText}`, isHardBlock: false };
}

export function formatTimeText(hours: number): string {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  h = h % 24;
  const ampm = h >= 12 ? "PM" : "AM";
  let dispH = h % 12;
  if (dispH === 0) dispH = 12;
  return `${dispH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function roleFor(coverageStatus: "Included" | "Excluded" | undefined, shift: string, defs: ShiftDefinitions): Role {
  const parsed = parseShift(shift);
  if (!parsed) return "none";
  if (coverageStatus === "Excluded") return "excluded";
  const s = parsed.start % 24;
  if (defs.overnight.start > defs.overnight.end) {
    if (s >= defs.overnight.start || s <= defs.overnight.end) return "overnight";
  } else if (s >= defs.overnight.start && s <= defs.overnight.end) {
    return "overnight";
  }
  if (s >= defs.open.start && s <= defs.open.end) return "open";
  if (s >= defs.mid.start && s <= defs.mid.end) return "mid";
  if (s >= defs.close.start && s <= defs.close.end) return "close";
  return "mid";
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = { open: "Opener", mid: "Mid", close: "Closer", overnight: "Overnight", excluded: "Not counted", none: "None" };
  return labels[role];
}

export function cellClass(role: Role): string {
  const classes: Record<Role, string> = {
    open: "bg-status-opener-bg border-status-opener-text/20",
    close: "bg-status-closer-bg border-status-closer-text/20",
    overnight: "bg-status-overnight-bg border-status-overnight-text/20",
    excluded: "bg-surface-container-high border-outline-variant",
    mid: "bg-status-mid-bg border-status-mid-text/20",
    none: "bg-surface-container-lowest border-outline-variant",
  };
  return classes[role];
}

export function toNumber(value: string | number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatHours(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function normalizeNameKey(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function seniorityTimestamp(p: TeamMember): number {
  if (!p.seniorityDate) return Number.POSITIVE_INFINITY;
  const t = Date.parse(p.seniorityDate);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

// Union-style display and assignment order: seniority date first, then name.
export function compareSeniority(a: TeamMember, b: TeamMember): number {
  const s = seniorityTimestamp(a) - seniorityTimestamp(b);
  if (s !== 0 && !Number.isNaN(s)) return s;
  if (a.status !== b.status) return a.status === 'FT' ? -1 : 1;
  return (a.name || '').localeCompare(b.name || '');
}

export function createTeamMember(index: number): TeamMember {
  return {
    id: `new-team-member-${index}-${Date.now()}`,
    name: `New Team Member ${index + 1}`,
    status: "PT",
    rosterStatus: "Active",
    shifts: emptyShifts(),
    unavailable: emptyShifts(),
  };
}

export function applyOvernightFromMorningTrucks(targets: Target[]): Target[] {
  return targets.map((target, index) => {
    const nextIndex = index + 1;
    const nextMorningHasTruck =
      nextIndex < targets.length
        ? targets[nextIndex].truck
        : defaultTruckForDate("Sun", addDays(target.date, 1));
    return { ...target, overnightNeeded: nextMorningHasTruck ? "1" : "0" };
  });
}

export function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function getWeekId(date: Date): string {
  return formatDate(getSunday(date));
}

export function getWeekLabels() {
  const today = new Date();
  const currentSun = getSunday(today);
  const lastSun = new Date(currentSun);
  lastSun.setDate(lastSun.getDate() - 7);
  const nextSun = new Date(currentSun);
  nextSun.setDate(nextSun.getDate() + 7);
  const nextNextSun = new Date(currentSun);
  nextNextSun.setDate(nextNextSun.getDate() + 14);

  return [
    { label: 'Last Week', id: formatDate(lastSun), date: lastSun },
    { label: 'Current Week', id: formatDate(currentSun), date: currentSun },
    { label: 'Next Week', id: formatDate(nextSun), date: nextSun },
    { label: 'Next Week +1', id: formatDate(nextNextSun), date: nextNextSun },
  ];
}

export function checkSixthDayViolation(member: TeamMember): boolean {
  if (member.rosterStatus === 'Inactive') return false;
  const shiftCount = member.shifts.filter(s => s.trim().length > 0).length;
  return shiftCount >= 6;
}

export function createDefaultTargets(startDate: string): Target[] {
  return days.map((day, index) => {
    const date = addDays(startDate, index);
    return {
      day, date,
      truck: defaultTruckForDate(day, date),
      openNeeded: defaultOpenNeededForDate(day, date),
      closeNeeded: day === "Sun" || day === "Sat" ? "2" : "1",
      overnightNeeded: defaultOvernightNeededForNight(day, date),
    };
  });
}

export const defaultTargets: Target[] = createDefaultTargets(formatDate(getSunday(new Date())));

function availabilityFor(value: string): string[] {
  return Array(7).fill(value);
}

function withProfileDefaults(member: TeamMember): TeamMember {
  const shifts = Array.isArray(member.shifts) && member.shifts.length === 7 ? [...member.shifts] : emptyShifts();
  const p: TeamMember = {
    ...member,
    shifts,
    unavailable: Array.isArray(member.unavailable) && member.unavailable.length === 7 ? [...member.unavailable] : emptyShifts(),
    preferredDaysOff: Array.isArray(member.preferredDaysOff) && member.preferredDaysOff.length === 7 ? [...member.preferredDaysOff] : member.preferredDaysOff,
    coverageStatus: member.coverageStatus || 'Included',
    primaryDepartment: member.primaryDepartment || 'Produce',
  };
  const key = normalizeNameKey(p.name);
  const id = normalizeNameKey(p.id);

  if (id === 'james' || key.includes('jamesmullinix')) {
    return { ...p, name: 'James Mullinix', status: 'FT', role: 'Supervisor', jobTitle: 'Team Leader', isTeamLeader: true, minHours: 40, maxHours: 45, coverageStatus: 'Excluded', unavailable: emptyShifts(), preferredDaysOff: [false, false, false, false, false, false, true] };
  }
  if (id === 'beth' || key.includes('bethcannon')) {
    return { ...p, id: 'beth', name: 'Beth Cannon', status: 'FT', role: 'Produce Lead', jobTitle: 'Produce Lead', rosterStatus: 'Inactive', minHours: 40, maxHours: 40, coverageStatus: 'Excluded', unavailable: emptyShifts() };
  }
  if (id === 'shaheryar' || key.includes('shaheryarpirzada')) {
    return { ...p, id: 'shaheryar', name: 'Shaheryar Pirzada (Ali)', status: 'FT', role: 'Supervisor / Produce Lead Fill-In', jobTitle: 'GM Supervisor +1', rosterStatus: p.rosterStatus === 'Inactive' ? 'Active' : p.rosterStatus, minHours: 40, maxHours: 40, coverageStatus: 'Included', unavailable: emptyShifts() };
  }
  if (id === 'sandra' || key.includes('sandracooley')) {
    return { ...p, name: 'Sandra Cooley', status: 'FT', role: 'Produce Stock', minHours: 40, maxHours: 40, coverageStatus: 'Included', unavailable: emptyShifts(), preferredDaysOff: [true, true, false, false, false, false, false] };
  }
  if (id === 'marlon' || key.includes('marlonpowell')) {
    return { ...p, name: 'Marlon Powell', status: 'FT', role: 'Produce Overnight', minHours: 40, maxHours: 40, coverageStatus: 'Included', unavailable: availabilityFor('12:00 AM - 11:30 AM'), preferredDaysOff: [true, true, false, false, false, false, false] };
  }
  if (id === 'solomon' || key.includes('solomonessix')) {
    return { ...p, name: 'Solomon Essix', status: 'PT', role: 'Produce Overnight', minHours: p.minHours ?? 12, maxHours: p.maxHours ?? 40, coverageStatus: 'Included', unavailable: availabilityFor('11:00 PM - 9:00 AM') };
  }
  if (id === 'kenneth' || key.includes('kennethandrews')) {
    return { ...p, name: 'Kenneth Andrews', status: 'PT', role: 'Produce Stock', minHours: 0, maxHours: 16, coverageStatus: 'Included', unavailable: ['Available', 'School year unavailable; summer available', 'School year unavailable; summer available', 'School year unavailable; summer available', 'School year unavailable; summer available', 'School year unavailable; summer available', 'Available'], preferredDaysOff: [false, true, true, true, true, true, false] };
  }
  if (id === 'john' || key.includes('johnfinazzo')) {
    return { ...p, name: 'John Finazzo', status: 'PT', role: 'Produce Stock', coverageStatus: 'Excluded', unavailable: ['7:00 AM - 3:00 PM', 'Unavailable', '9:00 AM - 3:00 PM', 'Unavailable', 'Unavailable', 'Unavailable', 'Unavailable'], preferredDaysOff: [false, true, false, true, false, true, true] };
  }
  if (id === 'heidi' || key.includes('heidiher')) {
    return { ...p, name: 'Heidi Her', status: 'PT', role: 'Produce Stock', minHours: 12, maxHours: 30, coverageStatus: 'Included', unavailable: ['5:00 AM - 1:00 PM', 'Unavailable', 'Unavailable', '5:00 AM - 1:00 PM', 'Unavailable', '5:00 AM - 1:00 PM', '5:00 AM - 1:00 PM'], preferredDaysOff: [false, true, true, false, true, false, false], timeOff: [] };
  }
  if (id === 'barry' || key.includes('barryohare')) {
    return { ...p, id: 'barry', name: "Barry O'Hare", status: 'PT', role: 'Produce Stock', seniorityDate: p.seniorityDate || '2025-09-08', rosterStatus: p.rosterStatus === 'Inactive' ? 'Active' : p.rosterStatus, minHours: p.minHours ?? 0, maxHours: p.maxHours ?? 40, coverageStatus: 'Included', unavailable: ['Unavailable', 'Available', 'Unavailable', 'Available', 'Available', 'Available', 'Available'] };
  }
  if (id === 'nabil' || key.includes('nabilshah')) {
    return { ...p, name: 'Nabil Shah', status: 'PT', role: 'Produce Stock', minHours: 16, maxHours: 40, coverageStatus: 'Included', unavailable: emptyShifts() };
  }
  if (id === 'kamran' || key.includes('kamranawan')) {
    return { ...p, name: 'Kamran Awan', status: 'PT', role: 'Produce Closer', minHours: 16, maxHours: 40, coverageStatus: 'Included', unavailable: availabilityFor('12:30 PM - 11:00 PM') };
  }
  if (id === 'blake' || key.includes('blakeholman')) {
    return { ...p, name: 'Blake Holman', status: 'PT', role: 'Produce Closer', minHours: 12, maxHours: 40, coverageStatus: 'Included', unavailable: ['Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Unavailable'], preferredDaysOff: [false, false, false, false, false, false, true] };
  }
  if (id === 'diana' || key.includes('dianagarcia')) {
    return { ...p, name: 'Diana Garcia', status: 'PT', role: 'Produce Stock', minHours: 12, maxHours: 40, coverageStatus: 'Included', unavailable: ['Morning only', 'Morning only', 'Morning only', 'Morning only', 'Morning only', 'Morning only', 'Unavailable'], preferredDaysOff: [false, false, false, false, false, false, true] };
  }
  if (id === 'naomi' || key.includes('naomimathews')) {
    return { ...p, name: 'Naomi Mathews', status: 'PT', role: 'Produce Stock', minHours: 12, maxHours: 40, coverageStatus: 'Included', unavailable: ['Unavailable', 'Morning only', 'Morning only', 'Morning only', 'Unavailable', 'Morning only', 'Morning only'], preferredDaysOff: [true, false, false, false, true, false, false] };
  }
  if (id === 'michael' || key.includes('michaeldebbrecht')) {
    return { ...p, name: 'Michael Debbrecht', status: 'PT', role: 'Produce Stock', minHours: 12, maxHours: 40, coverageStatus: 'Included', unavailable: emptyShifts(), preferredDaysOff: [false, true, false, false, false, true, false], timeOff: [] };
  }
  if (id === 'victoria' || key.includes('victoriahernandez')) {
    return { ...p, name: 'Victoria Hernandez', status: 'PT', role: 'Produce Stock', minHours: 8, maxHours: 16, coverageStatus: 'Included', unavailable: ['Unavailable', 'Unavailable', 'Unavailable', 'Unavailable', 'Unavailable', '4:00 AM - 3:00 PM', 'Unavailable'], timeOff: [] };
  }
  return p;
}

function isRemovedProducePerson(p: TeamMember): boolean {
  const id = normalizeNameKey(p.id);
  const key = normalizeNameKey(p.name);
  if (id === 'daja' || id === 'deja' || key === 'dajajenkins' || key === 'deja' || key === 'dejajenkins') return true;
  if ((id === 'ali' || key === 'ali') && !normalizeNameKey(p.name).includes('shaheryar')) return true;
  return false;
}

export function reconcileProduceRoster(input: TeamMember[]): TeamMember[] {
  const output = new Map<string, TeamMember>();
  for (const raw of input || []) {
    if (!raw || isRemovedProducePerson(raw)) continue;
    const normalized = withProfileDefaults(raw);
    output.set(normalized.id, normalized);
  }
  if (![...output.values()].some(p => normalizeNameKey(p.name).includes('bethcannon'))) {
    output.set('beth', withProfileDefaults({ id: 'beth', name: 'Beth Cannon', status: 'FT', rosterStatus: 'Inactive', primaryDepartment: 'Produce', role: 'Produce Lead', seniorityDate: '', shifts: emptyShifts(), unavailable: emptyShifts() }));
  }
  if (![...output.values()].some(p => normalizeNameKey(p.name).includes('barryohare'))) {
    output.set('barry', withProfileDefaults({ id: 'barry', name: "Barry O'Hare", status: 'PT', rosterStatus: 'Active', primaryDepartment: 'Produce', role: 'Produce Stock', seniorityDate: '2025-09-08', shifts: emptyShifts(), unavailable: emptyShifts() }));
  }
  return [...output.values()].sort(compareSeniority);
}

export function isActiveForScheduling(p: TeamMember): boolean {
  return p.rosterStatus !== 'Inactive' && (p.coverageStatus || 'Included') !== 'Excluded';
}

export function isSolomon(p: TeamMember): boolean {
  return normalizeNameKey(p.id) === 'solomon' || normalizeNameKey(p.name).includes('solomonessix');
}

export function isMarlon(p: TeamMember): boolean {
  return normalizeNameKey(p.id) === 'marlon' || normalizeNameKey(p.name).includes('marlonpowell');
}

export function canWorkCoverageRole(p: TeamMember, role: 'open' | 'close' | 'overnight'): boolean {
  const id = normalizeNameKey(p.id);
  const name = normalizeNameKey(p.name);
  if (p.rosterStatus === 'Inactive') return false;
  if (role === 'overnight') return id === 'solomon' || id === 'marlon' || name.includes('solomonessix') || name.includes('marlonpowell');
  if (role === 'close') return ['kamran', 'blake', 'barry', 'nabil'].includes(id) || name.includes('kamranawan') || name.includes('blakeholman') || name.includes('barryohare') || name.includes('nabilshah');
  if (role === 'open') return !isSolomon(p) && !normalizeAvailabilityText(p.unavailable?.[0] || '').toLowerCase().includes('close only');
  return true;
}

export function isBackupCloser(p: TeamMember): boolean {
  const id = normalizeNameKey(p.id);
  const name = normalizeNameKey(p.name);
  return id === 'nabil' || name.includes('nabilshah');
}

export function isKennethSummerDate(date: string): boolean {
  return date >= '2026-06-21' && date <= '2026-07-08';
}

export function dateAllowsPerson(p: TeamMember, dayIndex: number, date?: string): boolean {
  const id = normalizeNameKey(p.id);
  const name = normalizeNameKey(p.name);
  if (id === 'kenneth' || name.includes('kennethandrews')) {
    if (date && isKennethSummerDate(date)) return true;
    return dayIndex === 0 || dayIndex === 6;
  }
  return true;
}

export function availabilityAllowsShift(p: TeamMember, dayIndex: number, shift: string): boolean {
  const availability = p.unavailable?.[dayIndex] || '';
  const result = checkAvailabilityViolation(shift, availability);
  return !result.isHardBlock && !result.isViolation;
}

export function recommendedShiftFor(p: TeamMember, role: 'open' | 'close' | 'overnight'): string | null {
  const id = normalizeNameKey(p.id);
  const name = normalizeNameKey(p.name);
  if (role === 'close') return '1:30 PM - 10:00 PM';
  if (role === 'overnight') {
    if (id === 'solomon' || name.includes('solomonessix')) return '11:00 PM - 7:00 AM';
    if (id === 'marlon' || name.includes('marlonpowell')) return '3:00 AM - 11:00 AM';
    return null;
  }
  if (id === 'heidi' || name.includes('heidiher')) return '5:00 AM - 1:00 PM';
  if (id === 'marlon' || name.includes('marlonpowell')) return '3:00 AM - 11:00 AM';
  return '6:00 AM - 2:00 PM';
}

export function coverageRoleForPersonShift(p: TeamMember, shift: string, defs: ShiftDefinitions): Role {
  const role = roleFor(p.coverageStatus, shift, defs);
  if (role === 'excluded' || role === 'none') return role;
  if ((role === 'open' || role === 'close' || role === 'overnight') && !canWorkCoverageRole(p, role)) return 'mid';
  return role;
}

export function buildCoverageCountsForDay(roster: TeamMember[], dayIndex: number, defs: ShiftDefinitions): Record<'open' | 'close' | 'overnight', number> {
  const counts: Record<'open' | 'close' | 'overnight', number> = { open: 0, close: 0, overnight: 0 };
  const countedOpen = new Set<string>();
  const countedClose = new Set<string>();
  const countedOvernight = new Set<string>();

  const add = (p: TeamMember, role: 'open' | 'close' | 'overnight') => {
    if (!isActiveForScheduling(p)) return;
    if (!canWorkCoverageRole(p, role)) return;
    const set = role === 'open' ? countedOpen : role === 'close' ? countedClose : countedOvernight;
    if (set.has(p.id)) return;
    set.add(p.id);
    counts[role] += 1;
  };

  const prevDayIndex = (dayIndex + 6) % 7;
  const previousDayIsSameWeek = dayIndex > 0;

  for (const person of roster) {
    if (!isActiveForScheduling(person)) continue;
    const sameDayShift = person.shifts?.[dayIndex] || '';
    const parsed = parseShift(sameDayShift, false);

    if (parsed) {
      const sameDayRole = coverageRoleForPersonShift(person, sameDayShift, defs);
      if (isSolomon(person) && parsed.start >= 21) {
        // Solomon's 11 PM shift belongs to the next day's coverage, not this row.
      } else if (sameDayRole === 'open' || sameDayRole === 'close' || sameDayRole === 'overnight') {
        add(person, sameDayRole);
      }
    }

    if (previousDayIsSameWeek && isSolomon(person)) {
      const prevShift = person.shifts?.[prevDayIndex] || '';
      const prevParsed = parseShift(prevShift, false);
      if (prevParsed && prevParsed.start >= 21) {
        add(person, 'overnight');
        add(person, 'open');
      }
    }
  }

  const hasAnotherOvernight = countedOvernight.size > 0;
  if (hasAnotherOvernight) {
    for (const person of roster) {
      if (!isMarlon(person) || !isActiveForScheduling(person)) continue;
      const shift = person.shifts?.[dayIndex] || '';
      const parsed = parseShift(shift, false);
      if (parsed && parsed.start <= 4.5) add(person, 'open');
    }
  }

  return counts;
}

export const defaultRoster: TeamMember[] = reconcileProduceRoster([
  { id: "kamran", name: "Kamran Awan", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Closer", seniorityDate: "2020-02-04", shifts: ["1:30 PM - 8:00 PM","","1:30 PM - 8:00 PM","1:30 PM - 8:00 PM","","1:30 PM - 8:00 PM","1:30 PM - 8:00 PM"], unavailable: emptyShifts() },
  { id: "marlon", name: "Marlon Powell", status: "FT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Overnight", seniorityDate: "2023-01-29", shifts: ["","","3:00 AM - 11:00 AM","3:00 AM - 11:00 AM","1:00 AM - 9:00 AM","1:00 AM - 9:00 AM","3:00 AM - 11:00 AM"], unavailable: emptyShifts() },
  { id: "solomon", name: "Solomon Essix", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Overnight", seniorityDate: "2025-09-08", shifts: ["11:00 PM - 7:00 AM","11:00 PM - 7:00 AM","11:00 PM - 4:00 AM","","","11:00 PM - 4:00 AM","11:00 PM - 4:00 AM"], unavailable: emptyShifts() },
  { id: "sandra", name: "Sandra Cooley", status: "FT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2017-02-12", shifts: ["","","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM"], unavailable: emptyShifts() },
  { id: "kenneth", name: "Kenneth Andrews", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2013-11-04", shifts: ["4:00 AM - 12:00 PM","","","","","","4:00 AM - 12:00 PM"], unavailable: emptyShifts() },
  { id: "john", name: "John Finazzo", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2016-01-11", shifts: ["7:15 AM - 2:00 PM","","9:00 AM - 2:00 PM","","7:15 AM - 2:00 PM","",""], unavailable: emptyShifts() },
  { id: "victoria", name: "Victoria Hernandez", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2016-11-03", shifts: ["","","","","","",""], unavailable: emptyShifts() },
  { id: "nabil", name: "Nabil Shah", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2024-02-27", shifts: ["6:00 AM - 1:00 PM","6:00 AM - 1:00 PM","","1:00 PM - 9:00 PM","","6:00 AM - 1:00 PM","6:00 AM - 1:00 PM"], unavailable: emptyShifts() },
  { id: "heidi", name: "Heidi Her", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2025-08-14", shifts: ["","","","5:00 AM - 12:00 PM","","5:00 AM - 12:00 PM","5:00 AM - 12:00 PM"], unavailable: emptyShifts() },
  { id: "barry", name: "Barry O'Hare", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2025-09-08", shifts: emptyShifts(), unavailable: emptyShifts() },
  { id: "diana", name: "Diana Garcia", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2026-03-23", shifts: ["6:00 AM - 2:00 PM","6:00 AM - 2:00 PM","6:00 AM - 2:00 PM","6:00 AM - 2:00 PM","6:00 AM - 2:00 PM","",""], unavailable: emptyShifts() },
  { id: "naomi", name: "Naomi Mathews", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2026-03-30", shifts: ["","","6:00 AM - 12:00 PM","6:00 AM - 12:00 PM","6:00 AM - 12:00 PM","6:00 AM - 12:00 PM","6:00 AM - 12:00 PM"], unavailable: emptyShifts() },
  { id: "michael", name: "Michael Debbrecht", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Stock", seniorityDate: "2026-04-23", shifts: ["6:00 AM - 12:00 PM","6:00 AM - 12:00 PM","6:00 AM - 12:00 PM","","6:00 AM - 2:00 PM","","6:00 AM - 12:00 PM"], unavailable: emptyShifts() },
  { id: "blake", name: "Blake Holman", status: "PT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Produce Closer", seniorityDate: "2026-05-04", shifts: ["2:00 PM - 8:00 PM","2:00 PM - 8:00 PM","","","2:00 PM - 8:00 PM","",""], unavailable: emptyShifts() },
  { id: "james", name: "James Mullinix", status: "FT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Supervisor", jobTitle: "Team Leader", isTeamLeader: true, seniorityDate: "2020-08-21", shifts: ["7:00 AM - 3:00 PM","7:00 AM - 3:00 PM","7:00 AM - 3:00 PM","2:00 PM - 10:00 PM","","7:00 AM - 3:00 PM", ""], unavailable: emptyShifts() },
  { id: "shaheryar", name: "Shaheryar Pirzada (Ali)", status: "FT", rosterStatus: "Active", primaryDepartment: "Produce", role: "Supervisor / Produce Lead Fill-In", jobTitle: "GM Supervisor +1", seniorityDate: "2026-01-28", shifts: ["","","5:00 AM - 1:00 PM","5:00 AM - 1:00 PM","5:00 AM - 1:00 PM","","5:00 AM - 1:00 PM"], unavailable: emptyShifts() },
  { id: "beth", name: "Beth Cannon", status: "FT", rosterStatus: "Inactive", primaryDepartment: "Produce", role: "Produce Lead", jobTitle: "Produce Lead", seniorityDate: "", shifts: emptyShifts(), unavailable: emptyShifts() },
]);