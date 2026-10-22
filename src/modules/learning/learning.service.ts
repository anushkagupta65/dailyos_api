import { withTransaction } from '../../config/database';
import { addDays, diffInDays, getTodayInTimezone } from '../../utils/date';
import { learningRepository } from './learning.repository';

const validationError = (field: string, message: string) => ({
  status: 400,
  message: 'Validation failed',
  errors: [{ field, message }],
});

/**
 * Adds review status relative to the user's today.
 */
const withReviewStatus = (entry: any, today: string) => ({
  ...entry,
  is_overdue: entry.review_date !== null && entry.review_date < today,
  days_until_review: entry.review_date !== null ? diffInDays(today, entry.review_date) : null,
});

export class LearningService {
  // ---------------- HELPERS ----------------
  private async ensureEntry(userId: string, id: string) {
    const entry = await learningRepository.getEntryById(userId, id);
    if (!entry) {
      throw { status: 404, message: 'Learning entry not found.' };
    }
    return entry;
  }

  // ---------------- ENTRIES ----------------
  async createEntry(userId: string, data: any, timezone: string) {
    const learnedAt = data.learnedAt || getTodayInTimezone(timezone);
    if (data.reviewDate && data.reviewDate < learnedAt) {
      throw validationError('reviewDate', 'reviewDate must be on or after learnedAt');
    }
    return learningRepository.createEntry(userId, { ...data, learnedAt });
  }

  async getEntries(userId: string, filters: any) {
    return learningRepository.findEntries(userId, filters);
  }

  async searchEntries(userId: string, filters: any) {
    return learningRepository.findEntries(userId, filters);
  }

  async getEntryById(userId: string, id: string, timezone: string) {
    const entry = await this.ensureEntry(userId, id);
    const reviews = await learningRepository.getReviews(userId, id);
    return {
      ...withReviewStatus(entry, getTodayInTimezone(timezone)),
      review_count: reviews.length,
      last_reviewed_at: reviews[0]?.reviewed_at ?? null,
      reviews,
    };
  }

  async updateEntry(userId: string, id: string, data: any) {
    const existing = await this.ensureEntry(userId, id);
    const learnedAt = data.learnedAt ?? existing.learned_at;
    const reviewDate = data.reviewDate !== undefined ? data.reviewDate : existing.review_date;
    if (reviewDate && reviewDate < learnedAt) {
      throw validationError('reviewDate', 'reviewDate must be on or after learnedAt');
    }
    return learningRepository.updateEntry(userId, id, data);
  }

  async deleteEntry(userId: string, id: string) {
    const deleted = await learningRepository.deleteEntry(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Learning entry not found.' };
    }
    return { message: 'Learning entry deleted successfully.' };
  }

  /**
   * Entries due for review in the user's timezone. Without startDate/endDate the window is
   * today .. today + days, plus overdue entries unless includeOverdue is false.
   */
  async getUpcomingReviews(
    userId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      days?: number;
      includeOverdue?: boolean;
      page?: number;
      limit?: number;
    },
    timezone: string
  ) {
    const today = getTodayInTimezone(timezone);
    const toDate = filters.endDate ?? addDays(today, filters.days ?? 7);
    const fromDate = filters.startDate ?? (filters.includeOverdue === false ? today : undefined);

    if (fromDate && fromDate > toDate) {
      throw validationError('endDate', 'startDate must be on or before endDate');
    }

    const result = await learningRepository.getEntriesDueForReview(userId, {
      fromDate,
      toDate,
      page: filters.page,
      limit: filters.limit,
    });
    return {
      ...result,
      data: result.data.map((entry) => withReviewStatus(entry, today)),
      range: { startDate: fromDate ?? null, endDate: toDate, today, timezone },
    };
  }

  // ---------------- REVIEWS ----------------
  /**
   * Adds a review (previous reviews are never overwritten). When nextReviewDate is sent,
   * the entry's review_date is updated in the same transaction.
   */
  async createReview(userId: string, learningId: string, data: any) {
    const entry = await this.ensureEntry(userId, learningId);
    const { nextReviewDate, ...reviewData } = data;
    if (nextReviewDate && nextReviewDate < entry.learned_at) {
      throw validationError('nextReviewDate', 'nextReviewDate must be on or after the learning date');
    }

    return withTransaction(async (client) => {
      const review = await learningRepository.createReview(client, userId, learningId, reviewData);
      let updatedEntry = entry;
      if (nextReviewDate !== undefined) {
        updatedEntry = await learningRepository.updateEntry(
          userId,
          learningId,
          { reviewDate: nextReviewDate },
          client
        );
      }
      return { review, learning: updatedEntry };
    });
  }

  async getReviews(userId: string, learningId: string) {
    await this.ensureEntry(userId, learningId);
    return learningRepository.getReviews(userId, learningId);
  }

  async updateReview(userId: string, learningId: string, reviewId: string, data: any) {
    await this.ensureEntry(userId, learningId);
    const review = await learningRepository.updateReview(userId, learningId, reviewId, data);
    if (!review) {
      throw { status: 404, message: 'Learning review not found.' };
    }
    return review;
  }

  async deleteReview(userId: string, learningId: string, reviewId: string) {
    await this.ensureEntry(userId, learningId);
    const deleted = await learningRepository.deleteReview(userId, learningId, reviewId);
    if (!deleted) {
      throw { status: 404, message: 'Learning review not found.' };
    }
    return { message: 'Learning review deleted successfully.' };
  }
}

export const learningService = new LearningService();
