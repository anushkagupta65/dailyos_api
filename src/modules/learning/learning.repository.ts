import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { toDateString } from '../../utils/date';
import { buildUpdateSet, paginate, toContainsPattern, toNumberOrNull } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const mapEntry = (row: any) =>
  row && {
    ...row,
    learned_at: toDateString(row.learned_at),
    review_date: toDateString(row.review_date),
  };

const mapReview = (row: any) =>
  row && {
    ...row,
    understanding_level: toNumberOrNull(row.understanding_level),
  };

const ENTRY_COLUMNS = {
  title: 'title',
  content: 'content',
  keyTakeaway: 'key_takeaway',
  category: 'category',
  source: 'source',
  learnedAt: 'learned_at',
  reviewDate: 'review_date',
};

const REVIEW_COLUMNS = {
  reviewedAt: 'reviewed_at',
  reflection: 'reflection',
  understandingLevel: 'understanding_level',
};

const SORT_COLUMNS: Record<string, string> = {
  learnedAt: 'learned_at',
  reviewDate: 'review_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  title: 'title',
};

export class LearningRepository {
  // ---------------- ENTRIES ----------------
  async createEntry(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO learning_entries (
         user_id, title, content, key_takeaway, category, source, learned_at, review_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.title,
        data.content || null,
        data.keyTakeaway || null,
        data.category || null,
        data.source || null,
        data.learnedAt,
        data.reviewDate || null,
      ]
    );
    return mapEntry(rows[0]);
  }

  /**
   * Lists entries with filters. With `q`, matches title, content, category or source.
   */
  async findEntries(
    userId: string,
    filters: {
      q?: string;
      category?: string;
      learnedFrom?: string;
      learnedTo?: string;
      reviewFrom?: string;
      reviewTo?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    const addParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.category) conditions.push(`LOWER(category) = LOWER(${addParam(filters.category)})`);
    if (filters.learnedFrom) conditions.push(`learned_at >= ${addParam(filters.learnedFrom)}`);
    if (filters.learnedTo) conditions.push(`learned_at <= ${addParam(filters.learnedTo)}`);
    if (filters.reviewFrom) conditions.push(`review_date >= ${addParam(filters.reviewFrom)}`);
    if (filters.reviewTo) conditions.push(`review_date <= ${addParam(filters.reviewTo)}`);
    if (filters.q) {
      const pattern = addParam(toContainsPattern(filters.q));
      conditions.push(
        `(title ILIKE ${pattern} OR content ILIKE ${pattern} OR category ILIKE ${pattern} OR source ILIKE ${pattern})`
      );
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = SORT_COLUMNS[filters.sortBy || 'learnedAt'] || 'learned_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM learning_entries WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM learning_entries
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapEntry),
      pagination: paginate(page, limit, total),
    };
  }

  /**
   * Entries with a review date in [fromDate, toDate]; fromDate omitted = include all overdue.
   */
  async getEntriesDueForReview(
    userId: string,
    filters: { fromDate?: string; toDate: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1', 'review_date IS NOT NULL', 'review_date <= $2'];
    const params: any[] = [userId, filters.toDate];
    if (filters.fromDate) {
      params.push(filters.fromDate);
      conditions.push(`review_date >= $${params.length}`);
    }
    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM learning_entries WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM learning_entries
       WHERE ${whereClause}
       ORDER BY review_date ASC, created_at ASC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows.map(mapEntry),
      pagination: paginate(page, limit, total),
    };
  }

  async getEntryById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM learning_entries WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return mapEntry(rows[0]) || null;
  }

  async updateEntry(userId: string, id: string, data: any, db: Queryable = pool) {
    const { sets, values } = buildUpdateSet(data, ENTRY_COLUMNS, 3);
    const { rows } = await db.query(
      `UPDATE learning_entries
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return mapEntry(rows[0]) || null;
  }

  async deleteEntry(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM learning_entries WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- REVIEWS ----------------
  async createReview(db: Queryable, userId: string, learningId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO learning_reviews (user_id, learning_id, reviewed_at, reflection, understanding_level)
       VALUES ($1, $2, COALESCE($3, NOW()), $4, $5)
       RETURNING *`,
      [
        userId,
        learningId,
        data.reviewedAt || null,
        data.reflection || null,
        data.understandingLevel ?? null,
      ]
    );
    return mapReview(rows[0]);
  }

  async getReviews(userId: string, learningId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM learning_reviews
       WHERE learning_id = $1 AND user_id = $2
       ORDER BY reviewed_at DESC`,
      [learningId, userId]
    );
    return rows.map(mapReview);
  }

  async updateReview(userId: string, learningId: string, reviewId: string, data: any) {
    const { sets, values } = buildUpdateSet(data, REVIEW_COLUMNS, 4);
    const { rows } = await pool.query(
      `UPDATE learning_reviews
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND learning_id = $2 AND user_id = $3
       RETURNING *`,
      [reviewId, learningId, userId, ...values]
    );
    return mapReview(rows[0]) || null;
  }

  async deleteReview(userId: string, learningId: string, reviewId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM learning_reviews WHERE id = $1 AND learning_id = $2 AND user_id = $3`,
      [reviewId, learningId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const learningRepository = new LearningRepository();
