import { dashboardRepository } from './dashboard.repository';
import {
  completeWidgetOrder,
  DashboardWidget,
  getDefaultPreferences,
  PENDING_WIDGET_SOURCES,
} from './dashboard.widgets';
import { commitmentsRepository } from '../commitments/commitments.repository';
import { commitmentsService } from '../commitments/commitments.service';
import { tasksRepository } from '../tasks/tasks.repository';
import { prioritiesService } from '../priorities/priorities.service';
import { MAX_PRIORITIES_PER_DAY } from '../priorities/priorities.validation';
import { intentionsService } from '../intentions/intentions.service';
import { notesService } from '../notes/notes.service';
import { learningRepository } from '../learning/learning.repository';
import { learningService } from '../learning/learning.service';
import { financeRepository } from '../finance/finance.repository';
import {
  addDays,
  endOfWeek,
  getPeriodRange,
  getTodayInTimezone,
  getWeekdayName,
  Period,
  startOfWeek,
} from '../../utils/date';

const UPCOMING_DAYS = 7;
const UPCOMING_LIMIT = 20;
const RECENT_LIMIT = 5;
const TASK_STATUSES = ['inbox', 'planned', 'active', 'completed', 'cancelled'];

/**
 * The day a task counts towards: its scheduled date, falling back to its due date.
 */
const taskDate = (task: any): string | null => task.scheduled_date ?? task.due_date;

const isOpenTask = (task: any) => task.status !== 'completed' && task.status !== 'cancelled';

interface WidgetContext {
  userId: string;
  timezone: string;
  today: string;
  date: string;
  period: Period;
  startDate: string;
  endDate: string;
  /** Lazily loads (once) the habit data shared by the habit-based widgets. */
  habitData: () => Promise<HabitData>;
}

interface HabitData {
  habits: any[];
  week: Awaited<ReturnType<typeof commitmentsService.calculateProgressForHabits>>;
  period: Awaited<ReturnType<typeof commitmentsService.calculateProgressForHabits>>;
  upcoming: Awaited<ReturnType<typeof commitmentsService.calculateProgressForHabits>>;
}

/**
 * Widget providers read from the source modules' tables; the Dashboard stores no copies.
 */
const WIDGET_PROVIDERS: Partial<Record<DashboardWidget, (ctx: WidgetContext) => Promise<any>>> = {
  today: async (ctx) => ({
    date: ctx.date,
    weekday: getWeekdayName(ctx.date),
    timezone: ctx.timezone,
    isToday: ctx.date === ctx.today,
  }),

  habit_progress: async (ctx) => {
    const { habits, week, period } = await ctx.habitData();
    const day = week.daily.find((d) => d.date === ctx.date);
    return {
      date: ctx.date,
      activeHabits: habits.length,
      day: day ?? null,
      period: {
        period: ctx.period,
        startDate: ctx.startDate,
        endDate: ctx.endDate,
        ...period.summary,
      },
      habits: week.habits.map((h) => ({
        habitId: h.habitId,
        name: h.name,
        habitType: h.habitType,
        trackingType: h.trackingType,
        targetValue: h.targetValue,
        targetUnit: h.targetUnit,
        currentStreak: h.currentStreak,
        status: h.days.find((d) => d.date === ctx.date)?.status ?? 'not_scheduled',
        actualValue: h.days.find((d) => d.date === ctx.date)?.actualValue ?? null,
      })),
    };
  },

  weekly_habit_tracker: async (ctx) => {
    const { week } = await ctx.habitData();
    return {
      weekStart: startOfWeek(ctx.date),
      weekEnd: endOfWeek(ctx.date),
      summary: week.summary,
      days: week.daily,
      habits: week.habits.map((h) => ({
        habitId: h.habitId,
        name: h.name,
        completionRate: h.completionRate,
        currentStreak: h.currentStreak,
        days: h.days.map((d) => ({ date: d.date, scheduled: d.scheduled, status: d.status })),
      })),
    };
  },

  daily_progress_chart: async (ctx) => {
    const [{ period }, tasks] = await Promise.all([
      ctx.habitData(),
      tasksRepository.getTasksInDateRange(ctx.userId, ctx.startDate, ctx.endDate),
    ]);
    const tasksOn = (date: string) =>
      tasks.filter((t) => taskDate(t) === date && t.status !== 'cancelled');
    return {
      period: ctx.period,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      sources: ['habits', 'tasks'],
      points: period.daily.map((d) => ({
        date: d.date,
        expected: d.expected,
        completed: d.completed,
        completionRate: d.completionRate,
        tasksPlanned: tasksOn(d.date).length,
        tasksCompleted: tasksOn(d.date).filter((t) => t.status === 'completed').length,
      })),
    };
  },

  upcoming_commitments: async (ctx) => {
    const to = addDays(ctx.today, UPCOMING_DAYS - 1);
    const [{ habits, upcoming }, reminders, tasks] = await Promise.all([
      ctx.habitData(),
      commitmentsRepository.getEnabledRemindersForUser(ctx.userId),
      tasksRepository.getTasksInDateRange(ctx.userId, ctx.today, to),
    ]);
    const habitsById = new Map(habits.map((h) => [h.id, h]));

    const taskItems: any[] = tasks.filter(isOpenTask).map((t) => {
      // Scheduled before today but due within the window: show it on its due date.
      const date = t.scheduled_date && t.scheduled_date >= ctx.today ? t.scheduled_date : t.due_date;
      return {
        type: 'task',
        date,
        taskId: t.id,
        name: t.title,
        preferredTime: t.start_time ?? null,
        priority: t.priority,
        status: t.status,
        dueDate: t.due_date,
      };
    });

    const habitItems: any[] = upcoming.habits
      .flatMap((h) =>
        h.days
          .filter((d) => d.status === 'pending' || d.status === 'upcoming')
          .map((d) => {
            const habit = habitsById.get(h.habitId);
            return {
              type: 'habit',
              date: d.date,
              habitId: h.habitId,
              name: h.name,
              preferredTime: habit?.preferred_time ?? null,
              reminderTimes: reminders
                .filter((r) => r.habit_id === h.habitId)
                .map((r) => r.reminder_time),
            };
          })
      );

    const items = [...habitItems, ...taskItems]
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.preferredTime ?? '99').localeCompare(b.preferredTime ?? '99')
      );

    return {
      from: ctx.today,
      to,
      sources: ['habits', 'tasks'],
      total: items.length,
      items: items.slice(0, UPCOMING_LIMIT),
    };
  },

  todays_tasks: async (ctx) => {
    const [tasks, overdue] = await Promise.all([
      tasksRepository.getTasksInDateRange(ctx.userId, ctx.date, ctx.date),
      tasksRepository.getOverdueTasks(ctx.userId, ctx.date),
    ]);
    const todayIds = new Set(tasks.map((t) => t.id));
    return {
      date: ctx.date,
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      tasks,
      overdue: overdue.filter((t) => !todayIds.has(t.id)),
    };
  },

  task_completion: async (ctx) => {
    const tasks = (await tasksRepository.getTasksInDateRange(ctx.userId, ctx.startDate, ctx.endDate)).filter(
      (t) => {
        const date = taskDate(t);
        return date !== null && date >= ctx.startDate && date <= ctx.endDate;
      }
    );
    const byStatus = Object.fromEntries(
      TASK_STATUSES.map((status) => [status, tasks.filter((t) => t.status === status).length])
    );
    const measurable = tasks.length - byStatus.cancelled;
    return {
      period: ctx.period,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      total: tasks.length,
      completed: byStatus.completed,
      open: measurable - byStatus.completed,
      byStatus,
      // Cancelled tasks are excluded from the completion rate.
      completionRate: measurable > 0 ? Math.round((byStatus.completed / measurable) * 1000) / 10 : null,
    };
  },

  todays_priorities: async (ctx) => {
    const priorities = await prioritiesService.getPrioritiesForDate(ctx.userId, ctx.date);
    return {
      date: ctx.date,
      maxPerDay: MAX_PRIORITIES_PER_DAY,
      total: priorities.length,
      completed: priorities.filter((p) => p.is_completed).length,
      priorities,
    };
  },

  todays_intention: async (ctx) => ({
    date: ctx.date,
    intention: await intentionsService.getIntentionForDate(ctx.userId, ctx.date),
  }),

  learning_summary: async (ctx) => {
    const [recent, upcoming, overdue] = await Promise.all([
      learningRepository.findEntries(ctx.userId, { sortBy: 'learnedAt', sortOrder: 'desc', limit: RECENT_LIMIT }),
      learningService.getUpcomingReviews(ctx.userId, { days: UPCOMING_DAYS, limit: RECENT_LIMIT }, ctx.timezone),
      learningService.getUpcomingReviews(ctx.userId, { endDate: addDays(ctx.today, -1), limit: 1 }, ctx.timezone),
    ]);
    return {
      recentEntries: recent.data,
      upcomingReviews: upcoming.data,
      dueForReview: upcoming.pagination.total,
      overdueReviews: overdue.pagination.total,
      reviewWindow: { endDate: upcoming.range.endDate, includesOverdue: true },
    };
  },

  recent_notes: async (ctx) => ({
    notes: await notesService.getRecentNotes(ctx.userId, RECENT_LIMIT),
  }),

  money_spent_this_week: async (ctx) => {
    const weekStart = startOfWeek(ctx.date);
    const weekEnd = endOfWeek(ctx.date);
    const [totals, categories] = await Promise.all([
      financeRepository.getFinancialTotals(ctx.userId, weekStart, weekEnd),
      financeRepository.getSpendingByCategory(ctx.userId, weekStart, weekEnd),
    ]);
    const expenseRow = totals.find((t: any) => t.transaction_type === 'expense' && t.direction === 'outflow');
    return {
      startDate: weekStart,
      endDate: weekEnd,
      totalSpent: Number(expenseRow?.total_amount) || 0,
      byCategory: categories.slice(0, 5),
    };
  },

  income_overview: async (ctx) => {
    const [totals, currentSalary] = await Promise.all([
      financeRepository.getFinancialTotals(ctx.userId, ctx.startDate, ctx.endDate),
      financeRepository.getCurrentSalary(ctx.userId),
    ]);
    const incomeRow = totals.find((t: any) => t.transaction_type === 'income' && t.direction === 'inflow');
    return {
      period: ctx.period,
      startDate: ctx.startDate,
      endDate: ctx.endDate,
      totalIncome: Number(incomeRow?.total_amount) || 0,
      activeSalary: currentSalary,
    };
  },

  investment_summary: async (ctx) => {
    const holdings = await financeRepository.listHoldings(ctx.userId, { limit: 100, page: 1, status: 'active' });
    let totalInvested = 0;
    let totalCurrentValue = 0;
    for (const h of holdings.holdings) {
      const inv = Number(h.invested_amount) || 0;
      const cv = h.current_value !== null ? Number(h.current_value) : inv;
      totalInvested += inv;
      totalCurrentValue += cv;
    }
    return {
      totalInvested: Number(totalInvested.toFixed(2)),
      totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
      unrealizedGain: Number((totalCurrentValue - totalInvested).toFixed(2)),
      activeHoldingsCount: holdings.holdings.length,
    };
  },
};

export class DashboardService {
  // ---------------- PREFERENCES ----------------
  async getPreferences(userId: string) {
    const saved = await dashboardRepository.getPreferences(userId);
    if (!saved) {
      return {
        id: null,
        user_id: userId,
        ...getDefaultPreferences(),
        updated_at: null,
        is_default: true,
      };
    }
    return {
      ...saved,
      widget_order: completeWidgetOrder(saved.widget_order || []),
      is_default: false,
    };
  }

  async updatePreferences(userId: string, data: any) {
    const payload = {
      ...data,
      widgetOrder: data.widgetOrder ? completeWidgetOrder(data.widgetOrder) : undefined,
    };
    const saved = await dashboardRepository.upsertPreferences(userId, payload, getDefaultPreferences());
    return {
      ...saved,
      widget_order: completeWidgetOrder(saved.widget_order || []),
      is_default: false,
    };
  }

  // ---------------- OVERVIEW ----------------
  async getOverview(
    userId: string,
    filters: { date?: string; period?: Period },
    timezone: string
  ) {
    const today = getTodayInTimezone(timezone);
    const date = filters.date || today;
    const preferences = await this.getPreferences(userId);
    const period = (filters.period || preferences.default_period) as Period;
    const { startDate, endDate } = getPeriodRange(period, date);

    let habitDataPromise: Promise<HabitData> | null = null;
    const loadHabitData = async (): Promise<HabitData> => {
      const allHabits = await commitmentsRepository.getHabitsForUser(userId);
      const habits = allHabits.filter((h) => h.status === 'active');
      const [week, periodProgress, upcoming] = await Promise.all([
        commitmentsService.calculateProgressForHabits(userId, habits, startOfWeek(date), endOfWeek(date), today),
        commitmentsService.calculateProgressForHabits(userId, habits, startDate, endDate, today),
        commitmentsService.calculateProgressForHabits(
          userId,
          habits,
          today,
          addDays(today, UPCOMING_DAYS - 1),
          today
        ),
      ]);
      return { habits, week, period: periodProgress, upcoming };
    };

    const ctx: WidgetContext = {
      userId,
      timezone,
      today,
      date,
      period,
      startDate,
      endDate,
      habitData: () => (habitDataPromise ??= loadHabitData()),
    };

    const visible = new Set(preferences.visible_widgets);
    const widgetKeys = preferences.widget_order.filter((key: DashboardWidget) => visible.has(key));

    const widgets = await Promise.all(
      widgetKeys.map(async (key: DashboardWidget) => {
        const provider = WIDGET_PROVIDERS[key];
        if (!provider) {
          return {
            key,
            available: false,
            reason: `Requires the ${PENDING_WIDGET_SOURCES[key] ?? 'source module'}, which is not implemented yet.`,
            data: null,
          };
        }
        return { key, available: true, data: await provider(ctx) };
      })
    );

    return {
      date,
      today,
      timezone,
      period,
      startDate,
      endDate,
      preferences: {
        visible_widgets: preferences.visible_widgets,
        widget_order: preferences.widget_order,
        default_period: preferences.default_period,
      },
      widgets,
    };
  }
}

export const dashboardService = new DashboardService();
