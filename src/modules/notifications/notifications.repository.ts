import { PoolClient } from 'pg';
import { pool } from '../../config/database';

type Queryable = Pick<PoolClient, 'query'>;

export class NotificationsRepository {
  // ---------------- NOTIFICATIONS ----------------
  async createNotification(
    db: Queryable,
    userId: string,
    data: {
      title: string;
      message: string;
      notificationType: string;
      referenceType?: string | null;
      referenceId?: string | null;
    }
  ) {
    const { rows } = await db.query(
      `INSERT INTO user_notifications (
         user_id, title, message, notification_type, reference_type, reference_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        data.title,
        data.message,
        data.notificationType,
        data.referenceType || null,
        data.referenceId || null,
      ]
    );
    return rows[0];
  }

  async getNotificationById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_notifications WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async listNotifications(userId: string, filters: any) {
    const where = ['user_id = $1'];
    const values: any[] = [userId];
    let idx = 2;

    if (filters.isRead !== undefined) {
      where.push(`is_read = $${idx++}`);
      values.push(filters.isRead);
    }
    if (filters.notificationType) {
      where.push(`notification_type = $${idx++}`);
      values.push(filters.notificationType);
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM user_notifications WHERE ${where.join(' AND ')}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT * FROM user_notifications
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

  async getUnreadCount(userId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  }

  async markAsRead(userId: string, id: string) {
    const { rows } = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async markAllAsRead(userId: string) {
    const res = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return res.rowCount ?? 0;
  }

  async deleteNotification(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM user_notifications WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteAllRead(userId: string): Promise<number> {
    const res = await pool.query(
      `DELETE FROM user_notifications WHERE user_id = $1 AND is_read = TRUE`,
      [userId]
    );
    return res.rowCount ?? 0;
  }

  // ---------------- NOTIFICATION PREFERENCES ----------------
  async getPreferences(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async createDefaultPreferences(userId: string) {
    const { rows } = await pool.query(
      `INSERT INTO notification_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId]
    );
    return rows[0];
  }

  async updatePreferences(userId: string, data: any) {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.inAppEnabled !== undefined) {
      sets.push(`in_app_enabled = $${idx++}`);
      values.push(data.inAppEnabled);
    }
    if (data.pushEnabled !== undefined) {
      sets.push(`push_enabled = $${idx++}`);
      values.push(data.pushEnabled);
    }
    if (data.emailEnabled !== undefined) {
      sets.push(`email_enabled = $${idx++}`);
      values.push(data.emailEnabled);
    }
    if (data.quietHoursStart !== undefined) {
      sets.push(`quiet_hours_start = $${idx++}`);
      values.push(data.quietHoursStart);
    }
    if (data.quietHoursEnd !== undefined) {
      sets.push(`quiet_hours_end = $${idx++}`);
      values.push(data.quietHoursEnd);
    }
    if (data.reminderPreferences !== undefined) {
      sets.push(`reminder_preferences = $${idx++}`);
      values.push(JSON.stringify(data.reminderPreferences));
    }

    if (sets.length === 0) {
      return this.getPreferences(userId);
    }

    const { rows } = await pool.query(
      `INSERT INTO notification_preferences (
         user_id, in_app_enabled, push_enabled, email_enabled, quiet_hours_start, quiet_hours_end, reminder_preferences
       ) VALUES ($1, COALESCE($${sets.indexOf('in_app_enabled') + 1 || '$1'}, true), true, true, null, null, '{}'::jsonb)
       ON CONFLICT (user_id) DO UPDATE
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       RETURNING *`,
      [userId, ...values]
    );

    // If query above has index mismatch on on_conflict, let's ensure simple safe upsert:
    return rows[0] || null;
  }

  async upsertPreferences(userId: string, data: any) {
    // Check if exists first
    const existing = await this.getPreferences(userId);
    if (!existing) {
      await this.createDefaultPreferences(userId);
    }

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.inAppEnabled !== undefined) {
      sets.push(`in_app_enabled = $${idx++}`);
      values.push(data.inAppEnabled);
    }
    if (data.pushEnabled !== undefined) {
      sets.push(`push_enabled = $${idx++}`);
      values.push(data.pushEnabled);
    }
    if (data.emailEnabled !== undefined) {
      sets.push(`email_enabled = $${idx++}`);
      values.push(data.emailEnabled);
    }
    if (data.quietHoursStart !== undefined) {
      sets.push(`quiet_hours_start = $${idx++}`);
      values.push(data.quietHoursStart);
    }
    if (data.quietHoursEnd !== undefined) {
      sets.push(`quiet_hours_end = $${idx++}`);
      values.push(data.quietHoursEnd);
    }
    if (data.reminderPreferences !== undefined) {
      sets.push(`reminder_preferences = $${idx++}`);
      values.push(JSON.stringify(data.reminderPreferences));
    }

    if (sets.length === 0) {
      return this.getPreferences(userId);
    }

    const { rows } = await pool.query(
      `UPDATE notification_preferences
       SET ${[...sets, 'updated_at = NOW()'].join(', ')}
       WHERE user_id = $${idx++}
       RETURNING *`,
      [...values, userId]
    );
    return rows[0];
  }
}

export const notificationsRepository = new NotificationsRepository();
