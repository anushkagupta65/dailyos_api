import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service';

// ---------------- TASKS ----------------
export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await tasksService.createTask(req.user!.id, req.body);
    res.status(201).json({ message: 'Task created successfully.', task });
  } catch (err) {
    next(err);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await tasksService.getTasks(req.user!.id, {
      status: query.status,
      priority: query.priority,
      category: query.category,
      scheduledDate: query.scheduledDate,
      dueDate: query.dueDate,
      startDate: query.startDate,
      endDate: query.endDate,
      dateField: query.dateField,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await tasksService.getTaskById(req.user!.id, req.params.id as string);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await tasksService.updateTask(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Task updated successfully.', task });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { task, changed } = await tasksService.updateTaskStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
      req.body.note
    );
    res.status(200).json({
      message: changed ? 'Task status updated successfully.' : 'Task status is unchanged.',
      task,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.deleteTask(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- SUBTASKS ----------------
export const createSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subtask = await tasksService.createSubtask(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({ message: 'Subtask created successfully.', subtask });
  } catch (err) {
    next(err);
  }
};

export const updateSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subtask = await tasksService.updateSubtask(
      req.user!.id,
      req.params.id as string,
      req.params.subtaskId as string,
      req.body
    );
    res.status(200).json({ message: 'Subtask updated successfully.', subtask });
  } catch (err) {
    next(err);
  }
};

export const deleteSubtask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.deleteSubtask(
      req.user!.id,
      req.params.id as string,
      req.params.subtaskId as string
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- STATUS HISTORY ----------------
export const getStatusHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await tasksService.getStatusHistory(req.user!.id, req.params.id as string);
    res.status(200).json({ history });
  } catch (err) {
    next(err);
  }
};

// ---------------- RECURRING TASKS ----------------
export const createRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id || req.body.taskId;
    const recurrence = await tasksService.createRecurrence(req.user!.id, {
      ...req.body,
      taskId,
    });
    res.status(201).json({ message: 'Recurring task schedule created successfully.', recurrence });
  } catch (err) {
    next(err);
  }
};

export const getRecurrences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await tasksService.listRecurrences(req.user!.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getRecurrenceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recurrence = await tasksService.getRecurrenceById(req.user!.id, req.params.id as string);
    res.status(200).json({ recurrence });
  } catch (err) {
    next(err);
  }
};

export const getTaskRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recurrence = await tasksService.getRecurrenceByTaskId(req.user!.id, req.params.id as string);
    res.status(200).json({ recurrence });
  } catch (err) {
    next(err);
  }
};

export const updateRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recurrence = await tasksService.updateRecurrence(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.status(200).json({ message: 'Recurring task schedule updated successfully.', recurrence });
  } catch (err) {
    next(err);
  }
};

export const pauseRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.pauseRecurrence(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resumeRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.resumeRecurrence(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteRecurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.deleteRecurrence(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const generateRecurrenceOccurrence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.generateOccurrence(req.user!.id, req.params.id as string);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getRecurrenceHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await tasksService.getRecurrenceHistory(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
