import { pool, withTransaction } from '../../config/database';
import { getTodayInTimezone } from '../../utils/date';
import { prioritiesRepository } from './priorities.repository';
import { MAX_PRIORITIES_PER_DAY } from './priorities.validation';

export class PrioritiesService {
  private async ensurePriority(userId: string, id: string) {
    const priority = await prioritiesRepository.getPriorityById(userId, id);
    if (!priority) {
      throw { status: 404, message: 'Priority not found.' };
    }
    return priority;
  }

  /**
   * Adds a priority at the end of the day's list. Runs in a transaction holding the user's
   * row lock (serializing concurrent requests), and the insert itself only succeeds while
   * the day is below the limit.
   */
  async createPriority(userId: string, data: any, timezone: string) {
    const priorityDate = data.priorityDate || getTodayInTimezone(timezone);

    return withTransaction(async (client) => {
      await prioritiesRepository.lockUser(client, userId);
      const priority = await prioritiesRepository.createPriorityIfBelowLimit(
        client,
        userId,
        { ...data, priorityDate },
        MAX_PRIORITIES_PER_DAY
      );
      if (!priority) {
        throw {
          status: 409,
          message: `You can set a maximum of ${MAX_PRIORITIES_PER_DAY} priorities per day.`,
        };
      }
      return priority;
    });
  }

  async getPriorities(userId: string, filters: any) {
    return prioritiesRepository.getPriorities(userId, filters);
  }

  async getPriorityById(userId: string, id: string) {
    return this.ensurePriority(userId, id);
  }

  async updatePriority(userId: string, id: string, data: any) {
    await this.ensurePriority(userId, id);
    return prioritiesRepository.updatePriority(userId, id, data);
  }

  async updateCompletion(userId: string, id: string, isCompleted: boolean) {
    const existing = await this.ensurePriority(userId, id);
    if (existing.is_completed === isCompleted) {
      return existing;
    }
    return prioritiesRepository.updatePriority(userId, id, {
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
    });
  }

  /**
   * Reorders a day's priorities. priorityIds must list exactly that day's priorities.
   */
  async reorderPriorities(userId: string, priorityDate: string, priorityIds: string[]) {
    return withTransaction(async (client) => {
      await prioritiesRepository.lockUser(client, userId);
      const existing = await prioritiesRepository.getPrioritiesForDate(client, userId, priorityDate);
      const existingIds = new Set(existing.map((p) => p.id));

      if (existing.length === 0) {
        throw { status: 404, message: 'No priorities found for this date.' };
      }
      if (priorityIds.length !== existing.length || !priorityIds.every((id) => existingIds.has(id))) {
        throw {
          status: 400,
          message: 'Validation failed',
          errors: [{ field: 'priorityIds', message: 'priorityIds must contain exactly the priorities for this date' }],
        };
      }

      for (const [index, id] of priorityIds.entries()) {
        await prioritiesRepository.setPriorityOrder(client, userId, id, index + 1);
      }
      return prioritiesRepository.getPrioritiesForDate(client, userId, priorityDate);
    });
  }

  /**
   * Deletes a priority and closes the gap in the remaining order for that day.
   */
  async deletePriority(userId: string, id: string) {
    const priority = await this.ensurePriority(userId, id);
    await withTransaction(async (client) => {
      await prioritiesRepository.lockUser(client, userId);
      await prioritiesRepository.deletePriority(client, userId, id);
      const remaining = await prioritiesRepository.getPrioritiesForDate(client, userId, priority.priority_date);
      for (const [index, p] of remaining.entries()) {
        if (p.priority_order !== index + 1) {
          await prioritiesRepository.setPriorityOrder(client, userId, p.id, index + 1);
        }
      }
    });
    return { message: 'Priority deleted successfully.' };
  }

  /**
   * Priorities for a single date (Dashboard aggregation).
   */
  async getPrioritiesForDate(userId: string, date: string) {
    return prioritiesRepository.getPrioritiesForDate(pool, userId, date);
  }
}

export const prioritiesService = new PrioritiesService();
