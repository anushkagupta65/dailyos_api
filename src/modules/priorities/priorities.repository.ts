import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapPriority = (row: any) =>
  row && {
    ...row,
    priority_date: toDateString(row.priority_date),
    priority_order: Number(row.priority_order),
  };

const PRIORITY_COLUMNS = {
  title: 'title',
  description: 'description',
  isCompleted: 'is_completed',
  completedAt: 'completed_at',
};

export class PrioritiesRepository {
  /**
   * Serializes priority writes for a user (row lock held until the transaction ends),
   * so concurrent requests cannot exceed the per-day limit or clash on ordering.
   */
  async lockUser(db: Queryable, userId: string) {
    await db.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);
  }

  async getPrioritiesForDate(db: Queryable, userId: string, priorityDate: string) {
    const { rows } = await db.query(
      `SELECT * FROM daily_priorities
       WHERE user_id = $1 AND priority_date = $2
       ORDER BY priority_order ASC, created_at ASC`,
      [userId, priorityDate]
    );
    return rows.map(mapPriority);
  }

  /**
   * Inserts at the end of the day's list only while the day has fewer than `maxPerDay`
   * priorities; the count check and insert are a single statement. Returns null when full.
   */
  async createPriorityIfBelowLimit(db: Queryable, userId: string, data: any, maxPerDay: number) {
    const countRes = await db.query(
      `SELECT count(*)::int as count FROM daily_priorities WHERE user_id = $1 AND priority_date = $2`,
      [userId, data.priorityDate]
    );
    const count = Number(countRes.rows[0]?.count || 0);
    if (count >= maxPerDay) {
      return null;
    }
    const { rows } = await db.query(
      `INSERT INTO daily_priorities (user_id, priority_date, title, description, priority_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data.priorityDate, data.title, data.description || null, count + 1]
    );
    return mapPriority(rows[0]) || null;
  }

  async getPriorities(
    userId: string,
    filters: {
      date?: string;
      startDate?: string;
      endDate?: string;
      isCompleted?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 30;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.date) {
      params.push(filters.date);
      conditions.push(`priority_date = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      conditions.push(`priority_date >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      conditions.push(`priority_date <= $${params.length}`);
    }
    if (filters.isCompleted !== undefined) {
      params.push(filters.isCompleted);
      conditions.push(`is_completed = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM daily_priorities WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM daily_priorities
       WHERE ${whereClause}
       ORDER BY priority_date DESC, priority_order ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapPriority),
      pagination: paginate(page, limit, total),
    };
  }

  async getPriorityById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_priorities WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return mapPriority(rows[0]) || null;
  }

  async updatePriority(userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(data, PRIORITY_COLUMNS, 3);
    const { rows } = await pool.query(
      `UPDATE daily_priorities
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return mapPriority(rows[0]) || null;
  }

  async setPriorityOrder(db: Queryable, userId: string, id: string, priorityOrder: number) {
    await db.query(
      `UPDATE daily_priorities
       SET priority_order = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, userId, priorityOrder]
    );
  }

  async deletePriority(db: Queryable, userId: string, id: string): Promise<boolean> {
    const res = await db.query(
      `DELETE FROM daily_priorities WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const prioritiesRepository = new PrioritiesRepository();
