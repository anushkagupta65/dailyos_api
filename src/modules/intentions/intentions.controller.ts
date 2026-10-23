import { Request, Response, NextFunction } from 'express';
import { intentionsService } from './intentions.service';
import { getRequestTimezone } from '../commitments/commitments.controller';
import { sendSuccess } from '../../utils/response';

export const createIntention = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const intention = await intentionsService.createIntention(
      req.user!.id,
      req.body,
      getRequestTimezone(req, res)
    );
    sendSuccess(res, {
      status: 201,
      message: 'Intention created successfully.',
      data: { intention },
    });
  } catch (err) {
    next(err);
  }
};

export const getIntentions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await intentionsService.getIntentions(req.user!.id, {
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 30,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Intentions retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getIntentionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const intention = await intentionsService.getIntentionById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Intention retrieved successfully.',
      data: { intention },
    });
  } catch (err) {
    next(err);
  }
};

export const updateIntention = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const intention = await intentionsService.updateIntention(
      req.user!.id,
      req.params.id as string,
      req.body.content
    );
    sendSuccess(res, {
      status: 200,
      message: 'Intention updated successfully.',
      data: { intention },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteIntention = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await intentionsService.deleteIntention(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Intention deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
