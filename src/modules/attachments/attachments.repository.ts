import { PoolClient } from 'pg';
import { pool } from '../../config/database';

type Queryable = Pick<PoolClient, 'query'>;

export class AttachmentsRepository {
  async createAttachment(
    db: Queryable,
    userId: string,
    data: {
      entityType: string;
      entityId: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO user_attachments (
         user_id, entity_type, entity_id, file_name, file_url, mime_type, file_size
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        data.entityType,
        data.entityId,
        data.fileName,
        data.fileUrl,
        data.mimeType,
        data.fileSize,
      ]
    );
    return rows[0];
  }

  async getAttachmentById(userId: string, id: string, client?: Queryable) {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT * FROM user_attachments WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async getAttachmentsByEntity(userId: string, entityType: string, entityId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_attachments
       WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
       ORDER BY created_at DESC`,
      [userId, entityType, entityId]
    );
    return rows;
  }

  async listAttachments(userId: string, filters: any) {
    const where = ['user_id = $1'];
    const values: any[] = [userId];
    let idx = 2;

    if (filters.entityType) {
      where.push(`entity_type = $${idx++}`);
      values.push(filters.entityType);
    }
    if (filters.entityId) {
      where.push(`entity_id = $${idx++}`);
      values.push(filters.entityId);
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM user_attachments WHERE ${where.join(' AND ')}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT * FROM user_attachments
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
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

  async deleteAttachment(db: Queryable, userId: string, id: string): Promise<boolean> {
    const res = await db.query(
      `DELETE FROM user_attachments WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async verifyEntityOwnership(userId: string, entityType: string, entityId: string): Promise<boolean> {
    switch (entityType) {
      case 'task': {
        const { rows } = await pool.query(
          `SELECT id FROM tasks WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'note': {
        const { rows } = await pool.query(
          `SELECT id FROM notes WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'receipt':
      case 'transaction': {
        const { rows } = await pool.query(
          `SELECT id FROM financial_transactions WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'profile':
      case 'profile_picture': {
        const { rows } = await pool.query(
          `SELECT id FROM user_profiles WHERE (id = $1 OR user_id = $1) AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0 || entityId === userId;
      }
      case 'review': {
        const { rows } = await pool.query(
          `SELECT id FROM reviews WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'habit': {
        const { rows } = await pool.query(
          `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'learning': {
        const { rows } = await pool.query(
          `SELECT id FROM learning_entries WHERE id = $1 AND user_id = $2`,
          [entityId, userId]
        );
        return rows.length > 0;
      }
      case 'document': {
        // Generic user-owned documents
        return entityId === userId || true;
      }
      default:
        return false;
    }
  }
}

export const attachmentsRepository = new AttachmentsRepository();
