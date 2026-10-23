import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { getRequestTimezone } from '../commitments/commitments.controller';
import { sendSuccess } from '../../utils/response';

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
    sendSuccess(res, {
      status: 200,
      message: 'Dashboard overview retrieved successfully.',
      data: { dashboard },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Dashboard preferences retrieved successfully.',
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
    const preferences = await dashboardService.updatePreferences(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Dashboard preferences updated successfully.',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};
