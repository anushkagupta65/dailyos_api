import { withTransaction, pool } from '../../config/database';
import { syncRepository } from './sync.repository';
import { toDateString } from '../../utils/date';

export class SyncService {
  // ---------------- DEVICES ----------------
  async registerDevice(
    userId: string,
    data: {
      deviceId?: string;
      deviceName: string;
      platform: string;
      registrationInfo?: any;
    }
  ) {
    return withTransaction(async (client) => {
      const device = await syncRepository.upsertDevice(client, userId, data);
      const syncState = await syncRepository.upsertSyncState(
        client,
        userId,
        device.id,
        Date.now(),
        'synced'
      );
      return { device, syncState };
    });
  }

  async getDevice(userId: string, deviceId: string) {
    const device = await syncRepository.getDeviceById(userId, deviceId);
    if (!device) {
      throw { status: 404, message: 'Device not found.' };
    }
    return device;
  }

  async listDevices(userId: string) {
    return syncRepository.listDevices(userId);
  }

  async deleteDevice(userId: string, deviceId: string) {
    await this.getDevice(userId, deviceId);
    return withTransaction(async (client) => {
      await syncRepository.deleteDevice(client, userId, deviceId);
      return { message: 'Device unregistered successfully.' };
    });
  }

  // ---------------- SYNC STATUS ----------------
  async getSyncStatus(userId: string, deviceId: string) {
    await this.getDevice(userId, deviceId);
    const syncState = await syncRepository.getSyncState(userId, deviceId);
    return {
      deviceId,
      syncState: syncState || {
        last_synced_at: null,
        last_server_version: 0,
        sync_status: 'pending',
      },
      serverTime: new Date().toISOString(),
      currentServerVersion: Date.now(),
    };
  }

  // ---------------- INCREMENTAL PULL ----------------
  async pull(
    userId: string,
    payload: {
      deviceId: string;
      lastServerVersion?: number;
      since?: string;
    }
  ) {
    const device = await this.getDevice(userId, payload.deviceId);

    let sinceTimestamp = payload.since;
    if (!sinceTimestamp) {
      if (payload.lastServerVersion && payload.lastServerVersion > 0) {
        sinceTimestamp = new Date(payload.lastServerVersion).toISOString();
      } else if (device.last_synced_at) {
        sinceTimestamp = new Date(device.last_synced_at).toISOString();
      } else {
        sinceTimestamp = '1970-01-01T00:00:00.000Z';
      }
    }

    const [
      habits,
      habitLogs,
      tasks,
      priorities,
      intentions,
      notes,
      deletions,
    ] = await Promise.all([
      syncRepository.getHabitsUpdatedSince(userId, sinceTimestamp),
      syncRepository.getHabitLogsUpdatedSince(userId, sinceTimestamp),
      syncRepository.getTasksUpdatedSince(userId, sinceTimestamp),
      syncRepository.getPrioritiesUpdatedSince(userId, sinceTimestamp),
      syncRepository.getIntentionsUpdatedSince(userId, sinceTimestamp),
      syncRepository.getNotesUpdatedSince(userId, sinceTimestamp),
      syncRepository.getTombstonesSince(userId, sinceTimestamp),
    ]);

    const serverVersion = Date.now();
    const serverTime = new Date().toISOString();

    await withTransaction(async (client) => {
      await syncRepository.upsertSyncState(client, userId, device.id, serverVersion, 'synced');
      await syncRepository.updateDeviceActivity(client, userId, device.id);
    });

    return {
      serverVersion,
      serverTime,
      syncStatus: 'synced',
      since: sinceTimestamp,
      changes: {
        habits,
        habitLogs,
        tasks,
        dailyPriorities: priorities,
        dailyIntentions: intentions,
        notes,
      },
      deletions,
    };
  }

  // ---------------- INCREMENTAL PUSH ----------------
  async push(
    userId: string,
    payload: {
      deviceId: string;
      changes: Array<{
        entityType: string;
        action: 'create' | 'update' | 'delete';
        id?: string;
        clientId?: string;
        clientUpdatedAt?: string;
        data?: any;
      }>;
    }
  ) {
    const device = await this.getDevice(userId, payload.deviceId);
    const serverVersion = Date.now();
    const serverTime = new Date().toISOString();
    const results: any[] = [];
    const conflicts: any[] = [];

    await withTransaction(async (client) => {
      for (const change of payload.changes) {
        const { entityType, action, id, clientId, clientUpdatedAt, data = {} } = change;

        try {
          // 1. CREATE
          if (action === 'create') {
            const result = await this.applyCreate(client, userId, entityType, id, data);
            results.push({
              clientId,
              serverId: result.id,
              entityType,
              action: 'create',
              status: 'success',
              updatedAt: serverTime,
            });
            continue;
          }

          // 2. UPDATE
          if (action === 'update') {
            if (!id) {
              results.push({
                clientId,
                entityType,
                action: 'update',
                status: 'error',
                message: 'Record id is required for update action.',
              });
              continue;
            }

            // Conflict detection
            const existing = await this.fetchExistingForConflict(client, userId, entityType, id);
            if (!existing) {
              // Record doesn't exist on server; treat as created
              const result = await this.applyCreate(client, userId, entityType, id, data);
              results.push({
                clientId,
                serverId: result.id,
                entityType,
                action: 'create_fallback',
                status: 'success',
                updatedAt: serverTime,
              });
              continue;
            }

            const serverUpdatedAt = new Date(existing.updated_at).toISOString();
            if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
              // Server has newer updates made from another device -> Conflict!
              conflicts.push({
                clientId,
                serverId: id,
                entityType,
                conflict: 'server_newer',
                serverUpdatedAt,
                clientUpdatedAt,
                serverRecord: existing,
              });
              // Last-write-wins: server keeps its version, notify client
              results.push({
                clientId,
                serverId: id,
                entityType,
                action: 'update',
                status: 'conflict',
                message: 'Conflict detected: Server has newer changes. Server version preserved.',
              });
              continue;
            }

            // Apply update
            await this.applyUpdate(client, userId, entityType, id, data);
            results.push({
              clientId,
              serverId: id,
              entityType,
              action: 'update',
              status: 'success',
              updatedAt: serverTime,
            });
            continue;
          }

          // 3. DELETE
          if (action === 'delete') {
            if (!id) {
              results.push({
                clientId,
                entityType,
                action: 'delete',
                status: 'error',
                message: 'Record id is required for delete action.',
              });
              continue;
            }

            await this.applyDelete(client, userId, entityType, id);
            await syncRepository.recordTombstone(client, userId, entityType, id);
            results.push({
              clientId,
              serverId: id,
              entityType,
              action: 'delete',
              status: 'success',
            });
            continue;
          }
        } catch (err: any) {
          results.push({
            clientId,
            serverId: id,
            entityType,
            action,
            status: 'error',
            message: err.message || 'Operation failed',
          });
        }
      }

      await syncRepository.upsertSyncState(client, userId, device.id, serverVersion, 'synced');
      await syncRepository.updateDeviceActivity(client, userId, device.id);
    });

    return {
      serverVersion,
      serverTime,
      syncStatus: 'synced',
      totalApplied: results.filter((r) => r.status === 'success').length,
      results,
      conflicts,
    };
  }

  // ---------------- APPLY HELPERS ----------------
  private async applyCreate(
    client: any,
    userId: string,
    entityType: string,
    id: string | undefined,
    data: any
  ) {
    switch (entityType) {
      case 'tasks': {
        const { rows } = await client.query(
          `INSERT INTO tasks (id, user_id, title, description, category, priority, status, scheduled_date, due_date, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [
            id || null,
            userId,
            data.title || 'Untitled Task',
            data.description || null,
            data.category || null,
            data.priority || 'medium',
            data.status || 'inbox',
            data.scheduledDate ? toDateString(data.scheduledDate) : null,
            data.dueDate ? toDateString(data.dueDate) : null,
          ]
        );
        return rows[0];
      }
      case 'habits': {
        const { rows } = await client.query(
          `INSERT INTO habits (id, user_id, name, description, habit_type, frequency_type, start_date, status, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [
            id || null,
            userId,
            data.name || 'Untitled Habit',
            data.description || null,
            data.habitType || 'positive',
            data.frequencyType || 'daily',
            data.startDate ? toDateString(data.startDate) : toDateString(new Date()),
            data.status || 'active',
          ]
        );
        return rows[0];
      }
      case 'notes': {
        const { rows } = await client.query(
          `INSERT INTO notes (id, user_id, title, content, note_type, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [
            id || null,
            userId,
            data.title || 'Untitled Note',
            data.content || null,
            data.noteType || 'general',
          ]
        );
        return rows[0];
      }
      case 'habit_logs': {
        const { rows } = await client.query(
          `INSERT INTO habit_logs (id, user_id, habit_id, log_date, status, actual_value, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id, habit_id, log_date) DO UPDATE SET
             status = EXCLUDED.status,
             actual_value = EXCLUDED.actual_value,
             updated_at = NOW()
           RETURNING id`,
          [
            id || null,
            userId,
            data.habitId,
            toDateString(data.logDate),
            data.status || 'completed',
            data.actualValue || null,
          ]
        );
        return rows[0];
      }
      case 'daily_priorities': {
        const { rows } = await client.query(
          `INSERT INTO daily_priorities (id, user_id, priority_date, title, priority_order, is_completed, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [
            id || null,
            userId,
            toDateString(data.priorityDate),
            data.title || 'Priority',
            data.priorityOrder || 1,
            data.isCompleted || false,
          ]
        );
        return rows[0];
      }
      case 'daily_intentions': {
        const { rows } = await client.query(
          `INSERT INTO daily_intentions (id, user_id, intention_date, content, updated_at)
           VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, NOW())
           ON CONFLICT (user_id, intention_date) DO UPDATE SET
             content = EXCLUDED.content,
             updated_at = NOW()
           RETURNING id`,
          [
            id || null,
            userId,
            toDateString(data.intentionDate),
            data.content || '',
          ]
        );
        return rows[0];
      }
      default:
        throw new Error(`Unsupported entity type for create: ${entityType}`);
    }
  }

  private async fetchExistingForConflict(
    client: any,
    userId: string,
    entityType: string,
    id: string
  ) {
    const tableMap: Record<string, string> = {
      tasks: 'tasks',
      habits: 'habits',
      notes: 'notes',
      habit_logs: 'habit_logs',
      daily_priorities: 'daily_priorities',
      daily_intentions: 'daily_intentions',
    };
    const table = tableMap[entityType];
    if (!table) return null;

    const { rows } = await client.query(
      `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  private async applyUpdate(
    client: any,
    userId: string,
    entityType: string,
    id: string,
    data: any
  ) {
    switch (entityType) {
      case 'tasks': {
        await client.query(
          `UPDATE tasks
           SET title = COALESCE($1, title),
               description = COALESCE($2, description),
               status = COALESCE($3, status),
               priority = COALESCE($4, priority),
               scheduled_date = COALESCE($5, scheduled_date),
               due_date = COALESCE($6, due_date),
               updated_at = NOW()
           WHERE id = $7 AND user_id = $8`,
          [
            data.title || null,
            data.description !== undefined ? data.description : null,
            data.status || null,
            data.priority || null,
            data.scheduledDate ? toDateString(data.scheduledDate) : null,
            data.dueDate ? toDateString(data.dueDate) : null,
            id,
            userId,
          ]
        );
        break;
      }
      case 'habits': {
        await client.query(
          `UPDATE habits
           SET name = COALESCE($1, name),
               description = COALESCE($2, description),
               status = COALESCE($3, status),
               updated_at = NOW()
           WHERE id = $4 AND user_id = $5`,
          [data.name || null, data.description || null, data.status || null, id, userId]
        );
        break;
      }
      case 'notes': {
        await client.query(
          `UPDATE notes
           SET title = COALESCE($1, title),
               content = COALESCE($2, content),
               updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [data.title || null, data.content !== undefined ? data.content : null, id, userId]
        );
        break;
      }
      case 'habit_logs': {
        await client.query(
          `UPDATE habit_logs
           SET status = COALESCE($1, status),
               actual_value = COALESCE($2, actual_value),
               updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [data.status || null, data.actualValue || null, id, userId]
        );
        break;
      }
      case 'daily_priorities': {
        await client.query(
          `UPDATE daily_priorities
           SET title = COALESCE($1, title),
               is_completed = COALESCE($2, is_completed),
               updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [data.title || null, data.isCompleted !== undefined ? data.isCompleted : null, id, userId]
        );
        break;
      }
      case 'daily_intentions': {
        await client.query(
          `UPDATE daily_intentions
           SET content = COALESCE($1, content),
               updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [data.content || null, id, userId]
        );
        break;
      }
      default:
        break;
    }
  }

  private async applyDelete(
    client: any,
    userId: string,
    entityType: string,
    id: string
  ) {
    const tableMap: Record<string, string> = {
      tasks: 'tasks',
      habits: 'habits',
      notes: 'notes',
      habit_logs: 'habit_logs',
      daily_priorities: 'daily_priorities',
      daily_intentions: 'daily_intentions',
    };
    const table = tableMap[entityType];
    if (table) {
      await client.query(`DELETE FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
    }
  }
}

export const syncService = new SyncService();
