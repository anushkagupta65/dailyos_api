import { Request, Response, NextFunction } from 'express';
import { prioritiesService } from './priorities.service';
import { getRequestTimezone } from '../commitments/commitments.controller';

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
    res.status(201).json({ message: 'Priority created successfully.', priority });
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
    res.status(200).json(result);
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
    res.status(200).json({ priority });
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
    res.status(200).json({ message: 'Priority updated successfully.', priority });
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
    res.status(200).json({
      message: `Priority marked as ${priority.is_completed ? 'completed' : 'incomplete'}.`,
      priority,
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
    res.status(200).json({ message: 'Priorities reordered successfully.', priorities });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
