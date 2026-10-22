import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate, toContainsPattern } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapTask = (row: any) =>
  row && {
    ...row,
    scheduled_date: toDateString(row.scheduled_date),
    due_date: toDateString(row.due_date),
  };

const TASK_COLUMNS = {
  title: 'title',
  description: 'description',
  category: 'category',
  priority: 'priority',
  status: 'status',
  scheduledDate: 'scheduled_date',
  dueDate: 'due_date',
  startTime: 'start_time',
  endTime: 'end_time',
  estimatedMinutes: 'estimated_minutes',
  actualMinutes: 'actual_minutes',
  source: 'source',
  completedAt: 'completed_at',
};

const SUBTASK_COLUMNS = {
  title: 'title',
  isCompleted: 'is_completed',
  sortOrder: 'sort_order',
  completedAt: 'completed_at',
};

const PRIORITY_RANK_SQL = `CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  scheduledDate: 'scheduled_date',
  dueDate: 'due_date',
  priority: PRIORITY_RANK_SQL,
  title: 'title',
};

export class TasksRepository {
  // ---------------- TASKS ----------------
  async createTask(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO tasks (
         user_id, title, description, category, priority, status, scheduled_date, due_date,
         start_time, end_time, estimated_minutes, actual_minutes, completed_at, source
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId,
        data.title,
        data.description || null,
        data.category || null,
        data.priority || 'medium',
        data.status,
        data.scheduledDate || null,
        data.dueDate || null,
        data.startTime || null,
        data.endTime || null,
        data.estimatedMinutes ?? null,
        data.actualMinutes ?? null,
        data.completedAt || null,
        data.source || 'manual',
      ]
    );
    return mapTask(rows[0]);
  }

  async getTasks(
    userId: string,
    filters: {
      status?: string;
      priority?: string;
      category?: string;
      scheduledDate?: string;
      dueDate?: string;
      startDate?: string;
      endDate?: string;
      dateField?: 'scheduledDate' | 'dueDate';
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    const addCondition = (sql: string, value: any) => {
      params.push(value);
      conditions.push(sql.replace('?', `$${params.length}`));
    };

    if (filters.status) addCondition('status = ?', filters.status);
    if (filters.priority) addCondition('priority = ?', filters.priority);
    if (filters.category) addCondition('LOWER(category) = LOWER(?)', filters.category);
    if (filters.scheduledDate) addCondition('scheduled_date = ?', filters.scheduledDate);
    if (filters.dueDate) addCondition('due_date = ?', filters.dueDate);

    const rangeColumn = filters.dateField === 'dueDate' ? 'due_date' : 'scheduled_date';
    if (filters.startDate) addCondition(`${rangeColumn} >= ?`, filters.startDate);
    if (filters.endDate) addCondition(`${rangeColumn} <= ?`, filters.endDate);
    if (filters.search) addCondition('title ILIKE ?', toContainsPattern(filters.search));

    const whereClause = conditions.join(' AND ');
    const sortColumn = SORT_COLUMNS[filters.sortBy || 'createdAt'] || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM tasks WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM tasks
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapTask),
      pagination: paginate(page, limit, total),
    };
  }

  async getTaskById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return mapTask(rows[0]) || null;
  }

  async updateTask(db: Queryable, userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(data, TASK_COLUMNS, 3);
    const { rows } = await db.query(
      `UPDATE tasks
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return mapTask(rows[0]) || null;
  }

  async deleteTask(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Tasks scheduled or due within the range (Dashboard aggregation).
   */
  async getTasksInDateRange(userId: string, startDate: string, endDate: string) {
    const { rows } = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1
         AND ((scheduled_date >= $2 AND scheduled_date <= $3)
           OR (due_date >= $2 AND due_date <= $3))
       ORDER BY start_time ASC NULLS LAST, ${PRIORITY_RANK_SQL} DESC, created_at ASC`,
      [userId, startDate, endDate]
    );
    return rows.map(mapTask);
  }

  /**
   * Open tasks whose due date is before the given date (Dashboard aggregation).
   */
  async getOverdueTasks(userId: string, beforeDate: string, limit = 20) {
    const { rows } = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1 AND due_date < $2
         AND status <> 'completed' AND status <> 'cancelled'
       ORDER BY due_date ASC, ${PRIORITY_RANK_SQL} DESC
       LIMIT $3`,
      [userId, beforeDate, limit]
    );
    return rows.map(mapTask);
  }

  // ---------------- SUBTASKS ----------------
  async getSubtasks(userId: string, taskId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM task_subtasks
       WHERE task_id = $1 AND user_id = $2
       ORDER BY sort_order ASC, created_at ASC`,
      [taskId, userId]
    );
    return rows;
  }

  async getSubtaskById(userId: string, taskId: string, subtaskId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM task_subtasks WHERE id = $1 AND task_id = $2 AND user_id = $3`,
      [subtaskId, taskId, userId]
    );
    return rows[0] || null;
  }

  async createSubtask(userId: string, taskId: string, data: any, db: Queryable = pool) {
    const { rows } = await db.query(
      `INSERT INTO task_subtasks (task_id, user_id, title, is_completed, sort_order, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        taskId,
        userId,
        data.title,
        data.isCompleted ?? false,
        data.sortOrder ?? 0,
        data.completedAt || null,
      ]
    );
    return rows[0];
  }

  async updateSubtask(userId: string, taskId: string, subtaskId: string, data: any) {
    const { sets, values } = buildUpdateSet(data, SUBTASK_COLUMNS, 4);
    const { rows } = await pool.query(
      `UPDATE task_subtasks
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND task_id = $2 AND user_id = $3
       RETURNING *`,
      [subtaskId, taskId, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteSubtask(userId: string, taskId: string, subtaskId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM task_subtasks WHERE id = $1 AND task_id = $2 AND user_id = $3`,
      [subtaskId, taskId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- STATUS HISTORY ----------------
  async createStatusHistory(
    db: Queryable,
    userId: string,
    taskId: string,
    previousStatus: string | null,
    newStatus: string,
    note?: string | null
  ) {
    const { rows } = await db.query(
      `INSERT INTO task_status_history (task_id, user_id, previous_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, userId, previousStatus, newStatus, note || null]
    );
    return rows[0];
  }

  async getStatusHistory(userId: string, taskId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM task_status_history
       WHERE task_id = $1 AND user_id = $2
       ORDER BY changed_at ASC`,
      [taskId, userId]
    );
    return rows;
  }

  // ---------------- TASK RECURRENCES ----------------
  async createRecurrence(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO task_recurrences (
         user_id, task_id, frequency, weekdays, interval_value, start_date, end_date, next_occurrence, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        data.taskId,
        data.frequency,
        JSON.stringify(data.weekdays || []),
        data.intervalValue || 1,
        data.startDate,
        data.endDate || null,
        data.nextOccurrence || data.startDate,
        data.isActive !== undefined ? data.isActive : true,
      ]
    );
    return rows[0];
  }

  async getRecurrenceById(userId: string, id: string, client?: Queryable) {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT r.*, t.title AS task_title
       FROM task_recurrences r
       JOIN tasks t ON t.id = r.task_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async getRecurrenceByTaskId(userId: string, taskId: string, client?: Queryable) {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT * FROM task_recurrences
       WHERE task_id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    return rows[0] || null;
  }

  async listRecurrences(userId: string, filters: any) {
    const where = ['r.user_id = $1'];
    const values: any[] = [userId];
    let idx = 2;

    if (filters.isActive !== undefined) {
      where.push(`r.is_active = $${idx++}`);
      values.push(filters.isActive);
    }
    if (filters.frequency) {
      where.push(`r.frequency = $${idx++}`);
      values.push(filters.frequency);
    }
    if (filters.taskId) {
      where.push(`r.task_id = $${idx++}`);
      values.push(filters.taskId);
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM task_recurrences r WHERE ${where.join(' AND ')}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT r.*, t.title AS task_title
       FROM task_recurrences r
       JOIN tasks t ON t.id = r.task_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateRecurrence(db: Queryable, userId: string, id: string, data: any) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      frequency: 'frequency',
      intervalValue: 'interval_value',
      startDate: 'start_date',
      endDate: 'end_date',
      nextOccurrence: 'next_occurrence',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (data.weekdays !== undefined) {
      sets.push(`weekdays = $${idx++}`);
      values.push(JSON.stringify(data.weekdays));
    }

    if (sets.length === 0) {
      return this.getRecurrenceById(userId, id, db);
    }

    const { rows } = await db.query(
      `UPDATE task_recurrences
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx++}
       RETURNING *`,
      [...values, id, userId]
    );
    return rows[0] || null;
  }

  async deleteRecurrence(db: Queryable, userId: string, id: string) {
    const res = await db.query(
      `DELETE FROM task_recurrences WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getTasksByRecurrenceId(userId: string, recurrenceId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM tasks
       WHERE recurrence_id = $1 AND user_id = $2
       ORDER BY scheduled_date DESC, created_at DESC`,
      [recurrenceId, userId]
    );
    return rows.map(mapTask);
  }

  async getTaskOccurrenceForDate(recurrenceId: string, scheduledDate: string, client?: Queryable) {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT id FROM tasks
       WHERE recurrence_id = $1 AND scheduled_date = $2`,
      [recurrenceId, scheduledDate]
    );
    return rows[0] || null;
  }
}

export const tasksRepository = new TasksRepository();
