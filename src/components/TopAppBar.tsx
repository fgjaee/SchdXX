import { AppButton } from './ui';
import type { AppView } from '../App';
import { getWeekLabels } from '../lib/helpers';

interface TopAppBarProps {
  onSignOut: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  currentWeekId: string;
  onWeekChange: (weekId: string) => void;
  currentDepartment: string;
  onDepartmentChange: (dept: string) => void;
  weeklyHoursAvailable: string;
  onWeeklyHoursChange: (v: string) => void;
}

const topNavLinks: { label: string; view: AppView }[] = [
  { label: 'Schedule', view: 'schedule' },
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Labor', view: 'labor' },
  { label: 'Employees', view: 'employees' },
  { label: 'Compliance', view: 'compliance' },
];

const departments = ["Produce", "Bakery", "Grocery", "Meat", "Deli", "Front End"];

export function TopAppBar({ 
  onSignOut, 
  currentView, 
  onNavigate,
  currentWeekId,
  onWeekChange,
  currentDepartment,
  onDepartmentChange,
  weeklyHoursAvailable,
  onWeeklyHoursChange
}: TopAppBarProps) {
  const weekLabels = getWeekLabels();

  return (
    <nav className="bg-surface-container-lowest border-b border-outline-variant/40 flex items-center justify-between px-4 lg:px-margin-desktop h-16 w-full shrink-0 z-50 sticky top-0 shadow-sm">
      {/* Left: brand + nav links */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onNavigate('schedule')}
          className="font-headline-md text-headline-md font-bold text-primary tracking-tight hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          Smart Roster
        </button>

        <div className="hidden xl:flex items-center gap-0.5 h-full">
          {topNavLinks.map(({ label, view }) => {
            const isActive = currentView === view;
            return (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className={`h-8 flex items-center px-3 font-body-md text-body-md transition-colors rounded-md ${
                  isActive
                    ? 'text-primary font-semibold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle: Week Tabs & Dept/Budget Selector */}
      <div className="flex items-center gap-4">
        {/* Weekly Tabs */}
        <div className="flex items-center p-1.5 bg-surface-container-high/60 backdrop-blur-xl rounded-[20px] border border-outline-variant/30 shadow-inner gap-1">
          {weekLabels.map(w => {
            const isActive = currentWeekId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onWeekChange(w.id)}
                className={`relative px-5 py-2.5 rounded-[14px] transition-all duration-500 flex flex-col items-center group min-w-[100px] overflow-hidden ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-xl scale-[1.03] z-10'
                    : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-[0.25em] mb-0.5 transition-colors duration-500 ${isActive ? 'text-on-primary/80' : 'text-on-surface-variant/50 group-hover:text-primary/60'}`}>
                  {w.label.split(' ')[0]}
                </span>
                <span className={`text-[13px] font-black tracking-tight transition-colors duration-500 whitespace-nowrap ${isActive ? 'text-on-primary' : 'text-on-surface group-hover:text-primary'}`}>
                  {w.label.split(' ').slice(1).join(' ') || w.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-on-primary/20 animate-in slide-in-from-bottom-1" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Department Selector */}
        <div className="flex items-center gap-2 bg-surface-container-high/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all group">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              hub
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-wider leading-none mb-0.5">Dept</span>
            <div className="flex items-center gap-1">
              <select 
                value={currentDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="bg-transparent border-none text-[12px] font-black text-on-surface outline-none cursor-pointer focus:ring-0 appearance-none pr-5 leading-none"
              >
                {departments.map(d => (
                  <option key={d} value={d} className="bg-surface text-on-surface font-sans">{d}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[14px] text-primary -ml-5 pointer-events-none transition-transform">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Labor Budget Selector */}
        <div className="flex items-center gap-2 bg-surface-container-high/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-outline-variant/20 shadow-sm hover:border-primary/30 transition-all group">
          <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              payments
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-wider leading-none mb-0.5">Budget</span>
            <div className="flex items-center gap-1">
              <input 
                type="number"
                value={weeklyHoursAvailable}
                onChange={(e) => onWeeklyHoursChange(e.target.value)}
                className="bg-transparent border-none text-[12px] font-black text-on-surface outline-none focus:ring-0 w-16 p-0"
              />
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: sign out + avatar */}
      <div className="flex items-center gap-1.5">
        <AppButton
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          className="border-transparent text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </AppButton>

        <div className="ml-1 w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-body-sm overflow-hidden border border-outline-variant/30 shrink-0">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            person
          </span>
        </div>
      </div>
    </nav>
  );
}
