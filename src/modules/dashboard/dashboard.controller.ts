import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { getRequestTimezone } from '../commitments/commitments.controller';

// ---------------- OVERVIEW ----------------
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const dashboard = await dashboardService.getOverview(
      req.user!.id,
      { date: query.date, period: query.period },
      getRequestTimezone(req, res)
    );
    res.status(200).json({ dashboard });
  } catch (err) {
    next(err);
  }
};

// ---------------- PREFERENCES ----------------
export const getPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preferences = await dashboardService.getPreferences(req.user!.id);
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
    const preferences = await dashboardService.updatePreferences(req.user!.id, req.body);
    res.status(200).json({ message: 'Dashboard preferences updated successfully.', preferences });
  } catch (err) {
    next(err);
  }
};
