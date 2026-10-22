import { getTodayInTimezone } from '../../utils/date';
import { intentionsRepository } from './intentions.repository';

const duplicateError = (existingIntentionId?: string) => ({
  status: 409,
  message: 'An intention already exists for this date. Update the existing intention instead.',
  errors: [{ field: 'intentionDate', message: 'Duplicate intention for this date', existingIntentionId }],
});

export class IntentionsService {
  async createIntention(userId: string, data: any, timezone: string) {
    const intentionDate = data.intentionDate || getTodayInTimezone(timezone);

    const existing = await intentionsRepository.getIntentionByDate(userId, intentionDate);
    if (existing) {
      throw duplicateError(existing.id);
    }

    try {
      return await intentionsRepository.createIntention(userId, { intentionDate, content: data.content });
    } catch (err: any) {
      // A concurrent request created the same (user, date) first
      if (err && err.code === '23505') {
        const winner = await intentionsRepository.getIntentionByDate(userId, intentionDate);
        throw duplicateError(winner?.id);
      }
      throw err;
    }
  }

  async getIntentions(userId: string, filters: any) {
    return intentionsRepository.getIntentions(userId, filters);
  }

  async getIntentionById(userId: string, id: string) {
    const intention = await intentionsRepository.getIntentionById(userId, id);
    if (!intention) {
      throw { status: 404, message: 'Intention not found.' };
    }
    return intention;
  }

  async updateIntention(userId: string, id: string, content: string) {
    const intention = await intentionsRepository.updateIntention(userId, id, content);
    if (!intention) {
      throw { status: 404, message: 'Intention not found.' };
    }
    return intention;
  }

  async deleteIntention(userId: string, id: string) {
    const deleted = await intentionsRepository.deleteIntention(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Intention not found.' };
    }
    return { message: 'Intention deleted successfully.' };
  }

  /**
   * The intention for a single date (Dashboard aggregation).
   */
  async getIntentionForDate(userId: string, date: string) {
    return intentionsRepository.getIntentionByDate(userId, date);
  }
}

export const intentionsService = new IntentionsService();
