import { withTransaction, pool } from '../../config/database';
import { notificationsRepository } from './notifications.repository';
import { getTodayInTimezone } from '../../utils/date';

const isQuietHours = (start?: string | null, end?: string | null, nowTime?: string): boolean => {
  if (!start || !end) return false;
  const current = nowTime || new Date().toISOString().slice(11, 19);
  const norm = (t: string) => (t.length === 5 ? `${t}:00` : t);
  const s = norm(start);
  const e = norm(end);
  if (s <= e) {
    return current >= s && current <= e;
  }
  // Crosses midnight, e.g. 22:00:00 to 07:00:00
  return current >= s || current <= e;
};

export class NotificationsService {
  async getPreferences(userId: string) {
    let prefs = await notificationsRepository.getPreferences(userId);
    if (!prefs) {
      prefs = await notificationsRepository.createDefaultPreferences(userId);
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: any) {
    return notificationsRepository.upsertPreferences(userId, data);
  }

  async createNotification(userId: string, data: any) {
    const prefs = await this.getPreferences(userId);

    // Respect in-app enabled
    if (prefs.in_app_enabled === false) {
      return {
        message: 'Notification suppressed: in-app notifications are disabled in user preferences.',
        notification: null,
      };
    }

    // Respect quiet hours for reminders
    if (
      data.notificationType?.endsWith('_reminder') &&
      isQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)
    ) {
      return {
        message: 'Notification suppressed: quiet hours are currently active.',
        notification: null,
      };
    }

    // Verify reference ownership if referenceId is provided
    if (data.referenceId && data.referenceType) {
      let isOwner = false;
      switch (data.referenceType) {
        case 'habit': {
          const { rows } = await pool.query(
            `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
            [data.referenceId, userId]
          );
          isOwner = rows.length > 0;
          break;
        }
        case 'task': {
          const { rows } = await pool.query(
            `SELECT id FROM tasks WHERE id = $1 AND user_id = $2`,
            [data.referenceId, userId]
          );
          isOwner = rows.length > 0;
          break;
        }
        case 'recurring_payment': {
          const { rows } = await pool.query(
            `SELECT id FROM recurring_payments WHERE id = $1 AND user_id = $2`,
            [data.referenceId, userId]
          );
          isOwner = rows.length > 0;
          break;
        }
        case 'review': {
          const { rows } = await pool.query(
            `SELECT id FROM reviews WHERE id = $1 AND user_id = $2`,
            [data.referenceId, userId]
          );
          isOwner = rows.length > 0;
          break;
        }
        default:
          isOwner = true;
          break;
      }

      if (!isOwner) {
        throw {
          status: 403,
          message: `Referenced ${data.referenceType} does not belong to the authenticated user.`,
        };
      }
    }

    const notification = await withTransaction(async (client) => {
      return notificationsRepository.createNotification(client, userId, data);
    });

    return {
      message: 'Notification created successfully.',
      notification,
    };
  }

  async getNotificationById(userId: string, id: string) {
    const notification = await notificationsRepository.getNotificationById(userId, id);
    if (!notification) {
      throw { status: 404, message: 'Notification not found.' };
    }
    return notification;
  }

  async listNotifications(userId: string, filters: any) {
    return notificationsRepository.listNotifications(userId, filters);
  }

  async getUnreadCount(userId: string) {
    const count = await notificationsRepository.getUnreadCount(userId);
    return { unreadCount: count };
  }

  async markAsRead(userId: string, id: string) {
    await this.getNotificationById(userId, id);
    const updated = await notificationsRepository.markAsRead(userId, id);
    return { message: 'Notification marked as read.', notification: updated };
  }

  async markAllAsRead(userId: string) {
    const count = await notificationsRepository.markAllAsRead(userId);
    return { message: `All notifications marked as read. (${count} updated)`, updatedCount: count };
  }

  async deleteNotification(userId: string, id: string) {
    await this.getNotificationById(userId, id);
    await notificationsRepository.deleteNotification(userId, id);
    return { message: 'Notification deleted successfully.' };
  }

  async deleteAllRead(userId: string) {
    const count = await notificationsRepository.deleteAllRead(userId);
    return { message: `Read notifications deleted successfully. (${count} deleted)`, deletedCount: count };
  }

  // ---------------- REMINDER INTEGRATION ----------------
  async generateReminders(userId: string, timezone: string = 'UTC') {
    const prefs = await this.getPreferences(userId);
    if (prefs.in_app_enabled === false) {
      return { message: 'Reminders skipped: notifications are disabled.', created: [] };
    }

    if (isQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      return { message: 'Reminders skipped: currently in quiet hours.', created: [] };
    }

    const reminderPrefs = prefs.reminder_preferences || {};
    const today = getTodayInTimezone(timezone);
    const created: any[] = [];

    // 1. Habit Reminders
    if (reminderPrefs.habits !== false) {
      const { rows: pendingHabits } = await pool.query(
        `SELECT h.id, h.name
         FROM habits h
         LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.log_date = $2 AND hl.status = 'completed'
         WHERE h.user_id = $1 AND h.status = 'active' AND hl.id IS NULL
         LIMIT 5`,
        [userId, today]
      );

      for (const h of pendingHabits) {
        // Prevent duplicate reminder today
        const { rows: dup } = await pool.query(
          `SELECT id FROM user_notifications
           WHERE user_id = $1 AND reference_type = 'habit' AND reference_id = $2
             AND created_at >= $3::date`,
          [userId, h.id, today]
        );
        if (dup.length === 0) {
          const res = await this.createNotification(userId, {
            title: `Habit reminder: ${h.name}`,
            message: `Don't forget to complete your habit "${h.name}" today!`,
            notificationType: 'habit_reminder',
            referenceType: 'habit',
            referenceId: h.id,
          });
          if (res.notification) created.push(res.notification);
        }
      }
    }

    // 2. Task Reminders
    if (reminderPrefs.tasks !== false) {
      const { rows: pendingTasks } = await pool.query(
        `SELECT id, title
         FROM tasks
         WHERE user_id = $1 AND (scheduled_date = $2 OR due_date = $2)
           AND status IN ('inbox', 'planned')
         LIMIT 5`,
        [userId, today]
      );

      for (const t of pendingTasks) {
        const { rows: dup } = await pool.query(
          `SELECT id FROM user_notifications
           WHERE user_id = $1 AND reference_type = 'task' AND reference_id = $2
             AND created_at >= $3::date`,
          [userId, t.id, today]
        );
        if (dup.length === 0) {
          const res = await this.createNotification(userId, {
            title: `Task reminder: ${t.title}`,
            message: `You have task "${t.title}" scheduled for today.`,
            notificationType: 'task_reminder',
            referenceType: 'task',
            referenceId: t.id,
          });
          if (res.notification) created.push(res.notification);
        }
      }
    }

    // 3. Recurring Payments Reminders
    if (reminderPrefs.recurring_payments !== false) {
      const { rows: pendingPayments } = await pool.query(
        `SELECT id, name, amount, next_due_date
         FROM recurring_payments
         WHERE user_id = $1 AND status = 'active'
           AND next_due_date <= ($2::date + interval '2 days')
         LIMIT 5`,
        [userId, today]
      );

      for (const p of pendingPayments) {
        const { rows: dup } = await pool.query(
          `SELECT id FROM user_notifications
           WHERE user_id = $1 AND reference_type = 'recurring_payment' AND reference_id = $2
             AND created_at >= $3::date`,
          [userId, p.id, today]
        );
        if (dup.length === 0) {
          const res = await this.createNotification(userId, {
            title: `Payment due: ${p.name}`,
            message: `Recurring payment of ${p.amount} INR for "${p.name}" is due on ${p.next_due_date}.`,
            notificationType: 'payment_reminder',
            referenceType: 'recurring_payment',
            referenceId: p.id,
          });
          if (res.notification) created.push(res.notification);
        }
      }
    }

    return {
      message: `Reminders checked successfully. ${created.length} new reminder notifications generated.`,
      createdCount: created.length,
      notifications: created,
    };
  }
}

export const notificationsService = new NotificationsService();
