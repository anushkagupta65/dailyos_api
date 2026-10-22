import { Request, Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';

// ---------------- REVIEWS ----------------
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await reviewsService.createReview(req.user!.id, req.body);
    res.status(201).json({ message: 'Review created successfully.', review });
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
    const query = res.locals.validatedQuery || req.query;
    const result = await reviewsService.listReviews(req.user!.id, {
      reviewType: query.reviewType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await reviewsService.getReviewById(req.user!.id, req.params.id as string);
    res.status(200).json({ review });
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
    const review = await reviewsService.updateReview(req.user!.id, req.params.id as string, req.body);
    res.status(200).json({ message: 'Review updated successfully.', review });
  } catch (err) {
    next(err);
  }
};

export const completeReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await reviewsService.completeReview(req.user!.id, req.params.id as string);
    res.status(200).json({ message: 'Review completed successfully.', review });
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
    const result = await reviewsService.deleteReview(req.user!.id, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- RATINGS ----------------
export const addHabitRatings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ratings = Array.isArray(req.body.ratings) ? req.body.ratings : [req.body];
    const habitRatings = await reviewsService.addHabitRatings(req.user!.id, req.params.id as string, ratings);
    res.status(200).json({ message: 'Habit ratings updated successfully.', habitRatings });
  } catch (err) {
    next(err);
  }
};

export const addTaskRatings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ratings = Array.isArray(req.body.ratings) ? req.body.ratings : [req.body];
    const taskRatings = await reviewsService.addTaskRatings(req.user!.id, req.params.id as string, ratings);
    res.status(200).json({ message: 'Task ratings updated successfully.', taskRatings });
  } catch (err) {
    next(err);
  }
};

export const getRatings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ratings = await reviewsService.getRatings(req.user!.id, req.params.id as string);
    res.status(200).json(ratings);
  } catch (err) {
    next(err);
  }
};

// ---------------- ACTIONS ----------------
export const createAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const action = await reviewsService.createAction(req.user!.id, req.params.id as string, req.body);
    res.status(201).json({ message: 'Action created successfully.', action });
  } catch (err) {
    next(err);
  }
};

export const getActions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await reviewsService.listActions(req.user!.id, {
      reviewId: query.reviewId,
      status: query.status,
      priority: query.priority,
      actionType: query.actionType,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getOpenActions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await reviewsService.getOpenActions(req.user!.id, {
      reviewId: query.reviewId,
      priority: query.priority,
      actionType: query.actionType,
      search: query.search,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getActionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const action = await reviewsService.getActionById(req.user!.id, req.params.actionId as string);
    res.status(200).json({ action });
  } catch (err) {
    next(err);
  }
};

export const updateAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const action = await reviewsService.updateAction(req.user!.id, req.params.actionId as string, req.body);
    res.status(200).json({ message: 'Action updated successfully.', action });
  } catch (err) {
    next(err);
  }
};

export const updateActionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const action = await reviewsService.updateActionStatus(req.user!.id, req.params.actionId as string, req.body.status);
    res.status(200).json({ message: 'Action status updated successfully.', action });
  } catch (err) {
    next(err);
  }
};

export const deleteAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await reviewsService.deleteAction(req.user!.id, req.params.actionId as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ---------------- SUMMARY GENERATION ----------------
export const generateSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const summary = await reviewsService.generateSummary(req.user!.id, {
      type: query.type,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
    });
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};
