import { Request, Response, NextFunction } from 'express';
import { commitmentsService } from './commitments.service';
import { resolveTimezone } from '../../utils/date';

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
    res.status(200).json({ categories });
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
    res.status(201).json({ message: 'Habit category created successfully.', category });
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
    res.status(200).json({ message: 'Habit category updated successfully.', category });
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
    res.status(200).json(result);
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
    res.status(201).json({ message: 'Habit created successfully.', habit });
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
    res.status(200).json(result);
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
    res.status(200).json({ habit });
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
    res.status(200).json({ message: 'Habit updated successfully.', habit });
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
    res.status(200).json({ message: 'Habit status updated successfully.', habit });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(201).json({ message: 'Habit schedule created successfully.', schedule });
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
    res.status(200).json({ message: 'Habit schedule updated successfully.', schedule });
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
    res.status(200).json(result);
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
    res.status(201).json({ message: 'Habit log created successfully.', log });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(200).json({ message: 'Habit log updated successfully.', log });
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
    res.status(200).json(result);
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
    res.status(200).json({ progress });
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
    res.status(200).json({ flexibility });
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
    res.status(201).json({ message: 'Flexibility settings created successfully.', flexibility });
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
    res.status(200).json({ message: 'Flexibility settings updated successfully.', flexibility });
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
    res.status(200).json(result);
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
    res.status(200).json({ reminders });
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
    res.status(201).json({ message: 'Habit reminder created successfully.', reminder });
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
    res.status(200).json({ message: 'Habit reminder updated successfully.', reminder });
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
    res.status(200).json({
      message: `Habit reminder ${reminder.is_enabled ? 'enabled' : 'disabled'} successfully.`,
      reminder,
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
