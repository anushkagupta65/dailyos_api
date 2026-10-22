import { Request, Response, NextFunction } from 'express';
import { learningService } from './learning.service';
import { getRequestTimezone } from '../commitments/commitments.controller';

const listFilters = (query: any) => ({
  category: query.category,
  learnedFrom: query.learnedFrom,
  learnedTo: query.learnedTo,
  reviewFrom: query.reviewFrom,
  reviewTo: query.reviewTo,
  sortBy: query.sortBy,
  sortOrder: query.sortOrder,
  page: Number(query.page) || 1,
  limit: Number(query.limit) || 20,
});

// ---------------- ENTRIES ----------------
export const createLearning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const learning = await learningService.createEntry(req.user!.id, req.body, getRequestTimezone(req, res));
    res.status(201).json({ message: 'Learning entry created successfully.', learning });
  } catch (err) {
    next(err);
  }
};

export const getLearningEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await learningService.getEntries(req.user!.id, listFilters(res.locals.validatedQuery));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const searchLearning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await learningService.searchEntries(req.user!.id, { ...listFilters(query), q: query.q });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getUpcomingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;
    const result = await learningService.getUpcomingReviews(
      req.user!.id,
      {
        startDate: query.startDate,
        endDate: query.endDate,
        days: query.days,
        includeOverdue: query.includeOverdue,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      },
      getRequestTimezone(req, res)
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getLearningById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const learning = await learningService.getEntryById(
      req.user!.id,
      req.params.id as string,
      getRequestTimezone(req, res)
    );
    res.status(200).json({ learning });
  } catch (err) {
    next(err);
  }
};

export const updateLearning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const learning = await learningService.updateEntry(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Learning entry updated successfully.', learning });
  } catch (err) {
    next(err);
  }
};

export const deleteLearning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await learningService.deleteEntry(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- REVIEWS ----------------
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { review, learning } = await learningService.createReview(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.status(201).json({ message: 'Learning review added successfully.', review, learning });
  } catch (err) {
    next(err);
  }
};

export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviews = await learningService.getReviews(req.user!.id, req.params.id as string);
    res.status(200).json({ reviews });
  } catch (err) {
    next(err);
  }
};

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await learningService.updateReview(
      req.user!.id,
      req.params.id as string,
      req.params.reviewId as string,
      req.body
    );
    res.status(200).json({ message: 'Learning review updated successfully.', review });
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await learningService.deleteReview(
      req.user!.id,
      req.params.id as string,
      req.params.reviewId as string
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
