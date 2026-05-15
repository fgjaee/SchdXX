import { AppButton } from './ui';
import type { AppView } from '../App';

interface SideNavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const sideNavItems: { icon: string; label: string; view: AppView }[] = [
  { icon: 'analytics', label: 'Overview', view: 'schedule' },
  { icon: 'warning', label: 'Violations', view: 'violations' },
  { icon: 'payments', label: 'Labor Budget', view: 'labor-budget' },
  { icon: 'history', label: 'Audit Log', view: 'audit-log' },
  { icon: 'groups', label: 'Team Info', view: 'team-info' },
];

export function SideNavBar({ currentView, onNavigate }: SideNavBarProps) {
  return (
    <aside className="bg-surface-container-low h-full w-64 fixed z-40 border-r border-outline-variant/40 flex flex-col py-stack-default px-stack-dense shrink-0 transition-transform duration-300 hidden lg:flex">
      {/* Brand mark */}
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface text-primary flex items-center justify-center border border-outline-variant/30 shadow-sm">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            rule
          </span>
        </div>
        <div>
          <h2 className="font-label-bold text-label-bold text-on-surface uppercase tracking-wider">
            Schedule Inspector
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Shift Audit Tool
          </p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
        {sideNavItems.map(({ icon, label, view }) => {
          const isActive = currentView === view || (view === 'schedule' && currentView === 'schedule');
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all active:scale-95 duration-75 w-full text-left ${
                isActive
                  ? 'bg-primary-container/20 text-primary font-semibold border border-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="font-body-sm text-body-sm">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-outline-variant/40 flex flex-col gap-2">
        <AppButton
          className="w-full justify-center"
          variant="solid"
          onClick={() => onNavigate('violations')}
        >
          <span className="material-symbols-outlined text-[16px]">
            check_circle
          </span>
          Run Validation
        </AppButton>

        <div className="flex flex-col gap-0.5 mt-1">
          {[
            { icon: 'help', label: 'Support' },
            { icon: 'description', label: 'Documentation' },
          ].map(({ icon, label }) => (
            <a
              key={label}
              className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95 duration-75 rounded-md"
              href="#"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="font-body-sm text-body-sm">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
