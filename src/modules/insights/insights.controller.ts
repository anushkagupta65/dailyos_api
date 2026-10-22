import { Request, Response, NextFunction } from 'express';
import { insightsService } from './insights.service';

export const getDashboardInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const insights = await insightsService.getDashboardInsights(req.user!.id, query);
    res.status(200).json(insights);
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
    res.status(200).json(insights);
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
    res.status(200).json(insights);
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
    res.status(200).json(insights);
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
    res.status(200).json(insights);
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
    res.status(200).json(insights);
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
    res.status(200).json(reports);
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
    res.status(200).json({ preferences });
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
    res.status(200).json({
      message: 'Insight preferences updated successfully.',
      preferences,
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
    res.status(200).json(result);
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
    res.status(200).json({ snapshot });
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
    res.status(201).json({
      message: 'Insight snapshot generated successfully.',
      snapshot,
    });
  } catch (err) {
    next(err);
  }
};
