import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service';
import { sendSuccess } from '../../utils/response';

// ---------------- TASKS ----------------
export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await tasksService.createTask(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Task created successfully.',
      data: { task },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Tasks retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Task retrieved successfully.',
      data: { task },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Task updated successfully.',
      data: { task },
    });
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
    sendSuccess(res, {
      status: 200,
      message: changed ? 'Task status updated successfully.' : 'Task status is unchanged.',
      data: { task },
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Task deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 201,
      message: 'Subtask created successfully.',
      data: { subtask },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Subtask updated successfully.',
      data: { subtask },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Subtask deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Task status history retrieved successfully.',
      data: { history },
    });
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
    sendSuccess(res, {
      status: 201,
      message: 'Recurring task schedule created successfully.',
      data: { recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Recurring task schedules retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Recurring task schedule retrieved successfully.',
      data: { recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Task recurrence retrieved successfully.',
      data: { recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Recurring task schedule updated successfully.',
      data: { recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Recurring task schedule paused successfully.',
      data: { recurrence: result.recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Recurring task schedule resumed successfully.',
      data: { recurrence: result.recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Recurring task schedule deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 201,
      message: result.message || 'Task occurrence generated successfully.',
      data: { task: result.task, recurrence: result.recurrence },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Recurrence occurrence history retrieved successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
