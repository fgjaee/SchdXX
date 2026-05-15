import type { Day, Role, Target, TeamMember, ParsedShift, ShiftDefinitions } from '../types';

export const days: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const storageKey = "editable-roster-staffing-view-v3";
export const dailyTruckStartDate = "2026-05-17";

export const defaultShiftDefinitions: ShiftDefinitions = {
  open: { start: 3, end: 6.99 },
  mid: { start: 7, end: 11.99 },
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
  const normalized = text.trim().replace(/\./g, "").toUpperCase();
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
  const parts = shift.split(/\s*-\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (start === null || end === null) return null;
  if (end <= start) end += 24;
  let hours = end - start;
  if (autoDeductLunch && hours >= 6) hours -= 0.5;
  return { start, end, hours: Number(hours.toFixed(2)) };
}

export function checkAvailabilityViolation(shiftText: string, availabilityText: string): { isViolation: boolean; message: string | null; isHardBlock: boolean } {
  if (!availabilityText.trim()) return { isViolation: false, message: null, isHardBlock: false };
  const availStr = availabilityText.trim().toLowerCase();
  if (availStr === "unavailable" || availStr === "n/a" || availStr === "off") {
    return { isViolation: shiftText.trim().length > 0, message: availabilityText, isHardBlock: true };
  }
  const availBlocks = availabilityText.split(/,|\bor\b|\band\b/i).map((s) => s.trim()).filter(Boolean);
  const parsedBlocks = availBlocks.map((b) => parseShift(b, false)).filter(Boolean) as ParsedShift[];
  if (parsedBlocks.length === 0) {
    return { isViolation: shiftText.trim().length > 0, message: availabilityText, isHardBlock: true };
  }
  if (!shiftText.trim()) return { isViolation: false, message: `Avail: ${availabilityText}`, isHardBlock: false };
  const shiftParsed = parseShift(shiftText, false);
  if (!shiftParsed) return { isViolation: true, message: "Invalid Shift Format", isHardBlock: false };
  let matchesAny = false;
  for (const a of parsedBlocks) {
    const sStart = shiftParsed.start;
    const sEnd = shiftParsed.start + shiftParsed.hours;
    const aStart = a.start;
    const aEnd = a.start + a.hours;
    if ((sStart >= aStart && sEnd <= aEnd) || (sStart + 24 >= aStart && sEnd + 24 <= aEnd)) {
      matchesAny = true;
      break;
    }
  }
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
  const s = parsed.start;
  if (defs.overnight.start > defs.overnight.end) {
    if (s >= defs.overnight.start || s <= defs.overnight.end) return "overnight";
  } else {
    if (s >= defs.overnight.start && s <= defs.overnight.end) return "overnight";
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

export function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatHours(value: number): string {
  return Number(value.toFixed(2)).toString();
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

export const defaultRoster: TeamMember[] = [
  { id: "kenneth", name: "Kenneth", status: "PT", rosterStatus: "Active", shifts: ["4:00 AM - 12:00 PM","","","","","",""], unavailable: emptyShifts(), primaryDepartment: "Produce" },
  { id: "kamran", name: "Kamran", status: "FT", rosterStatus: "Active", shifts: ["1:30 PM - 10:00 PM","","1:30 PM - 10:00 PM","1:30 PM - 10:00 PM","","1:30 PM - 10:00 PM","1:30 PM - 10:00 PM"], unavailable: ["","Unavailable","","","","",""], primaryDepartment: "Produce" },
  { id: "sandra", name: "Sandra", status: "FT", rosterStatus: "Active", shifts: ["","","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM","4:00 AM - 12:00 PM"], unavailable: ["","Unavailable","","Unavailable","Unavailable","Unavailable",""], primaryDepartment: "Produce" },
  { id: "solomon", name: "Solomon", status: "PT", rosterStatus: "Active", shifts: ["11:00 PM - 7:00 AM","11:00 PM - 7:00 AM","11:00 PM - 7:00 AM","","","11:00 PM - 7:00 AM","11:00 PM - 7:00 AM"], unavailable: emptyShifts(), primaryDepartment: "Produce" },
];
