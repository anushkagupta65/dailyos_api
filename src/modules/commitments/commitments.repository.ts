import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate, toNumberOrNull } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapHabit = (row: any) =>
  row && {
    ...row,
    target_value: toNumberOrNull(row.target_value),
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
  };

const mapSchedule = (row: any) =>
  row && {
    ...row,
    weekdays: Array.isArray(row.weekdays) ? row.weekdays : [],
    effective_from: toDateString(row.effective_from),
    effective_until: toDateString(row.effective_until),
  };

const mapLog = (row: any) =>
  row && {
    ...row,
    log_date: toDateString(row.log_date),
    actual_value: toNumberOrNull(row.actual_value),
  };

const CATEGORY_COLUMNS = {
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  sortOrder: 'sort_order',
};

const HABIT_COLUMNS = {
  categoryId: 'category_id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  habitType: 'habit_type',
  trackingType: 'tracking_type',
  targetValue: 'target_value',
  targetUnit: 'target_unit',
  frequencyType: 'frequency_type',
  startDate: 'start_date',
  endDate: 'end_date',
  preferredTime: 'preferred_time',
  cue: 'cue',
  difficulty: 'difficulty',
  status: 'status',
  sortOrder: 'sort_order',
};

const SCHEDULE_COLUMNS = {
  scheduleType: 'schedule_type',
  weekdays: 'weekdays',
  intervalDays: 'interval_days',
  effectiveFrom: 'effective_from',
  effectiveUntil: 'effective_until',
};

const LOG_COLUMNS = {
  status: 'status',
  actualValue: 'actual_value',
  notes: 'notes',
  completedAt: 'completed_at',
};

const FLEXIBILITY_COLUMNS = {
  minimumVersion: 'minimum_version',
  normalVersion: 'normal_version',
  idealVersion: 'ideal_version',
  alternativeAction: 'alternative_action',
  recoveryRule: 'recovery_rule',
  neverMissTwice: 'never_miss_twice',
};

const REMINDER_COLUMNS = {
  reminderTime: 'reminder_time',
  reminderType: 'reminder_type',
  isEnabled: 'is_enabled',
};

export class CommitmentsRepository {
  // ---------------- CATEGORIES ----------------
  async getCategories(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_categories
       WHERE is_system = TRUE OR user_id = $1
       ORDER BY is_system DESC, sort_order ASC, name ASC`,
      [userId]
    );
    return rows;
  }

  /**
   * Returns a category the user may attach habits to (system or their own).
   */
  async getAccessibleCategory(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_categories
       WHERE id = $1 AND (is_system = TRUE OR user_id = $2)`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async findCategoryByName(userId: string, name: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_categories
       WHERE LOWER(name) = LOWER($2) AND (is_system = TRUE OR user_id = $1)`,
      [userId, name]
    );
    return rows[0] || null;
  }

  async createCategory(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6)
       RETURNING *`,
      [
        userId,
        data.name,
        data.description || null,
        data.icon || null,
        data.color || null,
        data.sortOrder ?? 0,
      ]
    );
    return rows[0];
  }

  async updateCategory(userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(data, CATEGORY_COLUMNS, 3);
    const { rows } = await pool.query(
      `UPDATE habit_categories
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2 AND is_system = FALSE
       RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteCategory(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habit_categories WHERE id = $1 AND user_id = $2 AND is_system = FALSE`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- HABITS ----------------
  async createHabit(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO habits (
         user_id, category_id, name, description, icon, color, habit_type, tracking_type,
         target_value, target_unit, frequency_type, start_date, end_date, preferred_time,
         cue, difficulty, status, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        userId,
        data.categoryId || null,
        data.name,
        data.description || null,
        data.icon || null,
        data.color || null,
        data.habitType || 'positive',
        data.trackingType || 'boolean',
        data.targetValue ?? null,
        data.targetUnit || null,
        data.frequencyType || 'daily',
        data.startDate,
        data.endDate || null,
        data.preferredTime || null,
        data.cue || null,
        data.difficulty || 'medium',
        data.status || 'active',
        data.sortOrder ?? 0,
      ]
    );
    return mapHabit(rows[0]);
  }

  async getHabits(
    userId: string,
    filters: {
      categoryId?: string;
      status?: string;
      habitType?: string;
      frequencyType?: string;
      trackingType?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['h.user_id = $1'];
    const params: any[] = [userId];

    const filterColumns: [keyof typeof filters, string][] = [
      ['categoryId', 'h.category_id'],
      ['status', 'h.status'],
      ['habitType', 'h.habit_type'],
      ['frequencyType', 'h.frequency_type'],
      ['trackingType', 'h.tracking_type'],
    ];
    for (const [key, column] of filterColumns) {
      if (filters[key]) {
        params.push(filters[key]);
        conditions.push(`${column} = $${params.length}`);
      }
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM habits h WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT h.*, c.name AS category_name
       FROM habits h
       LEFT JOIN habit_categories c ON c.id = h.category_id
       WHERE ${whereClause}
       ORDER BY h.sort_order ASC, h.created_at ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapHabit),
      pagination: paginate(page, limit, total),
    };
  }

  async getHabitById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT h.*, c.name AS category_name
       FROM habits h
       LEFT JOIN habit_categories c ON c.id = h.category_id
       WHERE h.id = $1 AND h.user_id = $2`,
      [id, userId]
    );
    return mapHabit(rows[0]) || null;
  }

  /**
   * All of a user's habits (optionally a single one), used for progress and dashboard aggregation.
   */
  async getHabitsForUser(userId: string, habitId?: string) {
    const params: any[] = [userId];
    let condition = '';
    if (habitId) {
      params.push(habitId);
      condition = 'AND id = $2';
    }
    const { rows } = await pool.query(
      `SELECT * FROM habits
       WHERE user_id = $1 ${condition}
       ORDER BY sort_order ASC, created_at ASC`,
      params
    );
    return rows.map(mapHabit);
  }

  async updateHabit(userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(data, HABIT_COLUMNS, 3);
    const { rows } = await pool.query(
      `UPDATE habits
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return mapHabit(rows[0]) || null;
  }

  async updateHabitStatus(userId: string, id: string, status: string) {
    const { rows } = await pool.query(
      `UPDATE habits
       SET status = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, status]
    );
    return mapHabit(rows[0]) || null;
  }

  async deleteHabit(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habits WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- SCHEDULES ----------------
  async getSchedules(userId: string, habitId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_schedules
       WHERE habit_id = $1 AND user_id = $2
       ORDER BY effective_from ASC`,
      [habitId, userId]
    );
    return rows.map(mapSchedule);
  }

  async getSchedulesForHabits(userId: string, habitIds: string[]) {
    if (habitIds.length === 0) return [];
    // Filtered by habit in JS (rather than `= ANY($2)`) to stay portable across pg drivers/emulators.
    const ids = new Set(habitIds);
    const { rows } = await pool.query(
      `SELECT * FROM habit_schedules
       WHERE user_id = $1
       ORDER BY effective_from ASC`,
      [userId]
    );
    return rows.filter((row) => ids.has(row.habit_id)).map(mapSchedule);
  }

  async getScheduleById(userId: string, habitId: string, scheduleId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_schedules WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [scheduleId, habitId, userId]
    );
    return mapSchedule(rows[0]) || null;
  }

  async createSchedule(db: Queryable, userId: string, habitId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO habit_schedules (
         habit_id, user_id, schedule_type, weekdays, interval_days, effective_from, effective_until
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        habitId,
        userId,
        data.scheduleType,
        JSON.stringify(data.weekdays || []),
        data.intervalDays ?? null,
        data.effectiveFrom,
        data.effectiveUntil || null,
      ]
    );
    return mapSchedule(rows[0]);
  }

  async closeSchedule(db: Queryable, userId: string, scheduleId: string, effectiveUntil: string) {
    await db.query(
      `UPDATE habit_schedules
       SET effective_until = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [scheduleId, userId, effectiveUntil]
    );
  }

  async updateSchedule(userId: string, habitId: string, scheduleId: string, data: any) {
    const payload = {
      ...data,
      weekdays: data.weekdays !== undefined ? JSON.stringify(data.weekdays) : undefined,
    };
    const { sets, values } = buildUpdateSet(payload, SCHEDULE_COLUMNS, 4);
    const { rows } = await pool.query(
      `UPDATE habit_schedules
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND habit_id = $2 AND user_id = $3
       RETURNING *`,
      [scheduleId, habitId, userId, ...values]
    );
    return mapSchedule(rows[0]) || null;
  }

  async deleteSchedule(userId: string, habitId: string, scheduleId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habit_schedules WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [scheduleId, habitId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- LOGS ----------------
  async createLog(userId: string, habitId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO habit_logs (
         user_id, habit_id, log_date, status, actual_value, notes, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        habitId,
        data.logDate,
        data.status,
        data.actualValue ?? null,
        data.notes || null,
        data.completedAt || null,
      ]
    );
    return mapLog(rows[0]);
  }

  async getLogByDate(userId: string, habitId: string, logDate: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_logs WHERE user_id = $1 AND habit_id = $2 AND log_date = $3`,
      [userId, habitId, logDate]
    );
    return mapLog(rows[0]) || null;
  }

  async getLogById(userId: string, habitId: string, logId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_logs WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [logId, habitId, userId]
    );
    return mapLog(rows[0]) || null;
  }

  async getLogs(
    userId: string,
    filters: {
      habitId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.user_id = $1'];
    const params: any[] = [userId];

    if (filters.habitId) {
      params.push(filters.habitId);
      conditions.push(`l.habit_id = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      conditions.push(`l.log_date >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      conditions.push(`l.log_date <= $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`l.status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM habit_logs l WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT l.*, h.name AS habit_name
       FROM habit_logs l
       INNER JOIN habits h ON h.id = l.habit_id
       WHERE ${whereClause}
       ORDER BY l.log_date DESC, h.sort_order ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapLog),
      pagination: paginate(page, limit, total),
    };
  }

  /**
   * Unpaginated logs for a set of habits within a date range (progress calculations).
   */
  async getLogsInRange(userId: string, habitIds: string[], startDate: string, endDate: string) {
    if (habitIds.length === 0) return [];
    const ids = new Set(habitIds);
    const { rows } = await pool.query(
      `SELECT * FROM habit_logs
       WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
       ORDER BY log_date ASC`,
      [userId, startDate, endDate]
    );
    return rows.filter((row) => ids.has(row.habit_id)).map(mapLog);
  }

  async updateLog(userId: string, habitId: string, logId: string, data: any) {
    const { sets, values } = buildUpdateSet(data, LOG_COLUMNS, 4);
    const { rows } = await pool.query(
      `UPDATE habit_logs
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND habit_id = $2 AND user_id = $3
       RETURNING *`,
      [logId, habitId, userId, ...values]
    );
    return mapLog(rows[0]) || null;
  }

  async deleteLog(userId: string, habitId: string, logId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habit_logs WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [logId, habitId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- FLEXIBILITY ----------------
  async getFlexibility(userId: string, habitId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_flexibility WHERE habit_id = $1 AND user_id = $2`,
      [habitId, userId]
    );
    return rows[0] || null;
  }

  async createFlexibility(userId: string, habitId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO habit_flexibility (
         habit_id, user_id, minimum_version, normal_version, ideal_version,
         alternative_action, recovery_rule, never_miss_twice
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        habitId,
        userId,
        data.minimumVersion || null,
        data.normalVersion || null,
        data.idealVersion || null,
        data.alternativeAction || null,
        data.recoveryRule || null,
        data.neverMissTwice ?? false,
      ]
    );
    return rows[0];
  }

  async updateFlexibility(userId: string, habitId: string, data: any) {
    const { sets, values } = buildUpdateSet(data, FLEXIBILITY_COLUMNS, 3);
    const { rows } = await pool.query(
      `UPDATE habit_flexibility
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE habit_id = $1 AND user_id = $2
       RETURNING *`,
      [habitId, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteFlexibility(userId: string, habitId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habit_flexibility WHERE habit_id = $1 AND user_id = $2`,
      [habitId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- REMINDERS ----------------
  async getReminders(userId: string, habitId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_reminders
       WHERE habit_id = $1 AND user_id = $2
       ORDER BY reminder_time ASC`,
      [habitId, userId]
    );
    return rows;
  }

  async getEnabledRemindersForUser(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_reminders
       WHERE user_id = $1 AND is_enabled = TRUE
       ORDER BY reminder_time ASC`,
      [userId]
    );
    return rows;
  }

  async getReminderById(userId: string, habitId: string, reminderId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_reminders WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [reminderId, habitId, userId]
    );
    return rows[0] || null;
  }

  async createReminder(userId: string, habitId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO habit_reminders (habit_id, user_id, reminder_time, reminder_type, is_enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        habitId,
        userId,
        data.reminderTime,
        data.reminderType || 'in_app',
        data.isEnabled ?? true,
      ]
    );
    return rows[0];
  }

  async updateReminder(userId: string, habitId: string, reminderId: string, data: any) {
    const { sets, values } = buildUpdateSet(data, REMINDER_COLUMNS, 4);
    const { rows } = await pool.query(
      `UPDATE habit_reminders
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND habit_id = $2 AND user_id = $3
       RETURNING *`,
      [reminderId, habitId, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteReminder(userId: string, habitId: string, reminderId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM habit_reminders WHERE id = $1 AND habit_id = $2 AND user_id = $3`,
      [reminderId, habitId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const commitmentsRepository = new CommitmentsRepository();
