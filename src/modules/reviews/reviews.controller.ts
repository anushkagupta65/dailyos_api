import { Request, Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';
import { sendSuccess } from '../../utils/response';

// ---------------- REVIEWS ----------------
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await reviewsService.createReview(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Review created successfully.',
      data: { review },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Reviews retrieved successfully.',
      data: { reviews: result.reviews },
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review retrieved successfully.',
      data: { review },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review updated successfully.',
      data: { review },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review completed successfully.',
      data: { review },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Review deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Habit ratings updated successfully.',
      data: { habitRatings },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Task ratings updated successfully.',
      data: { taskRatings },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review ratings retrieved successfully.',
      data: ratings,
    });
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
    sendSuccess(res, {
      status: 201,
      message: 'Action created successfully.',
      data: { action },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review actions retrieved successfully.',
      data: { actions: result.actions },
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Open review actions retrieved successfully.',
      data: { actions: result.actions },
      pagination: result.pagination,
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Action retrieved successfully.',
      data: { action },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Action updated successfully.',
      data: { action },
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Action status updated successfully.',
      data: { action },
    });
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
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Action deleted successfully.',
      data: {},
    });
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
    sendSuccess(res, {
      status: 200,
      message: 'Review summary generated successfully.',
      data: { summary },
    });
  } catch (err) {
    next(err);
  }
};
