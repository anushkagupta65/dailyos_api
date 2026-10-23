import { Request, Response, NextFunction } from 'express';
import { prioritiesService } from './priorities.service';
import { getRequestTimezone } from '../commitments/commitments.controller';
import { sendSuccess } from '../../utils/response';

export const createPriority = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priority = await prioritiesService.createPriority(
      req.user!.id,
      req.body,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 201,
      message: 'Priority created successfully.',
      data: { priority },
    });
  } catch (err) {
    next(err);
  }
};

export const getPriorities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await prioritiesService.getPriorities(req.user!.id, {
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      isCompleted: query.isCompleted,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 30,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Priorities retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getPriorityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priority = await prioritiesService.getPriorityById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Priority retrieved successfully.',
      data: { priority },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePriority = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priority = await prioritiesService.updatePriority(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Priority updated successfully.',
      data: { priority },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePriorityCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priority = await prioritiesService.updateCompletion(
      req.user!.id,
      req.params.id as string,
      req.body.isCompleted
    );
    sendSuccess(res, {
      status: 200,
      message: `Priority marked as ${priority.is_completed ? 'completed' : 'incomplete'}.`,
      data: { priority },
    });
  } catch (err) {
    next(err);
  }
};

export const reorderPriorities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const priorities = await prioritiesService.reorderPriorities(
      req.user!.id,
      req.body.priorityDate,
      req.body.priorityIds
    );
    sendSuccess(res, {
      status: 200,
      message: 'Priorities reordered successfully.',
      data: { priorities },
    });
  } catch (err) {
    next(err);
  }
};

export const deletePriority = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await prioritiesService.deletePriority(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Priority deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
