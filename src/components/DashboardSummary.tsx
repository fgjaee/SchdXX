

interface Totals {
  available: number;
  scheduled: number;
  coreScheduled: number;
  excludedScheduled: number;
  fullTime: number;
  partTime: number;
  difference: number;
  overage: number;
}

interface DashboardSummaryProps {
  totals: Totals;
}

export function DashboardSummary({ totals }: DashboardSummaryProps) {
  const isOverBudget = totals.difference < 0;
  
  const totalHours = totals.fullTime + totals.partTime || 1;
  const ftPercent = Math.round((totals.fullTime / totalHours) * 100);
  const ptPercent = Math.round((totals.partTime / totalHours) * 100);

  return (
    <div className="p-stack-default bg-surface-container-lowest border-b border-outline-variant shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-stack-default">
      <div className="bg-surface rounded-lg p-3 border border-outline-variant shadow-sm flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">
          Weekly Budget
        </span>
        <div className="flex items-end justify-between">
          <span className="font-headline-lg text-headline-lg text-on-surface">
            {totals.available}h
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant mb-1">
            Target
          </span>
        </div>
      </div>
      <div className="bg-surface rounded-lg p-3 border border-outline-variant shadow-sm flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-surface-tint"></div>
        <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">
          Scheduled
        </span>
        <div className="flex items-end justify-between">
          <span className="font-headline-lg text-headline-lg text-on-surface">
            {totals.scheduled}h
          </span>
          {isOverBudget ? (
            <span className="font-body-sm text-body-sm text-error font-medium mb-1 flex items-center">
              <span className="material-symbols-outlined text-[14px]">
                arrow_upward
              </span>{' '}
              +{totals.overage}h
            </span>
          ) : (
            <span className="font-body-sm text-body-sm text-status-opener-text font-medium mb-1 flex items-center">
              <span className="material-symbols-outlined text-[14px]">
                arrow_downward
              </span>{' '}
              -{totals.difference}h
            </span>
          )}
        </div>
      </div>
      <div className="bg-surface rounded-lg p-3 border border-outline-variant shadow-sm flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-tertiary"></div>
        <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">
          Staff Mix
        </span>
        <div className="flex items-end justify-between w-full">
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">
              {ftPercent}%{' '}
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                FT
              </span>
            </span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">
              {ptPercent}%{' '}
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                PT
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="bg-surface rounded-lg p-3 border border-outline-variant shadow-sm flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
        <span className="font-label-bold text-label-bold text-on-surface-variant uppercase">
          Core / Excluded
        </span>
        <div className="flex items-end justify-between">
          <span className="font-headline-md text-headline-md text-on-surface">
            {totals.coreScheduled} / {totals.excludedScheduled}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant mb-1">
            Hrs
          </span>
        </div>
      </div>
      <div className="bg-surface rounded-lg p-3 border border-outline-variant shadow-sm flex flex-col gap-1 relative overflow-hidden col-span-2 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-surface to-surface-container-low">
        <span className="font-label-bold text-label-bold text-on-surface-variant uppercase flex items-center justify-between">
          Confidence Score
          <span className="material-symbols-outlined text-[16px] text-tertiary">
            verified
          </span>
        </span>
        <div className="flex items-center gap-4 mt-1">
          <div className="text-4xl font-headline-xl text-headline-xl text-tertiary font-bold tracking-tighter">
            92%
          </div>
          <div className="flex-1">
            <div className="w-full bg-surface-variant rounded-full h-2 mt-1 mb-1 overflow-hidden">
              <div className="bg-tertiary h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              3 Minor Gaps • 0 Violations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
