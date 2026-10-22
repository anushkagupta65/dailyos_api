import { withTransaction } from '../../config/database';
import {
  addDays,
  diffInDays,
  getPeriodRange,
  getTodayInTimezone,
  maxDate,
  minDate,
  Period,
  startOfWeek,
  endOfWeek,
  WEEKDAYS,
} from '../../utils/date';
import { commitmentsRepository } from './commitments.repository';
import {
  calculateProgress,
  findScheduleForDate,
  STREAK_LOOKBACK_DAYS,
} from './commitments.progress';

const MAX_RANGE_DAYS = 366;

const validationError = (field: string, message: string) => ({
  status: 400,
  message: 'Validation failed',
  errors: [{ field, message }],
});

const isUniqueViolation = (err: any) => err && err.code === '23505';

/**
 * Non-boolean habits must have a numeric target to measure progress against.
 */
const assertValidTarget = (trackingType: string, targetValue: number | null | undefined) => {
  if (trackingType !== 'boolean' && (targetValue === null || targetValue === undefined)) {
    throw validationError('targetValue', `targetValue is required for ${trackingType} habits`);
  }
};

const assertValidDateRange = (
  startDate: string,
  endDate: string | null | undefined,
  endField = 'endDate'
) => {
  if (endDate && endDate < startDate) {
    throw validationError(endField, `${endField} must be on or after the start date`);
  }
};

/**
 * Derives a log status when the client does not send one:
 * boolean habits are completed by logging; measurable habits compare actualValue to target.
 */
const deriveLogStatus = (habit: any, actualValue: number | null | undefined): string => {
  if (habit.tracking_type === 'boolean' || actualValue === null || actualValue === undefined) {
    return 'completed';
  }
  if (habit.target_value !== null && actualValue >= habit.target_value) return 'completed';
  return actualValue > 0 ? 'partial' : 'missed';
};

/**
 * Validates a merged schedule and normalizes fields that don't apply to its type.
 */
const normalizeSchedule = (schedule: any) => {
  const result = { ...schedule };

  if (result.scheduleType === 'selected_days') {
    if (!result.weekdays || result.weekdays.length === 0) {
      throw validationError('weekdays', 'At least one weekday is required for selected_days schedules');
    }
    if (result.intervalDays !== null && result.intervalDays !== undefined) {
      throw validationError('intervalDays', 'intervalDays is only allowed for interval schedules');
    }
    result.weekdays = WEEKDAYS.filter((day) => result.weekdays.includes(day));
    result.intervalDays = null;
  } else if (result.scheduleType === 'interval') {
    if (!result.intervalDays) {
      throw validationError('intervalDays', 'intervalDays is required for interval schedules');
    }
    if (result.weekdays && result.weekdays.length > 0) {
      throw validationError('weekdays', 'weekdays are only allowed for selected_days schedules');
    }
    result.weekdays = [];
  } else {
    if (result.weekdays && result.weekdays.length > 0) {
      throw validationError('weekdays', 'weekdays are only allowed for selected_days schedules');
    }
    if (result.intervalDays !== null && result.intervalDays !== undefined) {
      throw validationError('intervalDays', 'intervalDays is only allowed for interval schedules');
    }
    result.weekdays = [];
    result.intervalDays = null;
  }

  assertValidDateRange(result.effectiveFrom, result.effectiveUntil, 'effectiveUntil');
  return result;
};

const rangesOverlap = (
  aFrom: string,
  aUntil: string | null,
  bFrom: string,
  bUntil: string | null
) => (bUntil === null || aFrom <= bUntil) && (aUntil === null || bFrom <= aUntil);

export class CommitmentsService {
  // ---------------- HELPERS ----------------
  private async ensureHabit(userId: string, habitId: string) {
    const habit = await commitmentsRepository.getHabitById(userId, habitId);
    if (!habit) {
      throw { status: 404, message: 'Habit not found.' };
    }
    return habit;
  }

  private async ensureCategoryAccessible(userId: string, categoryId: string | null | undefined) {
    if (!categoryId) return;
    const category = await commitmentsRepository.getAccessibleCategory(userId, categoryId);
    if (!category) {
      throw { status: 404, message: 'Habit category not found.' };
    }
  }

  // ---------------- CATEGORIES ----------------
  async getCategories(userId: string) {
    return commitmentsRepository.getCategories(userId);
  }

  async createCategory(userId: string, data: any) {
    const duplicate = await commitmentsRepository.findCategoryByName(userId, data.name);
    if (duplicate) {
      throw { status: 409, message: 'A category with this name already exists.' };
    }
    return commitmentsRepository.createCategory(userId, data);
  }

  private async ensureEditableCategory(userId: string, id: string) {
    const category = await commitmentsRepository.getAccessibleCategory(userId, id);
    if (!category) {
      throw { status: 404, message: 'Habit category not found.' };
    }
    if (category.is_system) {
      throw { status: 403, message: 'System categories cannot be modified or deleted.' };
    }
    return category;
  }

  async updateCategory(userId: string, id: string, data: any) {
    await this.ensureEditableCategory(userId, id);
    if (data.name) {
      const duplicate = await commitmentsRepository.findCategoryByName(userId, data.name);
      if (duplicate && duplicate.id !== id) {
        throw { status: 409, message: 'A category with this name already exists.' };
      }
    }
    return commitmentsRepository.updateCategory(userId, id, data);
  }

  async deleteCategory(userId: string, id: string) {
    await this.ensureEditableCategory(userId, id);
    await commitmentsRepository.deleteCategory(userId, id);
    return { message: 'Habit category deleted successfully.' };
  }

  // ---------------- HABITS ----------------
  async createHabit(userId: string, data: any, timezone: string) {
    const startDate = data.startDate || getTodayInTimezone(timezone);
    assertValidDateRange(startDate, data.endDate);
    assertValidTarget(data.trackingType || 'boolean', data.targetValue);
    await this.ensureCategoryAccessible(userId, data.categoryId);

    return commitmentsRepository.createHabit(userId, { ...data, startDate });
  }

  async getHabits(userId: string, filters: any) {
    return commitmentsRepository.getHabits(userId, filters);
  }

  async getHabitById(userId: string, id: string, timezone: string) {
    const habit = await this.ensureHabit(userId, id);
    const [schedules, flexibility, reminders] = await Promise.all([
      commitmentsRepository.getSchedules(userId, id),
      commitmentsRepository.getFlexibility(userId, id),
      commitmentsRepository.getReminders(userId, id),
    ]);
    return {
      ...habit,
      current_schedule: findScheduleForDate(schedules, getTodayInTimezone(timezone)),
      schedules,
      flexibility,
      reminders,
    };
  }

  async updateHabit(userId: string, id: string, data: any) {
    const existing = await this.ensureHabit(userId, id);

    const startDate = data.startDate ?? existing.start_date;
    const endDate = data.endDate !== undefined ? data.endDate : existing.end_date;
    assertValidDateRange(startDate, endDate);

    const trackingType = data.trackingType ?? existing.tracking_type;
    const targetValue = data.targetValue !== undefined ? data.targetValue : existing.target_value;
    assertValidTarget(trackingType, targetValue);

    await this.ensureCategoryAccessible(userId, data.categoryId);

    // Historical logs are intentionally left untouched when a habit is edited.
    return commitmentsRepository.updateHabit(userId, id, data);
  }

  async updateHabitStatus(userId: string, id: string, status: string) {
    await this.ensureHabit(userId, id);
    return commitmentsRepository.updateHabitStatus(userId, id, status);
  }

  async deleteHabit(userId: string, id: string) {
    const deleted = await commitmentsRepository.deleteHabit(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Habit not found.' };
    }
    return { message: 'Habit deleted successfully.' };
  }

  // ---------------- SCHEDULES ----------------
  async getSchedules(userId: string, habitId: string, timezone: string) {
    await this.ensureHabit(userId, habitId);
    const schedules = await commitmentsRepository.getSchedules(userId, habitId);
    return {
      currentSchedule: findScheduleForDate(schedules, getTodayInTimezone(timezone)),
      schedules,
    };
  }

  /**
   * Creates a schedule. The first schedule starts at the habit's start date by default;
   * later ones start today and automatically close the open-ended schedule they replace,
   * so earlier days keep being evaluated against the schedule that applied at the time.
   */
  async createSchedule(userId: string, habitId: string, data: any, timezone: string) {
    const habit = await this.ensureHabit(userId, habitId);
    const existing = await commitmentsRepository.getSchedules(userId, habitId);

    const defaultFrom =
      existing.length === 0
        ? habit.start_date
        : maxDate(habit.start_date, getTodayInTimezone(timezone));
    const schedule = normalizeSchedule({
      ...data,
      effectiveFrom: data.effectiveFrom || defaultFrom,
      effectiveUntil: data.effectiveUntil ?? null,
    });

    const overlapping = existing.filter((s) =>
      rangesOverlap(schedule.effectiveFrom, schedule.effectiveUntil, s.effective_from, s.effective_until)
    );
    const toClose =
      overlapping.length === 1 &&
      overlapping[0].effective_until === null &&
      overlapping[0].effective_from < schedule.effectiveFrom
        ? overlapping[0]
        : null;

    if (overlapping.length > 0 && !toClose) {
      throw {
        status: 409,
        message: 'Schedule overlaps an existing schedule for this habit. Update or delete it instead.',
      };
    }

    return withTransaction(async (client) => {
      if (toClose) {
        await commitmentsRepository.closeSchedule(
          client,
          userId,
          toClose.id,
          addDays(schedule.effectiveFrom, -1)
        );
      }
      return commitmentsRepository.createSchedule(client, userId, habitId, schedule);
    });
  }

  async updateSchedule(userId: string, habitId: string, scheduleId: string, data: any) {
    await this.ensureHabit(userId, habitId);
    const existing = await commitmentsRepository.getScheduleById(userId, habitId, scheduleId);
    if (!existing) {
      throw { status: 404, message: 'Habit schedule not found.' };
    }

    // When the type changes, type-specific fields are not carried over from the old schedule.
    const typeChanged = data.scheduleType && data.scheduleType !== existing.schedule_type;
    const schedule = normalizeSchedule({
      scheduleType: data.scheduleType ?? existing.schedule_type,
      weekdays: data.weekdays ?? (typeChanged ? [] : existing.weekdays),
      intervalDays:
        data.intervalDays !== undefined
          ? data.intervalDays
          : typeChanged
            ? null
            : existing.interval_days,
      effectiveFrom: data.effectiveFrom ?? existing.effective_from,
      effectiveUntil: data.effectiveUntil !== undefined ? data.effectiveUntil : existing.effective_until,
    });

    const others = await commitmentsRepository.getSchedules(userId, habitId);
    const overlaps = others.some(
      (s) =>
        s.id !== scheduleId &&
        rangesOverlap(schedule.effectiveFrom, schedule.effectiveUntil, s.effective_from, s.effective_until)
    );
    if (overlaps) {
      throw { status: 409, message: 'Schedule overlaps an existing schedule for this habit.' };
    }

    return commitmentsRepository.updateSchedule(userId, habitId, scheduleId, schedule);
  }

  async deleteSchedule(userId: string, habitId: string, scheduleId: string) {
    await this.ensureHabit(userId, habitId);
    const deleted = await commitmentsRepository.deleteSchedule(userId, habitId, scheduleId);
    if (!deleted) {
      throw { status: 404, message: 'Habit schedule not found.' };
    }
    return { message: 'Habit schedule deleted successfully.' };
  }

  // ---------------- LOGS ----------------
  async createLog(userId: string, habitId: string, data: any, timezone: string) {
    const habit = await this.ensureHabit(userId, habitId);

    if (habit.status === 'archived') {
      throw { status: 409, message: 'Cannot log an archived habit.' };
    }
    if (data.logDate > getTodayInTimezone(timezone)) {
      throw validationError('logDate', 'Cannot log a habit for a future date');
    }
    if (data.logDate < habit.start_date || (habit.end_date && data.logDate > habit.end_date)) {
      throw validationError('logDate', "logDate must be within the habit's start and end dates");
    }

    const duplicateError = (existingLogId: string) => ({
      status: 409,
      message: 'A log already exists for this habit on this date. Update the existing log instead.',
      errors: [{ field: 'logDate', message: 'Duplicate log for this date', existingLogId }],
    });

    const existing = await commitmentsRepository.getLogByDate(userId, habitId, data.logDate);
    if (existing) {
      throw duplicateError(existing.id);
    }

    const status = data.status ?? deriveLogStatus(habit, data.actualValue);
    const completedAt =
      data.completedAt !== undefined
        ? data.completedAt
        : status === 'completed'
          ? new Date().toISOString()
          : null;

    try {
      return await commitmentsRepository.createLog(userId, habitId, {
        ...data,
        status,
        completedAt,
      });
    } catch (err) {
      // Concurrent request inserted the same (user, habit, date) first
      if (isUniqueViolation(err)) {
        const winner = await commitmentsRepository.getLogByDate(userId, habitId, data.logDate);
        throw duplicateError(winner?.id);
      }
      throw err;
    }
  }

  async getHabitLogs(userId: string, habitId: string, filters: any) {
    await this.ensureHabit(userId, habitId);
    return commitmentsRepository.getLogs(userId, { ...filters, habitId });
  }

  async getAllLogs(userId: string, filters: any, timezone: string) {
    if (filters.habitId) {
      await this.ensureHabit(userId, filters.habitId);
    }
    const today = getTodayInTimezone(timezone);
    const endDate = filters.endDate ?? (filters.startDate ? today : endOfWeek(today));
    const startDate = filters.startDate ?? startOfWeek(endDate);

    if (startDate > endDate) {
      throw validationError('endDate', 'startDate must be on or before endDate');
    }
    if (diffInDays(startDate, endDate) >= MAX_RANGE_DAYS) {
      throw validationError('endDate', `Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const result = await commitmentsRepository.getLogs(userId, { ...filters, startDate, endDate });
    return { ...result, range: { startDate, endDate, timezone } };
  }

  async updateLog(userId: string, habitId: string, logId: string, data: any) {
    const habit = await this.ensureHabit(userId, habitId);
    const existing = await commitmentsRepository.getLogById(userId, habitId, logId);
    if (!existing) {
      throw { status: 404, message: 'Habit log not found.' };
    }

    const payload = { ...data };
    if (payload.status === undefined && payload.actualValue !== undefined && habit.tracking_type !== 'boolean') {
      payload.status = deriveLogStatus(habit, payload.actualValue);
    }
    if (payload.status !== undefined && payload.completedAt === undefined) {
      if (payload.status !== 'completed') {
        payload.completedAt = null;
      } else if (!existing.completed_at) {
        payload.completedAt = new Date().toISOString();
      }
    }

    return commitmentsRepository.updateLog(userId, habitId, logId, payload);
  }

  async deleteLog(userId: string, habitId: string, logId: string) {
    await this.ensureHabit(userId, habitId);
    const deleted = await commitmentsRepository.deleteLog(userId, habitId, logId);
    if (!deleted) {
      throw { status: 404, message: 'Habit log not found.' };
    }
    return { message: 'Habit log deleted successfully.' };
  }

  // ---------------- PROGRESS ----------------
  /**
   * Builds progress for a date range in the user's timezone. Aggregates active habits,
   * or a single habit (any status) when habitId is given.
   */
  async getProgress(
    userId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      period?: Period;
      date?: string;
      habitId?: string;
    },
    timezone: string
  ) {
    const today = getTodayInTimezone(timezone);
    const period = filters.period || 'week';
    const anchor = filters.date || filters.startDate || filters.endDate || today;
    const periodRange = getPeriodRange(period, anchor);
    const startDate = filters.startDate ?? periodRange.startDate;
    const endDate = filters.endDate ?? periodRange.endDate;

    if (startDate > endDate) {
      throw validationError('endDate', 'startDate must be on or before endDate');
    }
    if (diffInDays(startDate, endDate) >= MAX_RANGE_DAYS) {
      throw validationError('endDate', `Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    let habits = await commitmentsRepository.getHabitsForUser(userId, filters.habitId);
    if (filters.habitId) {
      if (habits.length === 0) {
        throw { status: 404, message: 'Habit not found.' };
      }
    } else {
      habits = habits.filter((h) => h.status === 'active');
    }

    const progress = await this.calculateProgressForHabits(userId, habits, startDate, endDate, today);

    return {
      timezone,
      today,
      period: filters.startDate || filters.endDate ? 'custom' : period,
      startDate,
      endDate,
      ...progress,
    };
  }

  /**
   * Shared with the Dashboard module so both use identical progress rules.
   */
  async calculateProgressForHabits(
    userId: string,
    habits: any[],
    startDate: string,
    endDate: string,
    today: string
  ) {
    const habitIds = habits.map((h) => h.id);
    const [schedules, logs] = await Promise.all([
      commitmentsRepository.getSchedulesForHabits(userId, habitIds),
      commitmentsRepository.getLogsInRange(
        userId,
        habitIds,
        minDate(startDate, addDays(today, -STREAK_LOOKBACK_DAYS)),
        maxDate(endDate, today)
      ),
    ]);

    return calculateProgress({ habits, schedules, logs, startDate, endDate, today });
  }

  // ---------------- FLEXIBILITY ----------------
  async getFlexibility(userId: string, habitId: string) {
    await this.ensureHabit(userId, habitId);
    return commitmentsRepository.getFlexibility(userId, habitId);
  }

  async createFlexibility(userId: string, habitId: string, data: any) {
    await this.ensureHabit(userId, habitId);
    const existing = await commitmentsRepository.getFlexibility(userId, habitId);
    if (existing) {
      throw { status: 409, message: 'Flexibility settings already exist for this habit. Update them instead.' };
    }
    try {
      return await commitmentsRepository.createFlexibility(userId, habitId, data);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw { status: 409, message: 'Flexibility settings already exist for this habit. Update them instead.' };
      }
      throw err;
    }
  }

  async updateFlexibility(userId: string, habitId: string, data: any) {
    await this.ensureHabit(userId, habitId);
    const flexibility = await commitmentsRepository.updateFlexibility(userId, habitId, data);
    if (!flexibility) {
      throw { status: 404, message: 'Flexibility settings not found.' };
    }
    return flexibility;
  }

  async deleteFlexibility(userId: string, habitId: string) {
    await this.ensureHabit(userId, habitId);
    const deleted = await commitmentsRepository.deleteFlexibility(userId, habitId);
    if (!deleted) {
      throw { status: 404, message: 'Flexibility settings not found.' };
    }
    return { message: 'Flexibility settings deleted successfully.' };
  }

  // ---------------- REMINDERS ----------------
  async getReminders(userId: string, habitId: string) {
    await this.ensureHabit(userId, habitId);
    return commitmentsRepository.getReminders(userId, habitId);
  }

  async createReminder(userId: string, habitId: string, data: any) {
    await this.ensureHabit(userId, habitId);
    return commitmentsRepository.createReminder(userId, habitId, data);
  }

  async updateReminder(userId: string, habitId: string, reminderId: string, data: any) {
    await this.ensureHabit(userId, habitId);
    const reminder = await commitmentsRepository.updateReminder(userId, habitId, reminderId, data);
    if (!reminder) {
      throw { status: 404, message: 'Habit reminder not found.' };
    }
    return reminder;
  }

  async deleteReminder(userId: string, habitId: string, reminderId: string) {
    await this.ensureHabit(userId, habitId);
    const deleted = await commitmentsRepository.deleteReminder(userId, habitId, reminderId);
    if (!deleted) {
      throw { status: 404, message: 'Habit reminder not found.' };
    }
    return { message: 'Habit reminder deleted successfully.' };
  }
}

export const commitmentsService = new CommitmentsService();
