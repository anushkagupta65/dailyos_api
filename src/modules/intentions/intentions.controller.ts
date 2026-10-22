import { Request, Response, NextFunction } from 'express';
import { intentionsService } from './intentions.service';
import { getRequestTimezone } from '../commitments/commitments.controller';

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
    res.status(201).json({ message: 'Intention created successfully.', intention });
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
    res.status(200).json(result);
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
    res.status(200).json({ intention });
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
    res.status(200).json({ message: 'Intention updated successfully.', intention });
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
