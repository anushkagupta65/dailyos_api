import { Request, Response, NextFunction } from 'express';
import { commitmentsService } from './commitments.service';
import { resolveTimezone } from '../../utils/date';
import { sendSuccess } from '../../utils/response';

/**
 * The user's timezone comes from `?timezone=` or the `X-Timezone` header (IANA name),
 * falling back to UTC. Users have no stored timezone setting yet.
 */
export const getRequestTimezone = (req: Request, res: Response): string =>
  resolveTimezone(
    res.locals.validatedQuery?.timezone ?? (req.query.timezone as string | undefined),
    req.headers['x-timezone'] as string | undefined
  );

// ---------------- CATEGORIES ----------------
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await commitmentsService.getCategories(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Habit categories retrieved successfully.',
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await commitmentsService.createCategory(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Habit category created successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await commitmentsService.updateCategory(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit category updated successfully.',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteCategory(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Habit category deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- HABITS ----------------
export const createHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const habit = await commitmentsService.createHabit(
      req.user!.id,
      req.body,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 201,
      message: 'Habit created successfully.',
      data: { habit },
    });
  } catch (err) {
    next(err);
  }
};

export const getHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await commitmentsService.getHabits(req.user!.id, {
      categoryId: query.categoryId,
      status: query.status,
      habitType: query.habitType,
      frequencyType: query.frequencyType,
      trackingType: query.trackingType,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 50,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Habits retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getHabitById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const habit = await commitmentsService.getHabitById(
      req.user!.id,
      req.params.id as string,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit retrieved successfully.',
      data: { habit },
    });
  } catch (err) {
    next(err);
  }
};

export const updateHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const habit = await commitmentsService.updateHabit(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit updated successfully.',
      data: { habit },
    });
  } catch (err) {
    next(err);
  }
};

export const updateHabitStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const habit = await commitmentsService.updateHabitStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit status updated successfully.',
      data: { habit },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteHabit(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Habit deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- SCHEDULES ----------------
export const getSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.getSchedules(
      req.user!.id,
      req.params.id as string,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit schedules retrieved successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const createSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedule = await commitmentsService.createSchedule(
      req.user!.id,
      req.params.id as string,
      req.body,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 201,
      message: 'Habit schedule created successfully.',
      data: { schedule },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedule = await commitmentsService.updateSchedule(
      req.user!.id,
      req.params.id as string,
      req.params.scheduleId as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit schedule updated successfully.',
      data: { schedule },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteSchedule(
      req.user!.id,
      req.params.id as string,
      req.params.scheduleId as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Habit schedule deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGS ----------------
export const createLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const log = await commitmentsService.createLog(
      req.user!.id,
      req.params.id as string,
      req.body,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 201,
      message: 'Habit log created successfully.',
      data: { log },
    });
  } catch (err) {
    next(err);
  }
};

export const getHabitLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await commitmentsService.getHabitLogs(req.user!.id, req.params.id as string, {
      startDate: query.startDate,
      endDate: query.endDate,
      status: query.status,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 31,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Habit logs retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await commitmentsService.getAllLogs(
      req.user!.id,
      {
        habitId: query.habitId,
        startDate: query.startDate,
        endDate: query.endDate,
        status: query.status,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 100,
      },
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 200,
      message: 'All habit logs retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
      extra: { range: result.range },
    });
  } catch (err) {
    next(err);
  }
};

export const updateLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const log = await commitmentsService.updateLog(
      req.user!.id,
      req.params.id as string,
      req.params.logId as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit log updated successfully.',
      data: { log },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteLog(
      req.user!.id,
      req.params.id as string,
      req.params.logId as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Habit log deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- PROGRESS ----------------
export const getProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const progress = await commitmentsService.getProgress(
      req.user!.id,
      {
        startDate: query.startDate,
        endDate: query.endDate,
        period: query.period,
        date: query.date,
        habitId: query.habitId,
      },
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit progress retrieved successfully.',
      data: { progress },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- FLEXIBILITY ----------------
export const getFlexibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flexibility = await commitmentsService.getFlexibility(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Habit flexibility retrieved successfully.',
      data: { flexibility },
    });
  } catch (err) {
    next(err);
  }
};

export const createFlexibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flexibility = await commitmentsService.createFlexibility(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 201,
      message: 'Flexibility settings created successfully.',
      data: { flexibility },
    });
  } catch (err) {
    next(err);
  }
};

export const updateFlexibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flexibility = await commitmentsService.updateFlexibility(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Flexibility settings updated successfully.',
      data: { flexibility },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteFlexibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteFlexibility(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Flexibility settings deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- REMINDERS ----------------
export const getReminders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reminders = await commitmentsService.getReminders(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Habit reminders retrieved successfully.',
      data: { reminders },
    });
  } catch (err) {
    next(err);
  }
};

export const createReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reminder = await commitmentsService.createReminder(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 201,
      message: 'Habit reminder created successfully.',
      data: { reminder },
    });
  } catch (err) {
    next(err);
  }
};

export const updateReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reminder = await commitmentsService.updateReminder(
      req.user!.id,
      req.params.id as string,
      req.params.reminderId as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Habit reminder updated successfully.',
      data: { reminder },
    });
  } catch (err) {
    next(err);
  }
};

export const toggleReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reminder = await commitmentsService.updateReminder(
      req.user!.id,
      req.params.id as string,
      req.params.reminderId as string,
      { isEnabled: req.body.isEnabled }
    );
    sendSuccess(res, {
      status: 200,
      message: `Habit reminder ${reminder.is_enabled ? 'enabled' : 'disabled'} successfully.`,
      data: { reminder },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await commitmentsService.deleteReminder(
      req.user!.id,
      req.params.id as string,
      req.params.reminderId as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Habit reminder deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
