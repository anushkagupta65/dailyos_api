import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { buildUpdateSet, paginate, toContainsPattern } from '../../utils/query';

type Queryable = Pick<PoolClient, 'query'>;

const NOTE_COLUMNS = {
  title: 'title',
  content: 'content',
  noteType: 'note_type',
  source: 'source',
  occurredAt: 'occurred_at',
  isPinned: 'is_pinned',
  categoryId: 'category_id',
  archivedAt: 'archived_at',
};

const CATEGORY_COLUMNS = {
  name: 'name',
  color: 'color',
};

const SORT_COLUMNS: Record<string, string> = {
  createdAt: 'n.created_at',
  updatedAt: 'n.updated_at',
  occurredAt: 'n.occurred_at',
  title: 'n.title',
};

export class NotesRepository {
  // ---------------- NOTES ----------------
  async createNote(db: Queryable, userId: string, data: any) {
    const { rows } = await db.query(
      `INSERT INTO notes (
         user_id, category_id, title, content, note_type, source, occurred_at, is_pinned
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.categoryId || null,
        data.title,
        data.content || null,
        data.noteType || 'general',
        data.source || null,
        data.occurredAt || null,
        data.isPinned ?? false,
      ]
    );
    return rows[0];
  }

  /**
   * Lists notes with filters. With `q`, matches title, content or tag (case-insensitive).
   * Pinned notes always come first.
   */
  async findNotes(
    userId: string,
    filters: {
      q?: string;
      noteType?: string;
      categoryId?: string;
      tag?: string;
      isPinned?: boolean;
      archived?: 'true' | 'false' | 'all';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['n.user_id = $1'];
    const params: any[] = [userId];
    const addParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.noteType) conditions.push(`n.note_type = ${addParam(filters.noteType)}`);
    if (filters.categoryId) conditions.push(`n.category_id = ${addParam(filters.categoryId)}`);
    if (filters.isPinned !== undefined) conditions.push(`n.is_pinned = ${addParam(filters.isPinned)}`);
    if (filters.archived === 'true') conditions.push('n.archived_at IS NOT NULL');
    if (!filters.archived || filters.archived === 'false') conditions.push('n.archived_at IS NULL');
    if (filters.tag) {
      conditions.push(
        `n.id IN (SELECT note_id FROM note_tags WHERE user_id = $1 AND tag = ${addParam(filters.tag.toLowerCase())})`
      );
    }
    if (filters.q) {
      const pattern = addParam(toContainsPattern(filters.q));
      conditions.push(
        `(n.title ILIKE ${pattern} OR n.content ILIKE ${pattern}
          OR n.id IN (SELECT note_id FROM note_tags WHERE user_id = $1 AND tag ILIKE ${pattern}))`
      );
    }

    const whereClause = conditions.join(' AND ');
    const sortColumn = SORT_COLUMNS[filters.sortBy || 'createdAt'] || 'n.created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM notes n WHERE ${whereClause}`,
      params
    );
    const total = parseInt(String(countRes.rows[0].count), 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT n.*, c.name AS category_name
       FROM notes n
       LEFT JOIN note_categories c ON c.id = n.category_id
       WHERE ${whereClause}
       ORDER BY n.is_pinned DESC, ${sortColumn} ${sortOrder} NULLS LAST, n.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows,
      pagination: paginate(page, limit, total),
    };
  }

  async getNoteById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT n.*, c.name AS category_name, c.color AS category_color
       FROM notes n
       LEFT JOIN note_categories c ON c.id = n.category_id
       WHERE n.id = $1 AND n.user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async updateNote(userId: string, id: string, data: any, db: Queryable = pool) {
    const { sets, values } = buildUpdateSet(data, NOTE_COLUMNS, 3);
    const { rows } = await db.query(
      `UPDATE notes
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteNote(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM notes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Most recent non-archived notes (Dashboard aggregation).
   */
  async getRecentNotes(userId: string, limit: number) {
    const { rows } = await pool.query(
      `SELECT n.*, c.name AS category_name
       FROM notes n
       LEFT JOIN note_categories c ON c.id = n.category_id
       WHERE n.user_id = $1 AND n.archived_at IS NULL
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  // ---------------- TAGS ----------------
  async getTagsForNote(userId: string, noteId: string): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT tag FROM note_tags WHERE note_id = $1 AND user_id = $2 ORDER BY tag ASC`,
      [noteId, userId]
    );
    return rows.map((r) => r.tag);
  }

  /**
   * Tags grouped by note for the given notes. Filtered in JS (rather than `= ANY($2)`)
   * to stay portable across pg drivers/emulators.
   */
  async getTagsForNotes(userId: string, noteIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>(noteIds.map((id) => [id, []]));
    if (noteIds.length === 0) return result;
    const { rows } = await pool.query(
      `SELECT note_id, tag FROM note_tags WHERE user_id = $1 ORDER BY tag ASC`,
      [userId]
    );
    for (const row of rows) {
      result.get(row.note_id)?.push(row.tag);
    }
    return result;
  }

  async deleteTagsForNote(db: Queryable, userId: string, noteId: string) {
    await db.query(`DELETE FROM note_tags WHERE note_id = $1 AND user_id = $2`, [noteId, userId]);
  }

  async addTag(db: Queryable, userId: string, noteId: string, tag: string) {
    await db.query(
      `INSERT INTO note_tags (user_id, note_id, tag)
       VALUES ($1, $2, $3)
       ON CONFLICT (note_id, tag) DO NOTHING`,
      [userId, noteId, tag]
    );
  }

  // ---------------- CATEGORIES ----------------
  async getCategories(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM note_categories WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );
    return rows;
  }

  async getCategoryById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM note_categories WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async findCategoryByName(userId: string, name: string) {
    const { rows } = await pool.query(
      `SELECT * FROM note_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
      [userId, name]
    );
    return rows[0] || null;
  }

  async createCategory(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO note_categories (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, data.name, data.color || null]
    );
    return rows[0];
  }

  async updateCategory(userId: string, id: string, data: any) {
    const { sets, values } = buildUpdateSet(data, CATEGORY_COLUMNS, 3);
    const { rows } = await pool.query(
      `UPDATE note_categories
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );
    return rows[0] || null;
  }

  async deleteCategory(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM note_categories WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const notesRepository = new NotesRepository();
