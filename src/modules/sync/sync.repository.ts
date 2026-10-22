import { PoolClient } from 'pg';
import { pool } from '../../config/database';

type Queryable = Pick<PoolClient, 'query'>;

export class SyncRepository {
  // ---------------- DEVICES ----------------
  async upsertDevice(
    db: Queryable,
    userId: string,
    data: {
      deviceId?: string;
      deviceName: string;
      platform: string;
      registrationInfo?: any;
    }
  ) {
    if (data.deviceId) {
      const { rows } = await db.query(
        `INSERT INTO user_devices (id, user_id, device_name, platform, registration_info, last_active_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           device_name = EXCLUDED.device_name,
           platform = EXCLUDED.platform,
           registration_info = EXCLUDED.registration_info,
           last_active_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [
          data.deviceId,
          userId,
          data.deviceName,
          data.platform,
          JSON.stringify(data.registrationInfo || {}),
        ]
      );
      return rows[0];
    }

    const { rows } = await db.query(
      `INSERT INTO user_devices (user_id, device_name, platform, registration_info, last_active_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        data.deviceName,
        data.platform,
        JSON.stringify(data.registrationInfo || {}),
      ]
    );
    return rows[0];
  }

  async getDeviceById(userId: string, deviceId: string) {
    const { rows } = await pool.query(
      `SELECT d.*, s.last_synced_at, s.last_server_version, s.sync_status
       FROM user_devices d
       LEFT JOIN user_sync_state s ON s.device_id = d.id AND s.user_id = d.user_id
       WHERE d.id = $1 AND d.user_id = $2`,
      [deviceId, userId]
    );
    return rows[0] || null;
  }

  async listDevices(userId: string) {
    const { rows } = await pool.query(
      `SELECT d.*, s.last_synced_at, s.last_server_version, s.sync_status
       FROM user_devices d
       LEFT JOIN user_sync_state s ON s.device_id = d.id AND s.user_id = d.user_id
       WHERE d.user_id = $1
       ORDER BY d.last_active_at DESC`,
      [userId]
    );
    return rows;
  }

  async updateDeviceActivity(db: Queryable, userId: string, deviceId: string) {
    await db.query(
      `UPDATE user_devices SET last_active_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [deviceId, userId]
    );
  }

  async deleteDevice(db: Queryable, userId: string, deviceId: string): Promise<boolean> {
    const res = await db.query(
      `DELETE FROM user_devices WHERE id = $1 AND user_id = $2`,
      [deviceId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- SYNC STATE ----------------
  async getSyncState(userId: string, deviceId: string, client?: Queryable) {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT * FROM user_sync_state WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );
    return rows[0] || null;
  }

  async upsertSyncState(
    db: Queryable,
    userId: string,
    deviceId: string,
    serverVersion: number,
    status: 'synced' | 'pending' | 'failed' = 'synced'
  ) {
    const { rows } = await db.query(
      `INSERT INTO user_sync_state (user_id, device_id, last_synced_at, last_server_version, sync_status, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, NOW())
       ON CONFLICT (user_id, device_id) DO UPDATE SET
         last_synced_at = NOW(),
         last_server_version = EXCLUDED.last_server_version,
         sync_status = EXCLUDED.sync_status,
         updated_at = NOW()
       RETURNING *`,
      [userId, deviceId, serverVersion, status]
    );
    return rows[0];
  }

  // ---------------- TOMBSTONES ----------------
  async recordTombstone(
    db: Queryable,
    userId: string,
    entityType: string,
    entityId: string
  ) {
    await db.query(
      `INSERT INTO user_sync_tombstones (user_id, entity_type, entity_id, deleted_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, entityType, entityId]
    );
  }

  async getTombstonesSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT entity_type, entity_id, deleted_at
       FROM user_sync_tombstones
       WHERE user_id = $1 AND deleted_at > $2
       ORDER BY deleted_at ASC`,
      [userId, since]
    );
    return rows;
  }

  // ---------------- DELTA FETCHES ----------------
  async getHabitsUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habits WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }

  async getHabitLogsUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM habit_logs WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }

  async getTasksUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM tasks WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }

  async getPrioritiesUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_priorities WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }

  async getIntentionsUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_intentions WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }

  async getNotesUpdatedSince(userId: string, since: string) {
    const { rows } = await pool.query(
      `SELECT * FROM notes WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [userId, since]
    );
    return rows;
  }
}

export const syncRepository = new SyncRepository();
