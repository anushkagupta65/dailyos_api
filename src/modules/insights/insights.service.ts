import { insightsRepository, UserInsightPreferencesRecord } from './insights.repository';
import { settingsRepository } from '../settings/settings.repository';
import { financeRepository } from '../finance/finance.repository';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  getPeriodRange,
  getTodayInTimezone,
  resolveTimezone,
  startOfMonth,
  startOfWeek,
  toDateString,
} from '../../utils/date';
import { calculateCurrentStreak } from '../commitments/commitments.progress';

export const DEFAULT_INSIGHT_PREFERENCES: {
  default_period: 'week' | 'month' | '90_days' | 'year';
  default_filter: string;
  show_habits: boolean;
  show_money: boolean;
} = {
  default_period: 'week',
  default_filter: 'all',
  show_habits: true,
  show_money: true,
};

export class InsightsService {
  // ---------------- DATE RESOLUTION ----------------
  async resolveDateRange(
    userId: string,
    query: {
      period?: 'week' | 'month' | '90_days' | 'year';
      startDate?: string;
      endDate?: string;
      anchorDate?: string;
      timezone?: string;
    }
  ): Promise<{
    periodType: 'week' | 'month' | '90_days' | 'year';
    startDate: string;
    endDate: string;
    timezone: string;
  }> {
    const [insightPrefs, userPrefs] = await Promise.all([
      insightsRepository.getPreferences(userId),
      settingsRepository.getPreferences(userId),
    ]);

    const tz = resolveTimezone(query.timezone, userPrefs?.timezone);
    const periodType = query.period || insightPrefs?.default_period || 'week';
    const anchor = query.anchorDate || getTodayInTimezone(tz);

    if (query.startDate && query.endDate) {
      return {
        periodType,
        startDate: query.startDate,
        endDate: query.endDate,
        timezone: tz,
      };
    }

    let startDate: string;
    let endDate: string;

    switch (periodType) {
      case 'week': {
        startDate = startOfWeek(anchor);
        endDate = endOfWeek(anchor);
        break;
      }
      case 'month': {
        startDate = startOfMonth(anchor);
        endDate = endOfMonth(anchor);
        break;
      }
      case '90_days': {
        startDate = addDays(anchor, -89);
        endDate = anchor;
        break;
      }
      case 'year': {
        startDate = `${anchor.slice(0, 4)}-01-01`;
        endDate = `${anchor.slice(0, 4)}-12-31`;
        break;
      }
      default: {
        startDate = startOfWeek(anchor);
        endDate = endOfWeek(anchor);
      }
    }

    return {
      periodType,
      startDate,
      endDate,
      timezone: tz,
    };
  }

  // ---------------- PREFERENCES ----------------
  async getPreferences(userId: string) {
    const preferences = await insightsRepository.getPreferences(userId);
    if (!preferences) {
      return await insightsRepository.upsertPreferences(userId, {}, DEFAULT_INSIGHT_PREFERENCES);
    }
    return preferences;
  }

  async updatePreferences(userId: string, data: any) {
    return await insightsRepository.upsertPreferences(userId, data, DEFAULT_INSIGHT_PREFERENCES);
  }

  // ---------------- HABIT INSIGHTS ----------------
  async getHabitInsights(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);
    const [summaryRows, perHabitBreakdown, habitsWithSched, allLogs] = await Promise.all([
      insightsRepository.getHabitLogsSummary(userId, range.startDate, range.endDate),
      insightsRepository.getHabitBreakdown(userId, range.startDate, range.endDate),
      insightsRepository.getHabitsWithSchedules(userId),
      insightsRepository.getHabitLogsForRange(userId, addDays(range.startDate, -365), range.endDate),
    ]);

    let totalCompleted = 0;
    let totalPartial = 0;
    let totalMissed = 0;
    let totalSkipped = 0;

    for (const r of summaryRows) {
      const c = Number(r.count) || 0;
      if (r.status === 'completed') totalCompleted = c;
      else if (r.status === 'partial') totalPartial = c;
      else if (r.status === 'missed') totalMissed = c;
      else if (r.status === 'skipped') totalSkipped = c;
    }

    const totalLogs = totalCompleted + totalPartial + totalMissed + totalSkipped;
    const completionRate =
      totalLogs > 0 ? Number(((totalCompleted / totalLogs) * 100).toFixed(1)) : 0;

    // Calculate streaks for each habit using commitments progress calculator
    const logsByHabitAndDate = new Map<string, Map<string, any>>();
    for (const l of allLogs) {
      let habitMap = logsByHabitAndDate.get(l.habit_id);
      if (!habitMap) {
        habitMap = new Map();
        logsByHabitAndDate.set(l.habit_id, habitMap);
      }
      habitMap.set(toDateString(l.log_date) || l.log_date, l);
    }

    const today = getTodayInTimezone(range.timezone);
    const habitStreaks = habitsWithSched.map((h) => {
      const habitLogsMap = logsByHabitAndDate.get(h.id) || new Map();
      const currentStreak = calculateCurrentStreak(h, h.schedules, habitLogsMap, today);
      return {
        id: h.id,
        name: h.name,
        currentStreak,
      };
    });

    const mostConsistentHabits = [...perHabitBreakdown]
      .filter((h) => h.total_logs > 0)
      .sort((a, b) => b.completed_count - a.completed_count)
      .slice(0, 5);

    const habitsNeedingAttention = [...perHabitBreakdown]
      .filter((h) => h.missed_count > 0 || h.partial_count > 0)
      .sort((a, b) => b.missed_count + b.partial_count - (a.missed_count + a.partial_count))
      .slice(0, 5);

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      summary: {
        active_habits: habitsWithSched.length,
        total_logs: totalLogs,
        completed_logs: totalCompleted,
        partial_logs: totalPartial,
        missed_logs: totalMissed,
        skipped_logs: totalSkipped,
        completion_rate_percentage: completionRate,
      },
      streaks: habitStreaks,
      most_consistent_habits: mostConsistentHabits,
      habits_needing_attention: habitsNeedingAttention,
      per_habit_breakdown: perHabitBreakdown,
    };
  }

  // ---------------- TASK & PRODUCTIVITY INSIGHTS ----------------
  async getTaskInsights(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);
    const [metrics, recentCompleted] = await Promise.all([
      insightsRepository.getTaskMetrics(userId, range.startDate, range.endDate),
      insightsRepository.getRecentCompletedTasks(userId, range.startDate, range.endDate),
    ]);

    const totalTasks = Number(metrics?.total_tasks || 0);
    const completedTasks = Number(metrics?.completed_tasks || 0);
    const completionRate =
      totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    const estimatedMins = Number(metrics?.total_estimated_minutes || 0);
    const actualMins = Number(metrics?.total_actual_minutes || 0);
    const timeVariance = actualMins - estimatedMins;
    const timeVariancePercentage =
      estimatedMins > 0 ? Number(((timeVariance / estimatedMins) * 100).toFixed(1)) : 0;

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      summary: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate_percentage: completionRate,
        overdue_tasks: Number(metrics?.overdue_tasks || 0),
      },
      status_breakdown: {
        inbox: Number(metrics?.inbox_tasks || 0),
        planned: Number(metrics?.planned_tasks || 0),
        active: Number(metrics?.active_tasks || 0),
        completed: completedTasks,
        cancelled: Number(metrics?.cancelled_tasks || 0),
      },
      priority_breakdown: {
        urgent: Number(metrics?.urgent_tasks || 0),
        high: Number(metrics?.high_tasks || 0),
        medium: Number(metrics?.medium_tasks || 0),
        low: Number(metrics?.low_tasks || 0),
      },
      planned_vs_actual: {
        total_estimated_minutes: estimatedMins,
        total_actual_minutes: actualMins,
        time_variance_minutes: timeVariance,
        time_variance_percentage: timeVariancePercentage,
      },
      recent_completed_tasks: recentCompleted,
    };
  }

  // ---------------- REVIEW & PERFORMANCE INSIGHTS ----------------
  async getReviewInsights(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);
    const [reviewRatings, dailyRating, blockersAndWins, actionsSummary] = await Promise.all([
      insightsRepository.getReviewRatings(userId, range.startDate, range.endDate),
      insightsRepository.getAverageDailyRating(userId, range.startDate, range.endDate),
      insightsRepository.getRecurringBlockersAndWins(userId, range.startDate, range.endDate),
      insightsRepository.getReviewActionsSummary(userId, range.startDate, range.endDate),
    ]);

    const totalActions = Number(actionsSummary?.total_actions || 0);
    const completedActions = Number(actionsSummary?.completed_actions || 0);
    const actionCompletionRate =
      totalActions > 0 ? Number(((completedActions / totalActions) * 100).toFixed(1)) : 0;

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      ratings: {
        average_daily_rating: dailyRating.avgRating,
        daily_reviews_count: dailyRating.count,
        by_review_type: reviewRatings,
      },
      recurring_blockers_and_reflections: blockersAndWins,
      actions: {
        total_actions: totalActions,
        completed_actions: completedActions,
        pending_actions: Number(actionsSummary?.pending_actions || 0),
        completion_rate_percentage: actionCompletionRate,
      },
    };
  }

  // ---------------- FINANCIAL INSIGHTS ----------------
  async getFinancialInsights(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);
    const [totalsRows, categorySpending, accountsResult, holdingsResult, liabilities, netWorth, goalsResult] =
      await Promise.all([
        financeRepository.getFinancialTotals(userId, range.startDate, range.endDate),
        financeRepository.getSpendingByCategory(userId, range.startDate, range.endDate),
        financeRepository.listAccounts(userId, { limit: 100, page: 1, isActive: true }),
        financeRepository.listHoldings(userId, { limit: 100, page: 1, status: 'active' }),
        financeRepository.listLiabilities(userId, 'active'),
        financeRepository.getNetWorthAssetsAndLiabilities(userId),
        financeRepository.listGoals(userId, 'active'),
      ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalInvestment = 0;
    let totalSavings = 0;

    for (const r of totalsRows) {
      const amt = Number(r.total_amount) || 0;
      if (r.transaction_type === 'income' && r.direction === 'inflow') {
        totalIncome += amt;
      } else if (r.transaction_type === 'expense' && r.direction === 'outflow') {
        totalExpense += amt;
      } else if (r.transaction_type === 'investment' && r.direction === 'outflow') {
        totalInvestment += amt;
      } else if (r.transaction_type === 'savings' && r.direction === 'outflow') {
        totalSavings += amt;
      }
    }

    const netCashFlow = Number((totalIncome - totalExpense).toFixed(2));
    const savingsRate =
      totalIncome > 0
        ? Number(
            (
              ((totalSavings + totalInvestment + (netCashFlow > 0 ? netCashFlow : 0)) /
                totalIncome) *
              100
            ).toFixed(1)
          )
        : 0;

    // Investment summary
    let totalInvested = 0;
    let totalCurrentValue = 0;
    for (const h of holdingsResult.holdings) {
      const inv = Number(h.invested_amount) || 0;
      const cv = h.current_value !== null ? Number(h.current_value) : inv;
      totalInvested += inv;
      totalCurrentValue += cv;
    }
    const unrealizedGain = Number((totalCurrentValue - totalInvested).toFixed(2));
    const investmentReturnRate =
      totalInvested > 0 ? Number(((unrealizedGain / totalInvested) * 100).toFixed(1)) : 0;

    // Category percentage
    const categoryBreakdown = categorySpending.map((c) => ({
      ...c,
      percentage: totalExpense > 0 ? Number(((c.total_amount / totalExpense) * 100).toFixed(1)) : 0,
    }));

    // Savings goals progress
    const goalsProgress = goalsResult.map((g) => {
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      return {
        id: g.id,
        title: g.title,
        target_amount: target,
        current_amount: current,
        currency: g.currency,
        percentage_achieved: target > 0 ? Number(((current / target) * 100).toFixed(1)) : 0,
      };
    });

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      income_vs_expense: {
        total_income: Number(totalIncome.toFixed(2)),
        total_expense: Number(totalExpense.toFixed(2)),
        net_cash_flow: netCashFlow,
        total_investments_contributed: Number(totalInvestment.toFixed(2)),
        total_savings_transferred: Number(totalSavings.toFixed(2)),
        savings_rate_percentage: savingsRate,
      },
      spending_by_category: categoryBreakdown,
      savings_progress: {
        total_accounts_balance: accountsResult.accounts.reduce(
          (sum: number, a: any) => sum + (Number(a.current_balance) || 0),
          0
        ),
        goals: goalsProgress,
      },
      investment_growth: {
        total_invested: Number(totalInvested.toFixed(2)),
        total_current_value: Number(totalCurrentValue.toFixed(2)),
        unrealized_gain: unrealizedGain,
        return_percentage: investmentReturnRate,
        holdings_count: holdingsResult.holdings.length,
      },
      net_worth: netWorth,
    };
  }

  // ---------------- LEARNING INSIGHTS ----------------
  async getLearningInsights(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);
    const [metrics, notesCreated, recentLearning] = await Promise.all([
      insightsRepository.getLearningMetrics(userId, range.startDate, range.endDate),
      insightsRepository.getNotesCount(userId, range.startDate, range.endDate),
      insightsRepository.getRecentLearning(userId, range.startDate, range.endDate),
    ]);

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      summary: {
        total_learning_entries: Number(metrics?.total_entries || 0),
        unique_categories: Number(metrics?.unique_categories || 0),
        unique_sources: Number(metrics?.unique_sources || 0),
        notes_created: notesCreated,
      },
      recent_learning: recentLearning,
    };
  }

  // ---------------- DASHBOARD-STYLE INSIGHTS ----------------
  async getDashboardInsights(userId: string, query: any) {
    const [preferences, range] = await Promise.all([
      this.getPreferences(userId),
      this.resolveDateRange(userId, query),
    ]);

    const tasksPromise = this.getTaskInsights(userId, range);
    const reviewsPromise = this.getReviewInsights(userId, range);
    const learningPromise = this.getLearningInsights(userId, range);
    const habitsPromise = preferences.show_habits ? this.getHabitInsights(userId, range) : null;
    const financePromise = preferences.show_money ? this.getFinancialInsights(userId, range) : null;

    const [tasks, reviews, learning, habits, finance] = await Promise.all([
      tasksPromise,
      reviewsPromise,
      learningPromise,
      habitsPromise,
      financePromise,
    ]);

    return {
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      preferences: {
        show_habits: preferences.show_habits,
        show_money: preferences.show_money,
      },
      overview: {
        tasks: {
          total: tasks.summary.total_tasks,
          completed: tasks.summary.completed_tasks,
          completion_rate: tasks.summary.completion_rate_percentage,
          overdue: tasks.summary.overdue_tasks,
        },
        reviews: {
          average_daily_rating: reviews.ratings.average_daily_rating,
          daily_reviews_count: reviews.ratings.daily_reviews_count,
        },
        learning: {
          entries_learned: learning.summary.total_learning_entries,
          notes_created: learning.summary.notes_created,
        },
        habits: habits
          ? {
              active_habits: habits.summary.active_habits,
              completed_logs: habits.summary.completed_logs,
              completion_rate: habits.summary.completion_rate_percentage,
            }
          : undefined,
        finance: finance
          ? {
              total_income: finance.income_vs_expense.total_income,
              total_expense: finance.income_vs_expense.total_expense,
              net_cash_flow: finance.income_vs_expense.net_cash_flow,
              savings_rate: finance.income_vs_expense.savings_rate_percentage,
              net_worth: finance.net_worth.netWorth,
            }
          : undefined,
      },
    };
  }

  // ---------------- REPORTS (WEEKLY, MONTHLY, 90-DAYS, YEARLY) ----------------
  async getReports(userId: string, query: any) {
    const range = await this.resolveDateRange(userId, query);

    const [habits, tasks, reviews, finance, learning] = await Promise.all([
      this.getHabitInsights(userId, range),
      this.getTaskInsights(userId, range),
      this.getReviewInsights(userId, range),
      this.getFinancialInsights(userId, range),
      this.getLearningInsights(userId, range),
    ]);

    // Calculate a performance index (0 - 100) combining available data
    const habitScore = habits.summary.completion_rate_percentage;
    const taskScore = tasks.summary.completion_rate_percentage;
    const ratingScore = reviews.ratings.average_daily_rating
      ? reviews.ratings.average_daily_rating * 10
      : null;
    const savingsScore = Math.min(Math.max(finance.income_vs_expense.savings_rate_percentage, 0), 100);

    const components = [habitScore, taskScore];
    if (ratingScore !== null) components.push(ratingScore);
    if (finance.income_vs_expense.total_income > 0) components.push(savingsScore);

    const performanceScore = Number(
      (components.reduce((a, b) => a + b, 0) / components.length).toFixed(1)
    );

    return {
      report_title: `${range.periodType.toUpperCase()} Performance Report`,
      period: {
        periodType: range.periodType,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      performance_index: {
        overall_score: performanceScore,
        habit_completion_rate: habitScore,
        task_completion_rate: taskScore,
        average_daily_rating: reviews.ratings.average_daily_rating,
        savings_rate: savingsScore,
      },
      habits,
      tasks,
      reviews,
      finance,
      learning,
    };
  }

  // ---------------- SNAPSHOTS MANAGEMENT ----------------
  async listSnapshots(userId: string, query: any) {
    return await insightsRepository.listSnapshots(userId, {
      periodType: query.periodType,
      insightType: query.insightType,
      page: query.page || 1,
      limit: query.limit || 10,
    });
  }

  async getSnapshotById(userId: string, id: string) {
    const snapshot = await insightsRepository.getSnapshotById(userId, id);
    if (!snapshot) {
      throw { status: 404, message: 'Insight snapshot not found.' };
    }
    return snapshot;
  }

  async generateSnapshot(userId: string, data: any) {
    const range = await this.resolveDateRange(userId, {
      period: data.periodType,
      startDate: data.periodStart,
      endDate: data.periodEnd,
    });

    let metrics: any = data.metrics;
    if (!metrics) {
      switch (data.insightType) {
        case 'habits':
          metrics = await this.getHabitInsights(userId, range);
          break;
        case 'tasks':
        case 'productivity':
          metrics = await this.getTaskInsights(userId, range);
          break;
        case 'reviews':
        case 'performance':
          metrics = await this.getReviewInsights(userId, range);
          break;
        case 'finance':
          metrics = await this.getFinancialInsights(userId, range);
          break;
        case 'learning':
          metrics = await this.getLearningInsights(userId, range);
          break;
        case 'reports':
          metrics = await this.getReports(userId, range);
          break;
        case 'dashboard':
        default:
          metrics = await this.getDashboardInsights(userId, range);
          break;
      }
    }

    return await insightsRepository.createSnapshot(userId, {
      periodType: range.periodType,
      periodStart: range.startDate,
      periodEnd: range.endDate,
      insightType: data.insightType,
      metrics,
    });
  }
}

export const insightsService = new InsightsService();
