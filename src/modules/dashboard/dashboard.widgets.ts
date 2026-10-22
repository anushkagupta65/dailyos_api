/**
 * Dashboard widget catalogue. Every widget key the Dashboard understands is listed here,
 * and widgets whose source module/tables don't exist yet are declared in PENDING_WIDGET_SOURCES.
 * To enable one, implement its provider in dashboard.service.ts and remove it from that map.
 */

export const DASHBOARD_WIDGETS = [
  'today',
  'habit_progress',
  'weekly_habit_tracker',
  'upcoming_commitments',
  'daily_progress_chart',
  'todays_tasks',
  'task_completion',
  'todays_priorities',
  'todays_intention',
  'money_spent_this_week',
  'income_overview',
  'investment_summary',
  'learning_summary',
  'recent_notes',
] as const;

export type DashboardWidget = (typeof DASHBOARD_WIDGETS)[number];

export const PENDING_WIDGET_SOURCES: Partial<Record<DashboardWidget, string>> = {};

export const DEFAULT_DASHBOARD_PERIOD = 'week';

export const getDefaultPreferences = () => ({
  visible_widgets: [...DASHBOARD_WIDGETS],
  widget_order: [...DASHBOARD_WIDGETS],
  default_period: DEFAULT_DASHBOARD_PERIOD,
});

/**
 * Keeps the user's order for known widgets and appends any widgets they haven't ordered yet,
 * so newly added widgets always have a position.
 */
export const completeWidgetOrder = (order: string[]): DashboardWidget[] => {
  const known = order.filter((key): key is DashboardWidget =>
    (DASHBOARD_WIDGETS as readonly string[]).includes(key)
  );
  const unique = Array.from(new Set(known));
  return [...unique, ...DASHBOARD_WIDGETS.filter((key) => !unique.includes(key))];
};
