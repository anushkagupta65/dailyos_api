import { pool } from '../../config/database';
import { paginate } from '../../utils/query';

export interface UserInsightPreferencesRecord {
  id: string;
  user_id: string;
  default_period: 'week' | 'month' | '90_days' | 'year';
  default_filter: string;
  show_habits: boolean;
  show_money: boolean;
  updated_at: string;
}

export interface InsightSnapshotRecord {
  id: string;
  user_id: string;
  period_type: 'week' | 'month' | '90_days' | 'year';
  period_start: string;
  period_end: string;
  insight_type: string;
  metrics: Record<string, any>;
  generated_at: string;
}

export class InsightsRepository {
  // ---------------- PREFERENCES ----------------
  async getPreferences(userId: string): Promise<UserInsightPreferencesRecord | null> {
    const { rows } = await pool.query<UserInsightPreferencesRecord>(
      `SELECT id, user_id, default_period, default_filter, show_habits, show_money, updated_at
       FROM user_insight_preferences
       WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertPreferences(
    userId: string,
    data: {
      defaultPeriod?: 'week' | 'month' | '90_days' | 'year';
      defaultFilter?: string;
      showHabits?: boolean;
      showMoney?: boolean;
    },
    defaults: {
      default_period: 'week' | 'month' | '90_days' | 'year';
      default_filter: string;
      show_habits: boolean;
      show_money: boolean;
    }
  ): Promise<UserInsightPreferencesRecord> {
    const existing = await this.getPreferences(userId);
    if (existing) {
      const { rows } = await pool.query<UserInsightPreferencesRecord>(
        `UPDATE user_insight_preferences
         SET default_period = COALESCE($2, default_period),
             default_filter = COALESCE($3, default_filter),
             show_habits = COALESCE($4, show_habits),
             show_money = COALESCE($5, show_money),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING id, user_id, default_period, default_filter, show_habits, show_money, updated_at`,
        [userId, data.defaultPeriod, data.defaultFilter, data.showHabits, data.showMoney]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query<UserInsightPreferencesRecord>(
        `INSERT INTO user_insight_preferences (
           user_id, default_period, default_filter, show_habits, show_money
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, default_period, default_filter, show_habits, show_money, updated_at`,
        [
          userId,
          data.defaultPeriod ?? defaults.default_period,
          data.defaultFilter ?? defaults.default_filter,
          data.showHabits ?? defaults.show_habits,
          data.showMoney ?? defaults.show_money,
        ]
      );
      return rows[0];
    }
  }

  // ---------------- HABIT INSIGHTS ----------------
  async getHabitLogsSummary(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         status,
         COUNT(*)::int as count
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
       GROUP BY status`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getHabitBreakdown(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         h.id, h.name, h.color, h.icon, h.frequency_type, h.habit_type,
         COUNT(hl.id)::int as total_logs,
         COUNT(CASE WHEN hl.status = 'completed' THEN 1 END)::int as completed_count,
         COUNT(CASE WHEN hl.status = 'partial' THEN 1 END)::int as partial_count,
         COUNT(CASE WHEN hl.status = 'missed' THEN 1 END)::int as missed_count,
         COUNT(CASE WHEN hl.status = 'skipped' THEN 1 END)::int as skipped_count
       FROM habits h
       LEFT JOIN habit_logs hl 
         ON hl.habit_id = h.id 
         AND hl.user_id = h.user_id 
         AND hl.log_date >= $2 
         AND hl.log_date <= $3
       WHERE h.user_id = $1 AND h.status = 'active'
       GROUP BY h.id, h.name, h.color, h.icon, h.frequency_type, h.habit_type
       ORDER BY completed_count DESC`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getHabitsWithSchedules(userId: string) {
    const { rows: habits } = await pool.query(
      `SELECT id, user_id, name, start_date, end_date, frequency_type, habit_type, status
       FROM habits
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const { rows: schedules } = await pool.query(
      `SELECT id, habit_id, schedule_type, weekdays, interval_days, effective_from, effective_until
       FROM habit_schedules
       WHERE user_id = $1`,
      [userId]
    );

    const schedulesByHabit = new Map<string, any[]>();
    for (const s of schedules) {
      const list = schedulesByHabit.get(s.habit_id) || [];
      list.push(s);
      schedulesByHabit.set(s.habit_id, list);
    }

    return habits.map((h) => ({
      ...h,
      schedules: schedulesByHabit.get(h.id) || [],
    }));
  }

  async getHabitLogsForRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, habit_id, log_date, status, actual_value
       FROM habit_logs
       WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
       ORDER BY log_date ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  // ---------------- TASK INSIGHTS ----------------
  async getTaskMetrics(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         COUNT(*)::int as total_tasks,
         COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_tasks,
         COUNT(CASE WHEN status = 'inbox' THEN 1 END)::int as inbox_tasks,
         COUNT(CASE WHEN status = 'planned' THEN 1 END)::int as planned_tasks,
         COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_tasks,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_tasks,
         COUNT(CASE WHEN priority = 'urgent' THEN 1 END)::int as urgent_tasks,
         COUNT(CASE WHEN priority = 'high' THEN 1 END)::int as high_tasks,
         COUNT(CASE WHEN priority = 'medium' THEN 1 END)::int as medium_tasks,
         COUNT(CASE WHEN priority = 'low' THEN 1 END)::int as low_tasks,
         COUNT(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled') THEN 1 END)::int as overdue_tasks,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN estimated_minutes END), 0)::int as total_estimated_minutes,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN actual_minutes END), 0)::int as total_actual_minutes
       FROM tasks
       WHERE user_id = $1
         AND (
           (scheduled_date >= $2 AND scheduled_date <= $3)
           OR (due_date >= $2 AND due_date <= $3)
           OR (created_at::date >= $2 AND created_at::date <= $3)
         )`,
      [userId, startDate, endDate]
    );
    return rows[0];
  }

  async getRecentCompletedTasks(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, title, category, priority, scheduled_date, due_date, estimated_minutes, actual_minutes, completed_at
       FROM tasks
       WHERE user_id = $1 AND status = 'completed'
         AND (completed_at::date >= $2 AND completed_at::date <= $3)
       ORDER BY completed_at DESC
       LIMIT 10`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  // ---------------- REVIEW INSIGHTS ----------------
  async getReviewRatings(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         review_type,
         COUNT(*)::int as total_count,
         COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_count,
         ROUND(AVG(rating), 2) as avg_rating,
         MIN(rating) as min_rating,
         MAX(rating) as max_rating
       FROM reviews
       WHERE user_id = $1 AND period_start >= $2 AND period_start <= $3
       GROUP BY review_type`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getAverageDailyRating(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         ROUND(AVG(rating), 2) as avg_rating,
         COUNT(*)::int as count
       FROM reviews
       WHERE user_id = $1 AND review_type = 'daily' AND rating IS NOT NULL
         AND period_start >= $2 AND period_start <= $3`,
      [userId, startDate, endDate]
    );
    return {
      avgRating: rows[0]?.avg_rating ? Number(rows[0].avg_rating) : null,
      count: Number(rows[0]?.count || 0),
    };
  }

  async getRecurringBlockersAndWins(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         r.review_type, r.period_start, r.period_end, r.rating,
         wr.recurring_blockers, wr.lessons, wr.wins,
         dr.what_got_in_the_way, dr.what_went_well, dr.planned_vs_actual
       FROM reviews r
       LEFT JOIN weekly_reviews wr ON wr.review_id = r.id
       LEFT JOIN daily_reviews dr ON dr.review_id = r.id
       WHERE r.user_id = $1 AND r.period_start >= $2 AND r.period_start <= $3
         AND (
           wr.recurring_blockers IS NOT NULL 
           OR dr.what_got_in_the_way IS NOT NULL 
           OR wr.wins IS NOT NULL
           OR dr.what_went_well IS NOT NULL
         )
       ORDER BY r.period_start DESC
       LIMIT 20`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getReviewActionsSummary(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         COUNT(*)::int as total_actions,
         COUNT(CASE WHEN is_completed = TRUE THEN 1 END)::int as completed_actions,
         COUNT(CASE WHEN is_completed = FALSE THEN 1 END)::int as pending_actions
       FROM review_actions
       WHERE user_id = $1 AND created_at::date >= $2 AND created_at::date <= $3`,
      [userId, startDate, endDate]
    );
    return rows[0];
  }

  // ---------------- LEARNING INSIGHTS ----------------
  async getLearningMetrics(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT 
         COUNT(*)::int as total_entries,
         COUNT(DISTINCT category)::int as unique_categories,
         COUNT(DISTINCT source)::int as unique_sources
       FROM learning_entries
       WHERE user_id = $1 AND learned_at >= $2 AND learned_at <= $3`,
      [userId, startDate, endDate]
    );
    return rows[0];
  }

  async getNotesCount(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int as notes_created
       FROM notes
       WHERE user_id = $1 AND created_at::date >= $2 AND created_at::date <= $3`,
      [userId, startDate, endDate]
    );
    return Number(rows[0]?.notes_created || 0);
  }

  async getRecentLearning(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, title, category, source, learned_at, key_takeaway
       FROM learning_entries
       WHERE user_id = $1 AND learned_at >= $2 AND learned_at <= $3
       ORDER BY learned_at DESC
       LIMIT 10`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  // ---------------- SNAPSHOTS ----------------
  async createSnapshot(
    userId: string,
    data: {
      periodType: 'week' | 'month' | '90_days' | 'year';
      periodStart: string;
      periodEnd: string;
      insightType: string;
      metrics: Record<string, any>;
    }
  ): Promise<InsightSnapshotRecord> {
    const { rows } = await pool.query<InsightSnapshotRecord>(
      `INSERT INTO insight_snapshots (
         user_id, period_type, period_start, period_end, insight_type, metrics
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, period_type, period_start, period_end, insight_type, metrics, generated_at`,
      [userId, data.periodType, data.periodStart, data.periodEnd, data.insightType, JSON.stringify(data.metrics)]
    );
    return rows[0];
  }

  async listSnapshots(
    userId: string,
    options: {
      periodType?: 'week' | 'month' | '90_days' | 'year';
      insightType?: string;
      page: number;
      limit: number;
    }
  ) {
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];

    if (options.periodType) {
      values.push(options.periodType);
      conditions.push(`period_type = $${values.length}`);
    }

    if (options.insightType) {
      values.push(options.insightType);
      conditions.push(`insight_type = $${values.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM insight_snapshots WHERE ${whereClause}`,
      values
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const offset = (options.page - 1) * options.limit;
    values.push(options.limit, offset);

    const { rows } = await pool.query<InsightSnapshotRecord>(
      `SELECT id, user_id, period_type, period_start, period_end, insight_type, metrics, generated_at
       FROM insight_snapshots
       WHERE ${whereClause}
       ORDER BY generated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      snapshots: rows,
      pagination: paginate(options.page, options.limit, total),
    };
  }

  async getSnapshotById(userId: string, id: string): Promise<InsightSnapshotRecord | null> {
    const { rows } = await pool.query<InsightSnapshotRecord>(
      `SELECT id, user_id, period_type, period_start, period_end, insight_type, metrics, generated_at
       FROM insight_snapshots
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }
}

export const insightsRepository = new InsightsRepository();
