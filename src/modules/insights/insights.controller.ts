import { Request, Response, NextFunction } from 'express';
import { insightsService } from './insights.service';
import { sendSuccess } from '../../utils/response';

export const getDashboardInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getDashboardInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Dashboard insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getHabitInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getHabitInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Habit insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getTaskInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Task insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getReviewInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getReviewInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Review insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getFinancialInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getFinancialInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Financial insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getLearningInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getLearningInsights(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Learning insights retrieved successfully.',
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const reports = await insightsService.getReports(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Reports retrieved successfully.',
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await insightsService.getPreferences(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Insight preferences retrieved successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await insightsService.updatePreferences(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Insight preferences updated successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};

export const listSnapshots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await insightsService.listSnapshots(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Insight snapshots retrieved successfully.',
      data: { snapshots: result.snapshots },
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getSnapshotById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const snapshot = await insightsService.getSnapshotById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Insight snapshot retrieved successfully.',
      data: { snapshot },
    });
  } catch (err) {
    next(err);
  }
};

export const generateSnapshot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const snapshot = await insightsService.generateSnapshot(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Insight snapshot generated successfully.',
      data: { snapshot },
    });
  } catch (err) {
    next(err);
  }
};
