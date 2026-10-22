import {
  addDays,
  diffInDays,
  eachDate,
  getWeekdayName,
  maxDate,
  minDate,
  startOfWeek,
} from '../../utils/date';

/**
 * Pure habit scheduling and progress calculations.
 * All dates are 'YYYY-MM-DD' strings already resolved in the user's timezone.
 */

export type DayStatus =
  | 'completed'
  | 'partial'
  | 'skipped'
  | 'missed'
  | 'pending'
  | 'upcoming'
  | 'not_scheduled';

export interface ProgressCounters {
  expected: number;
  completed: number;
  partial: number;
  skipped: number;
  missed: number;
  pending: number;
  upcoming: number;
  unscheduledCompletions: number;
  completionRate: number | null;
}

/** How many days back to look when computing the current streak. */
export const STREAK_LOOKBACK_DAYS = 365;

/**
 * Returns the schedule effective on the given date, if any.
 */
export const findScheduleForDate = (schedules: any[], date: string) =>
  schedules.find(
    (s) => s.effective_from <= date && (!s.effective_until || s.effective_until >= date)
  ) || null;

/**
 * Whether the habit is expected to be done on `date`.
 * Habits with schedules follow the schedule effective on that date (dates outside every
 * schedule are not expected). Habits without schedules fall back to their frequency_type:
 * daily/custom = every day, weekly = once a week on the start date's weekday.
 */
export const isScheduledOn = (habit: any, schedules: any[], date: string): boolean => {
  if (date < habit.start_date) return false;
  if (habit.end_date && date > habit.end_date) return false;

  if (schedules.length === 0) {
    if (habit.frequency_type === 'weekly') {
      return getWeekdayName(date) === getWeekdayName(habit.start_date);
    }
    return true;
  }

  const schedule = findScheduleForDate(schedules, date);
  if (!schedule) return false;

  switch (schedule.schedule_type) {
    case 'daily':
      return true;
    case 'selected_days':
      return schedule.weekdays.includes(getWeekdayName(date));
    case 'interval':
      return diffInDays(schedule.effective_from, date) % (schedule.interval_days || 1) === 0;
    default:
      return false;
  }
};

export const getDayStatus = (
  scheduled: boolean,
  log: any | undefined,
  date: string,
  today: string
): DayStatus => {
  if (!scheduled) return 'not_scheduled';
  if (log) return log.status;
  if (date < today) return 'missed';
  if (date === today) return 'pending';
  return 'upcoming';
};

const emptyCounters = (): ProgressCounters => ({
  expected: 0,
  completed: 0,
  partial: 0,
  skipped: 0,
  missed: 0,
  pending: 0,
  upcoming: 0,
  unscheduledCompletions: 0,
  completionRate: null,
});

const addToCounters = (
  counters: ProgressCounters,
  status: DayStatus,
  hasUnscheduledCompletion: boolean
) => {
  if (status === 'not_scheduled') {
    if (hasUnscheduledCompletion) counters.unscheduledCompletions += 1;
    return;
  }
  if (status === 'upcoming') {
    counters.upcoming += 1;
    return;
  }
  counters.expected += 1;
  counters[status] += 1;
};

/**
 * Completion rate (%) excludes intentionally skipped days from the denominator.
 */
const finalizeCounters = (counters: ProgressCounters): ProgressCounters => {
  const denominator = counters.expected - counters.skipped;
  counters.completionRate =
    denominator > 0 ? Math.round((counters.completed / denominator) * 1000) / 10 : null;
  return counters;
};

const mergeCounters = (target: ProgressCounters, source: ProgressCounters) => {
  target.expected += source.expected;
  target.completed += source.completed;
  target.partial += source.partial;
  target.skipped += source.skipped;
  target.missed += source.missed;
  target.pending += source.pending;
  target.upcoming += source.upcoming;
  target.unscheduledCompletions += source.unscheduledCompletions;
};

const groupBy = <T>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
};

/**
 * Consecutive scheduled days completed, counting back from today.
 * Today's pending check-in and skipped days do not break the streak.
 */
export const calculateCurrentStreak = (
  habit: any,
  schedules: any[],
  logsByDate: Map<string, any>,
  today: string
): number => {
  let streak = 0;
  const earliest = maxDate(habit.start_date, addDays(today, -STREAK_LOOKBACK_DAYS));
  for (let date = today; date >= earliest; date = addDays(date, -1)) {
    if (!isScheduledOn(habit, schedules, date)) continue;
    const status = getDayStatus(true, logsByDate.get(date), date, today);
    if (status === 'completed') {
      streak += 1;
    } else if (status === 'pending' || status === 'skipped') {
      continue;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Computes per-day, per-week and per-habit progress for the given habits and range.
 * `logs` should cover the range plus the streak lookback window.
 */
export const calculateProgress = (params: {
  habits: any[];
  schedules: any[];
  logs: any[];
  startDate: string;
  endDate: string;
  today: string;
}) => {
  const { habits, startDate, endDate, today } = params;
  const schedulesByHabit = groupBy(params.schedules, (s) => s.habit_id);
  const logsByHabit = new Map<string, Map<string, any>>();
  for (const log of params.logs) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Map());
    logsByHabit.get(log.habit_id)!.set(log.log_date, log);
  }

  const dates = eachDate(startDate, endDate);
  const dailyCounters = new Map<string, ProgressCounters>(dates.map((d) => [d, emptyCounters()]));
  const summary = emptyCounters();

  const habitResults = habits.map((habit) => {
    const schedules = schedulesByHabit.get(habit.id) || [];
    const logsByDate = logsByHabit.get(habit.id) || new Map<string, any>();
    const counters = emptyCounters();

    const days = dates.map((date) => {
      const scheduled = isScheduledOn(habit, schedules, date);
      const log = logsByDate.get(date);
      const status = getDayStatus(scheduled, log, date, today);
      const unscheduledCompletion = !scheduled && log?.status === 'completed';
      addToCounters(counters, status, unscheduledCompletion);
      addToCounters(dailyCounters.get(date)!, status, unscheduledCompletion);
      return {
        date,
        scheduled,
        status,
        logId: log?.id ?? null,
        actualValue: log?.actual_value ?? null,
      };
    });

    mergeCounters(summary, counters);

    return {
      habitId: habit.id,
      name: habit.name,
      habitType: habit.habit_type,
      trackingType: habit.tracking_type,
      targetValue: habit.target_value,
      targetUnit: habit.target_unit,
      currentStreak: calculateCurrentStreak(habit, schedules, logsByDate, today),
      ...finalizeCounters(counters),
      days,
    };
  });

  const daily = dates.map((date) => ({ date, ...finalizeCounters(dailyCounters.get(date)!) }));

  const weekly = Array.from(groupBy(daily, (d) => startOfWeek(d.date)).entries()).map(
    ([weekStart, days]) => {
      const counters = emptyCounters();
      days.forEach((d) => mergeCounters(counters, d));
      return {
        weekStart,
        weekEnd: addDays(weekStart, 6),
        rangeStart: maxDate(weekStart, startDate),
        rangeEnd: minDate(addDays(weekStart, 6), endDate),
        ...finalizeCounters(counters),
      };
    }
  );

  return {
    summary: finalizeCounters(summary),
    daily,
    weekly,
    habits: habitResults,
  };
};
