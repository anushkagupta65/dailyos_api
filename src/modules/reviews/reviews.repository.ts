import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate, toContainsPattern } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapReview = (row: any) =>
  row && {
    ...row,
    period_start: toDateString(row.period_start),
    period_end: toDateString(row.period_end),
  };

const mapAction = (row: any) =>
  row && {
    ...row,
    due_date: toDateString(row.due_date),
  };

export class ReviewsRepository {
  // ---------------- REVIEWS ----------------
  async findReviewByPeriod(
    userId: string,
    reviewType: string,
    periodStart: string,
    db: Queryable = pool
  ) {
    const { rows } = await db.query(
      `SELECT * FROM reviews
       WHERE user_id = $1 AND review_type = $2 AND period_start = $3`,
      [userId, reviewType, periodStart]
    );
    return rows[0] ? mapReview(rows[0]) : null;
  }

  async createReview(
    db: Queryable,
    userId: string,
    data: {
      reviewType: string;
      periodStart: string;
      periodEnd: string;
      rating?: number | null;
      status?: string;
      summary?: string | null;
      completedAt?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO reviews (
         user_id, review_type, period_start, period_end, rating, status, summary, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.reviewType,
        data.periodStart,
        data.periodEnd,
        data.rating ?? null,
        data.status || 'draft',
        data.summary ?? null,
        data.completedAt ?? null,
      ]
    );
    return mapReview(rows[0]);
  }

  async getReviewById(userId: string, id: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM reviews WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapReview(rows[0]) : null;
  }

  async listReviews(
    userId: string,
    filters: {
      reviewType?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    }
  ) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.reviewType) {
      params.push(filters.reviewType);
      where.push(`review_type = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      where.push(`period_start >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      where.push(`period_end <= $${params.length}`);
    }

    const whereClause = where.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM reviews WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM reviews
       WHERE ${whereClause}
       ORDER BY period_start DESC, created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      reviews: rows.map(mapReview),
      pagination: paginate(filters.page, filters.limit, total),
    };
  }

  async updateReview(
    db: Queryable,
    userId: string,
    id: string,
    data: {
      rating?: number | null;
      status?: string;
      summary?: string | null;
      completedAt?: string | null;
    }
  ) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        rating: 'rating',
        status: 'status',
        summary: 'summary',
        completedAt: 'completed_at',
      },
      3
    );

    if (sets.length === 0) {
      return this.getReviewById(userId, id, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE reviews
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return rows[0] ? mapReview(rows[0]) : null;
  }

  async completeReview(db: Queryable, userId: string, id: string) {
    const { rows } = await db.query(
      `UPDATE reviews
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return rows[0] ? mapReview(rows[0]) : null;
  }

  async deleteReview(userId: string, id: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM reviews WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- DETAILS: DAILY ----------------
  async upsertDailyDetails(
    db: Queryable,
    reviewId: string,
    data: {
      intentionSnapshot?: string | null;
      plannedVsActual?: string | null;
      whatWentWell?: string | null;
      whatGotInTheWay?: string | null;
      reflections?: string | null;
      moneyReflection?: string | null;
      tomorrowFocus?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO daily_reviews (
         review_id, intention_snapshot, planned_vs_actual, what_went_well,
         what_got_in_the_way, reflections, money_reflection, tomorrow_focus
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (review_id) DO UPDATE SET
         intention_snapshot = COALESCE(EXCLUDED.intention_snapshot, daily_reviews.intention_snapshot),
         planned_vs_actual = COALESCE(EXCLUDED.planned_vs_actual, daily_reviews.planned_vs_actual),
         what_went_well = COALESCE(EXCLUDED.what_went_well, daily_reviews.what_went_well),
         what_got_in_the_way = COALESCE(EXCLUDED.what_got_in_the_way, daily_reviews.what_got_in_the_way),
         reflections = COALESCE(EXCLUDED.reflections, daily_reviews.reflections),
         money_reflection = COALESCE(EXCLUDED.money_reflection, daily_reviews.money_reflection),
         tomorrow_focus = COALESCE(EXCLUDED.tomorrow_focus, daily_reviews.tomorrow_focus),
         updated_at = NOW()
       RETURNING *`,
      [
        reviewId,
        data.intentionSnapshot ?? null,
        data.plannedVsActual ?? null,
        data.whatWentWell ?? null,
        data.whatGotInTheWay ?? null,
        data.reflections ?? null,
        data.moneyReflection ?? null,
        data.tomorrowFocus ?? null,
      ]
    );
    return rows[0] || null;
  }

  async getDailyDetails(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM daily_reviews WHERE review_id = $1`,
      [reviewId]
    );
    return rows[0] || null;
  }

  // ---------------- DETAILS: WEEKLY ----------------
  async upsertWeeklyDetails(
    db: Queryable,
    reviewId: string,
    data: {
      wins?: string | null;
      recurringBlockers?: string | null;
      lessons?: string | null;
      changesNextWeek?: string | null;
      moneyReflection?: string | null;
      nextWeekFocus?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO weekly_reviews (
         review_id, wins, recurring_blockers, lessons, changes_next_week,
         money_reflection, next_week_focus
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (review_id) DO UPDATE SET
         wins = COALESCE(EXCLUDED.wins, weekly_reviews.wins),
         recurring_blockers = COALESCE(EXCLUDED.recurring_blockers, weekly_reviews.recurring_blockers),
         lessons = COALESCE(EXCLUDED.lessons, weekly_reviews.lessons),
         changes_next_week = COALESCE(EXCLUDED.changes_next_week, weekly_reviews.changes_next_week),
         money_reflection = COALESCE(EXCLUDED.money_reflection, weekly_reviews.money_reflection),
         next_week_focus = COALESCE(EXCLUDED.next_week_focus, weekly_reviews.next_week_focus),
         updated_at = NOW()
       RETURNING *`,
      [
        reviewId,
        data.wins ?? null,
        data.recurringBlockers ?? null,
        data.lessons ?? null,
        data.changesNextWeek ?? null,
        data.moneyReflection ?? null,
        data.nextWeekFocus ?? null,
      ]
    );
    return rows[0] || null;
  }

  async getWeeklyDetails(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM weekly_reviews WHERE review_id = $1`,
      [reviewId]
    );
    return rows[0] || null;
  }

  // ---------------- DETAILS: MONTHLY ----------------
  async upsertMonthlyDetails(
    db: Queryable,
    reviewId: string,
    data: {
      highlights?: string | null;
      whatHeldBack?: string | null;
      learnings?: string | null;
      changesNextMonth?: string | null;
      moneyReflection?: string | null;
      nextMonthFocus?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO monthly_reviews (
         review_id, highlights, what_held_back, learnings, changes_next_month,
         money_reflection, next_month_focus
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (review_id) DO UPDATE SET
         highlights = COALESCE(EXCLUDED.highlights, monthly_reviews.highlights),
         what_held_back = COALESCE(EXCLUDED.what_held_back, monthly_reviews.what_held_back),
         learnings = COALESCE(EXCLUDED.learnings, monthly_reviews.learnings),
         changes_next_month = COALESCE(EXCLUDED.changes_next_month, monthly_reviews.changes_next_month),
         money_reflection = COALESCE(EXCLUDED.money_reflection, monthly_reviews.money_reflection),
         next_month_focus = COALESCE(EXCLUDED.next_month_focus, monthly_reviews.next_month_focus),
         updated_at = NOW()
       RETURNING *`,
      [
        reviewId,
        data.highlights ?? null,
        data.whatHeldBack ?? null,
        data.learnings ?? null,
        data.changesNextMonth ?? null,
        data.moneyReflection ?? null,
        data.nextMonthFocus ?? null,
      ]
    );
    return rows[0] || null;
  }

  async getMonthlyDetails(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM monthly_reviews WHERE review_id = $1`,
      [reviewId]
    );
    return rows[0] || null;
  }

  // ---------------- RATINGS ----------------
  async upsertHabitRating(
    db: Queryable,
    reviewId: string,
    habitId: string,
    rating: number,
    notes?: string | null
  ) {
    const { rows } = await db.query(
      `INSERT INTO review_habit_ratings (review_id, habit_id, rating, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (review_id, habit_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         notes = COALESCE(EXCLUDED.notes, review_habit_ratings.notes),
         updated_at = NOW()
       RETURNING *`,
      [reviewId, habitId, rating, notes ?? null]
    );
    return rows[0];
  }

  async getHabitRatings(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT r.*, h.name AS habit_name, h.icon AS habit_icon, h.color AS habit_color
       FROM review_habit_ratings r
       JOIN habits h ON h.id = r.habit_id
       WHERE r.review_id = $1
       ORDER BY r.created_at ASC`,
      [reviewId]
    );
    return rows;
  }

  async upsertTaskRating(
    db: Queryable,
    reviewId: string,
    taskId: string,
    rating: number,
    notes?: string | null
  ) {
    const { rows } = await db.query(
      `INSERT INTO review_task_ratings (review_id, task_id, rating, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (review_id, task_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         notes = COALESCE(EXCLUDED.notes, review_task_ratings.notes),
         updated_at = NOW()
       RETURNING *`,
      [reviewId, taskId, rating, notes ?? null]
    );
    return rows[0];
  }

  async getTaskRatings(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT r.*, t.title AS task_title, t.priority AS task_priority, t.status AS task_status
       FROM review_task_ratings r
       JOIN tasks t ON t.id = r.task_id
       WHERE r.review_id = $1
       ORDER BY r.created_at ASC`,
      [reviewId]
    );
    return rows;
  }

  // ---------------- ACTIONS ----------------
  async createAction(
    db: Queryable,
    userId: string,
    reviewId: string,
    data: {
      linkedTaskId?: string | null;
      title: string;
      description?: string | null;
      actionType?: string;
      priority?: string;
      status?: string;
      dueDate?: string | null;
      completedAt?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO review_actions (
         user_id, review_id, linked_task_id, title, description,
         action_type, priority, status, due_date, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        reviewId,
        data.linkedTaskId ?? null,
        data.title,
        data.description ?? null,
        data.actionType || 'other',
        data.priority || 'medium',
        data.status || 'open',
        data.dueDate ?? null,
        data.completedAt ?? null,
      ]
    );
    return mapAction(rows[0]);
  }

  async getActionById(userId: string, actionId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM review_actions WHERE id = $1 AND user_id = $2`,
      [actionId, userId]
    );
    return rows[0] ? mapAction(rows[0]) : null;
  }

  async listActions(
    userId: string,
    filters: {
      reviewId?: string;
      status?: string;
      priority?: string;
      actionType?: string;
      search?: string;
      openOnly?: boolean;
      page: number;
      limit: number;
    }
  ) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.openOnly) {
      where.push(`status IN ('open', 'in_progress')`);
    } else if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }

    if (filters.reviewId) {
      params.push(filters.reviewId);
      where.push(`review_id = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      where.push(`priority = $${params.length}`);
    }
    if (filters.actionType) {
      params.push(filters.actionType);
      where.push(`action_type = $${params.length}`);
    }
    if (filters.search) {
      params.push(toContainsPattern(filters.search));
      where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = where.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM review_actions WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM review_actions
       WHERE ${whereClause}
       ORDER BY
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         due_date ASC NULLS LAST,
         created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      actions: rows.map(mapAction),
      pagination: paginate(filters.page, filters.limit, total),
    };
  }

  async getActionsForReview(reviewId: string, db: Queryable = pool) {
    const { rows } = await db.query(
      `SELECT * FROM review_actions
       WHERE review_id = $1
       ORDER BY created_at ASC`,
      [reviewId]
    );
    return rows.map(mapAction);
  }

  async updateAction(
    db: Queryable,
    userId: string,
    actionId: string,
    data: {
      linkedTaskId?: string | null;
      title?: string;
      description?: string | null;
      actionType?: string;
      priority?: string;
      status?: string;
      dueDate?: string | null;
      completedAt?: string | null;
    }
  ) {
    const { sets, values } = buildUpdateSet(
      data,
      {
        linkedTaskId: 'linked_task_id',
        title: 'title',
        description: 'description',
        actionType: 'action_type',
        priority: 'priority',
        status: 'status',
        dueDate: 'due_date',
        completedAt: 'completed_at',
      },
      3
    );

    if (sets.length === 0) {
      return this.getActionById(userId, actionId, db);
    }

    sets.push('updated_at = NOW()');

    const { rows } = await db.query(
      `UPDATE review_actions
       SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [actionId, userId, ...values]
    );

    return rows[0] ? mapAction(rows[0]) : null;
  }

  async updateActionStatus(
    db: Queryable,
    userId: string,
    actionId: string,
    status: string
  ) {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    const { rows } = await db.query(
      `UPDATE review_actions
       SET status = $1, completed_at = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, completedAt, actionId, userId]
    );
    return rows[0] ? mapAction(rows[0]) : null;
  }

  async deleteAction(userId: string, actionId: string, db: Queryable = pool) {
    const { rowCount } = await db.query(
      `DELETE FROM review_actions WHERE id = $1 AND user_id = $2`,
      [actionId, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  // ---------------- AGGREGATION HELPERS FOR SUMMARY GENERATION ----------------
  async getDailyReviewsInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT r.*, d.intention_snapshot, d.planned_vs_actual, d.what_went_well,
              d.what_got_in_the_way, d.reflections, d.money_reflection, d.tomorrow_focus
       FROM reviews r
       LEFT JOIN daily_reviews d ON d.review_id = r.id
       WHERE r.user_id = $1 AND r.review_type = 'daily'
         AND r.period_start >= $2 AND r.period_start <= $3
       ORDER BY r.period_start ASC`,
      [userId, startDate, endDate]
    );
    return rows.map(mapReview);
  }

  async getTasksActivityInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, title, priority, status, scheduled_date, due_date, completed_at
       FROM tasks
       WHERE user_id = $1
         AND (
           (scheduled_date >= $2 AND scheduled_date <= $3)
           OR (due_date >= $2 AND due_date <= $3)
           OR (completed_at >= $2::date AND completed_at < ($3::date + 1))
         )`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getHabitLogsCountInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS completed_count
       FROM habit_logs
       WHERE user_id = $1 AND is_completed = TRUE
         AND log_date >= $2 AND log_date <= $3`,
      [userId, startDate, endDate]
    );
    return rows[0]?.completed_count || 0;
  }

  async getDailyPrioritiesInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, priority_date, title, is_completed, priority_order
       FROM daily_priorities
       WHERE user_id = $1 AND priority_date >= $2 AND priority_date <= $3
       ORDER BY priority_date ASC, priority_order ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getDailyIntentionsInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, intention_date, content
       FROM daily_intentions
       WHERE user_id = $1 AND intention_date >= $2 AND intention_date <= $3
       ORDER BY intention_date ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getDailyIntentionForDate(userId: string, date: string) {
    const { rows } = await pool.query(
      `SELECT content FROM daily_intentions WHERE user_id = $1 AND intention_date = $2`,
      [userId, date]
    );
    return rows[0]?.content || null;
  }

  async getLearningEntriesInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT id, title, category, learned_at, key_takeaway
       FROM learning_entries
       WHERE user_id = $1 AND learned_at >= $2 AND learned_at <= $3
       ORDER BY learned_at ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }

  async getFinancialTransactionsSummaryInRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT
         transaction_type,
         SUM(amount)::numeric(15,2) AS total_amount
       FROM financial_transactions
       WHERE user_id = $1 AND status = 'completed'
         AND transaction_date >= $2 AND transaction_date <= $3
       GROUP BY transaction_type`,
      [userId, startDate, endDate]
    );
    return rows;
  }
}

export const reviewsRepository = new ReviewsRepository();
