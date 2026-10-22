import { pool, withTransaction } from '../../config/database';
import { reviewsRepository } from './reviews.repository';
import { tasksRepository } from '../tasks/tasks.repository';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from '../../utils/date';

export class ReviewsService {
  private calculatePeriodEnd(reviewType: string, periodStart: string, providedEnd?: string): string {
    if (providedEnd) return providedEnd;
    if (reviewType === 'daily') return periodStart;
    if (reviewType === 'weekly') return endOfWeek(periodStart);
    if (reviewType === 'monthly') return endOfMonth(periodStart);
    return periodStart;
  }

  // ---------------- REVIEWS CRUD ----------------
  async createReview(userId: string, data: any) {
    const periodEnd = this.calculatePeriodEnd(data.reviewType, data.periodStart, data.periodEnd);

    // Prevent duplicate reviews for the same user, review type, and period start
    const existing = await reviewsRepository.findReviewByPeriod(userId, data.reviewType, data.periodStart);
    if (existing) {
      throw {
        status: 409,
        message: `A ${data.reviewType} review already exists for period starting on ${data.periodStart}. Please update the existing review.`,
      };
    }

    return withTransaction(async (client) => {
      const completedAt = data.status === 'completed' ? new Date().toISOString() : null;

      const review = await reviewsRepository.createReview(client, userId, {
        reviewType: data.reviewType,
        periodStart: data.periodStart,
        periodEnd,
        rating: data.rating,
        status: data.status || 'draft',
        summary: data.summary,
        completedAt,
      });

      // Insert details based on review type
      let details: any = null;
      const detailsData = data.details || {};

      if (data.reviewType === 'daily') {
        let intentionSnapshot = detailsData.intentionSnapshot;
        if (!intentionSnapshot) {
          intentionSnapshot = await reviewsRepository.getDailyIntentionForDate(userId, data.periodStart);
        }
        details = await reviewsRepository.upsertDailyDetails(client, review.id, {
          ...detailsData,
          intentionSnapshot,
        });
      } else if (data.reviewType === 'weekly') {
        details = await reviewsRepository.upsertWeeklyDetails(client, review.id, detailsData);
      } else if (data.reviewType === 'monthly') {
        details = await reviewsRepository.upsertMonthlyDetails(client, review.id, detailsData);
      }

      // Habit ratings
      const habitRatings = [];
      if (Array.isArray(data.habitRatings)) {
        for (const hr of data.habitRatings) {
          const res = await reviewsRepository.upsertHabitRating(client, review.id, hr.habitId, hr.rating, hr.notes);
          habitRatings.push(res);
        }
      }

      // Task ratings
      const taskRatings = [];
      if (Array.isArray(data.taskRatings)) {
        for (const tr of data.taskRatings) {
          const res = await reviewsRepository.upsertTaskRating(client, review.id, tr.taskId, tr.rating, tr.notes);
          taskRatings.push(res);
        }
      }

      // Actions
      const createdActions = [];
      if (Array.isArray(data.actions)) {
        for (const act of data.actions) {
          let linkedTaskId = act.linkedTaskId || null;
          if (act.createLinkedTask && !linkedTaskId) {
            const task = await tasksRepository.createTask(client, userId, {
              title: act.title,
              description: act.description,
              priority: act.priority || 'medium',
              status: 'inbox',
              dueDate: act.dueDate || null,
              source: 'review_action',
            });
            linkedTaskId = task.id;
          }
          const createdAct = await reviewsRepository.createAction(client, userId, review.id, {
            ...act,
            linkedTaskId,
          });
          createdActions.push(createdAct);
        }
      }

      return {
        ...review,
        details,
        habit_ratings: habitRatings,
        task_ratings: taskRatings,
        actions: createdActions,
      };
    });
  }

  async getReviewById(userId: string, id: string) {
    const review = await reviewsRepository.getReviewById(userId, id);
    if (!review) {
      throw { status: 404, message: 'Review not found.' };
    }

    let details: any = null;
    if (review.review_type === 'daily') {
      details = await reviewsRepository.getDailyDetails(review.id);
    } else if (review.review_type === 'weekly') {
      details = await reviewsRepository.getWeeklyDetails(review.id);
    } else if (review.review_type === 'monthly') {
      details = await reviewsRepository.getMonthlyDetails(review.id);
    }

    const [habitRatings, taskRatings, actions] = await Promise.all([
      reviewsRepository.getHabitRatings(review.id),
      reviewsRepository.getTaskRatings(review.id),
      reviewsRepository.getActionsForReview(review.id),
    ]);

    return {
      ...review,
      details,
      habit_ratings: habitRatings,
      task_ratings: taskRatings,
      actions,
    };
  }

  async listReviews(userId: string, filters: any) {
    return reviewsRepository.listReviews(userId, filters);
  }

  async updateReview(userId: string, id: string, data: any) {
    const existing = await reviewsRepository.getReviewById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Review not found.' };
    }

    return withTransaction(async (client) => {
      const completedAt = data.status === 'completed' && existing.status !== 'completed'
        ? new Date().toISOString()
        : data.status === 'draft'
        ? null
        : undefined;

      const review = await reviewsRepository.updateReview(client, userId, id, {
        rating: data.rating,
        status: data.status,
        summary: data.summary,
        completedAt,
      });

      let details: any = null;
      if (data.details) {
        if (existing.review_type === 'daily') {
          details = await reviewsRepository.upsertDailyDetails(client, id, data.details);
        } else if (existing.review_type === 'weekly') {
          details = await reviewsRepository.upsertWeeklyDetails(client, id, data.details);
        } else if (existing.review_type === 'monthly') {
          details = await reviewsRepository.upsertMonthlyDetails(client, id, data.details);
        }
      } else {
        if (existing.review_type === 'daily') {
          details = await reviewsRepository.getDailyDetails(id, client);
        } else if (existing.review_type === 'weekly') {
          details = await reviewsRepository.getWeeklyDetails(id, client);
        } else if (existing.review_type === 'monthly') {
          details = await reviewsRepository.getMonthlyDetails(id, client);
        }
      }

      const [habitRatings, taskRatings, actions] = await Promise.all([
        reviewsRepository.getHabitRatings(id, client),
        reviewsRepository.getTaskRatings(id, client),
        reviewsRepository.getActionsForReview(id, client),
      ]);

      return {
        ...review,
        details,
        habit_ratings: habitRatings,
        task_ratings: taskRatings,
        actions,
      };
    });
  }

  async completeReview(userId: string, id: string) {
    const existing = await reviewsRepository.getReviewById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Review not found.' };
    }

    const completed = await reviewsRepository.completeReview(pool, userId, id);
    return this.getReviewById(userId, id);
  }

  async deleteReview(userId: string, id: string) {
    const existing = await reviewsRepository.getReviewById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Review not found.' };
    }
    await reviewsRepository.deleteReview(userId, id);
    return { success: true, message: 'Review deleted successfully.' };
  }

  // ---------------- RATINGS ----------------
  async addHabitRatings(userId: string, reviewId: string, ratings: any[]) {
    const review = await reviewsRepository.getReviewById(userId, reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found.' };
    }

    return withTransaction(async (client) => {
      const results = [];
      for (const r of ratings) {
        const res = await reviewsRepository.upsertHabitRating(client, reviewId, r.habitId, r.rating, r.notes);
        results.push(res);
      }
      return reviewsRepository.getHabitRatings(reviewId, client);
    });
  }

  async addTaskRatings(userId: string, reviewId: string, ratings: any[]) {
    const review = await reviewsRepository.getReviewById(userId, reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found.' };
    }

    return withTransaction(async (client) => {
      const results = [];
      for (const r of ratings) {
        const res = await reviewsRepository.upsertTaskRating(client, reviewId, r.taskId, r.rating, r.notes);
        results.push(res);
      }
      return reviewsRepository.getTaskRatings(reviewId, client);
    });
  }

  async getRatings(userId: string, reviewId: string) {
    const review = await reviewsRepository.getReviewById(userId, reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found.' };
    }
    const [habitRatings, taskRatings] = await Promise.all([
      reviewsRepository.getHabitRatings(reviewId),
      reviewsRepository.getTaskRatings(reviewId),
    ]);
    return { habitRatings, taskRatings };
  }

  // ---------------- ACTIONS ----------------
  async createAction(userId: string, reviewId: string, data: any) {
    const review = await reviewsRepository.getReviewById(userId, reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found.' };
    }

    return withTransaction(async (client) => {
      let linkedTaskId = data.linkedTaskId || null;
      if (data.createLinkedTask && !linkedTaskId) {
        const task = await tasksRepository.createTask(client, userId, {
          title: data.title,
          description: data.description,
          priority: data.priority || 'medium',
          status: 'inbox',
          dueDate: data.dueDate || null,
          source: 'review_action',
        });
        linkedTaskId = task.id;
      }
      return reviewsRepository.createAction(client, userId, reviewId, {
        ...data,
        linkedTaskId,
      });
    });
  }

  async listActions(userId: string, filters: any) {
    return reviewsRepository.listActions(userId, filters);
  }

  async getOpenActions(userId: string, filters: any) {
    return reviewsRepository.listActions(userId, { ...filters, openOnly: true });
  }

  async getActionById(userId: string, actionId: string) {
    const action = await reviewsRepository.getActionById(userId, actionId);
    if (!action) {
      throw { status: 404, message: 'Action not found.' };
    }
    return action;
  }

  async updateAction(userId: string, actionId: string, data: any) {
    const existing = await reviewsRepository.getActionById(userId, actionId);
    if (!existing) {
      throw { status: 404, message: 'Action not found.' };
    }

    return withTransaction(async (client) => {
      let completedAt = data.completedAt;
      if (data.status === 'completed' && existing.status !== 'completed' && !completedAt) {
        completedAt = new Date().toISOString();
      } else if (data.status && data.status !== 'completed') {
        completedAt = null;
      }

      return reviewsRepository.updateAction(client, userId, actionId, {
        ...data,
        completedAt,
      });
    });
  }

  async updateActionStatus(userId: string, actionId: string, status: string) {
    const existing = await reviewsRepository.getActionById(userId, actionId);
    if (!existing) {
      throw { status: 404, message: 'Action not found.' };
    }
    return reviewsRepository.updateActionStatus(pool, userId, actionId, status);
  }

  async deleteAction(userId: string, actionId: string) {
    const existing = await reviewsRepository.getActionById(userId, actionId);
    if (!existing) {
      throw { status: 404, message: 'Action not found.' };
    }
    await reviewsRepository.deleteAction(userId, actionId);
    return { success: true, message: 'Action deleted successfully.' };
  }

  // ---------------- SUMMARY GENERATION ----------------
  async generateSummary(userId: string, query: { type: 'weekly' | 'monthly'; date?: string; startDate?: string; endDate?: string }) {
    const anchor = query.date || query.startDate || new Date().toISOString().slice(0, 10);
    const startDate = query.startDate || (query.type === 'weekly' ? startOfWeek(anchor) : startOfMonth(anchor));
    const endDate = query.endDate || (query.type === 'weekly' ? endOfWeek(anchor) : endOfMonth(anchor));

    const [
      dailyReviews,
      tasksActivity,
      habitLogsCompletedCount,
      priorities,
      intentions,
      learnings,
      financeSummary,
    ] = await Promise.all([
      reviewsRepository.getDailyReviewsInRange(userId, startDate, endDate),
      reviewsRepository.getTasksActivityInRange(userId, startDate, endDate),
      reviewsRepository.getHabitLogsCountInRange(userId, startDate, endDate),
      reviewsRepository.getDailyPrioritiesInRange(userId, startDate, endDate),
      reviewsRepository.getDailyIntentionsInRange(userId, startDate, endDate),
      reviewsRepository.getLearningEntriesInRange(userId, startDate, endDate),
      reviewsRepository.getFinancialTransactionsSummaryInRange(userId, startDate, endDate),
    ]);

    // Calculate aggregated review rating
    const ratedReviews = dailyReviews.filter((r) => r.rating !== null && r.rating !== undefined);
    const avgDailyRating = ratedReviews.length > 0
      ? Number((ratedReviews.reduce((sum, r) => sum + Number(r.rating), 0) / ratedReviews.length).toFixed(1))
      : null;

    // Task stats
    const totalTasks = tasksActivity.length;
    const completedTasks = tasksActivity.filter((t) => t.status === 'completed');
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Priority stats
    const totalPriorities = priorities.length;
    const completedPriorities = priorities.filter((p) => p.is_completed);
    const priorityCompletionRate = totalPriorities > 0
      ? Math.round((completedPriorities.length / totalPriorities) * 100)
      : 0;

    // Finance aggregations
    const financeTotals = {
      income: 0,
      expense: 0,
      investment: 0,
      savings: 0,
    };
    for (const row of financeSummary) {
      const type = row.transaction_type as keyof typeof financeTotals;
      if (financeTotals[type] !== undefined) {
        financeTotals[type] = Number(row.total_amount);
      }
    }

    // Synthesize wins, blockers, reflections
    const winsCollected = dailyReviews
      .map((r) => r.what_went_well)
      .filter((w): w is string => Boolean(w && w.trim()));

    const blockersCollected = dailyReviews
      .map((r) => r.what_got_in_the_way)
      .filter((b): b is string => Boolean(b && b.trim()));

    const reflectionsCollected = dailyReviews
      .map((r) => r.reflections)
      .filter((rf): rf is string => Boolean(rf && rf.trim()));

    const moneyReflectionsCollected = dailyReviews
      .map((r) => r.money_reflection)
      .filter((m): m is string => Boolean(m && m.trim()));

    return {
      period: {
        type: query.type,
        startDate,
        endDate,
      },
      daily_reviews_count: dailyReviews.length,
      average_daily_rating: avgDailyRating,
      daily_reviews: dailyReviews,
      habits: {
        completed_logs_count: habitLogsCompletedCount,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks.length,
        completion_rate_percentage: completionRate,
        completed_items: completedTasks.map((t) => ({ id: t.id, title: t.title })),
      },
      priorities: {
        total: totalPriorities,
        completed: completedPriorities.length,
        completion_rate_percentage: priorityCompletionRate,
      },
      intentions: intentions.map((i) => ({ date: i.intention_date, content: i.content })),
      learnings: {
        count: learnings.length,
        items: learnings,
      },
      finances: {
        income: financeTotals.income,
        expense: financeTotals.expense,
        investment: financeTotals.investment,
        savings: financeTotals.savings,
        net_savings: Number((financeTotals.income - financeTotals.expense).toFixed(2)),
      },
      synthesized_suggestions: {
        wins: winsCollected.slice(0, 5),
        recurring_blockers: blockersCollected.slice(0, 5),
        reflections: reflectionsCollected.slice(0, 5),
        money_reflections: moneyReflectionsCollected.slice(0, 5),
      },
    };
  }
}

export const reviewsService = new ReviewsService();
