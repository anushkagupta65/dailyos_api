import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { paginate } from '../../utils/query';

const mapIntention = (row: any) =>
  row && {
    ...row,
    intention_date: toDateString(row.intention_date),
  };

export class IntentionsRepository {
  async createIntention(userId: string, data: { intentionDate: string; content: string }) {
    const { rows } = await pool.query(
      `INSERT INTO daily_intentions (user_id, intention_date, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, data.intentionDate, data.content]
    );
    return mapIntention(rows[0]);
  }

  async getIntentionByDate(userId: string, intentionDate: string) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_intentions WHERE user_id = $1 AND intention_date = $2`,
      [userId, intentionDate]
    );
    return mapIntention(rows[0]) || null;
  }

  async getIntentions(
    userId: string,
    filters: { date?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 30;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.date) {
      params.push(filters.date);
      conditions.push(`intention_date = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      conditions.push(`intention_date >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      conditions.push(`intention_date <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM daily_intentions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM daily_intentions
       WHERE ${whereClause}
       ORDER BY intention_date DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapIntention),
      pagination: paginate(page, limit, total),
    };
  }

  async getIntentionById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_intentions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return mapIntention(rows[0]) || null;
  }

  async updateIntention(userId: string, id: string, content: string) {
    const { rows } = await pool.query(
      `UPDATE daily_intentions
       SET content = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, content]
    );
    return mapIntention(rows[0]) || null;
  }

  async deleteIntention(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM daily_intentions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const intentionsRepository = new IntentionsRepository();
