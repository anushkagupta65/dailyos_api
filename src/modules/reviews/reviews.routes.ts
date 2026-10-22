import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  completeReview,
  deleteReview,
  addHabitRatings,
  addTaskRatings,
  getRatings,
  createAction,
  getActions,
  getOpenActions,
  getActionById,
  updateAction,
  updateActionStatus,
  deleteAction,
  generateSummary,
} from './reviews.controller';
import {
  idParamSchema,
  actionParamSchema,
  createReviewSchema,
  updateReviewSchema,
  reviewsQuerySchema,
  actionsQuerySchema,
  summaryQuerySchema,
  habitRatingsBatchSchema,
  taskRatingsBatchSchema,
  createReviewActionSchema,
  updateReviewActionSchema,
  updateActionStatusSchema,
} from './reviews.validation';

const router = Router();

// All review routes require authentication
router.use(authenticate);

// ---------------- SUMMARY & AGGREGATIONS ----------------
// Must be defined before :id to prevent matching "summary" as an ID
router.get('/summary', validate({ query: summaryQuerySchema }), generateSummary);

// ---------------- GLOBAL ACTIONS ----------------
router.get('/actions', validate({ query: actionsQuerySchema }), getActions);
router.get('/actions/open', validate({ query: actionsQuerySchema }), getOpenActions);
router.get('/actions/:actionId', validate({ params: actionParamSchema }), getActionById);
router.put(
  '/actions/:actionId',
  validate({ params: actionParamSchema, body: updateReviewActionSchema }),
  updateAction
);
router.patch(
  '/actions/:actionId/status',
  validate({ params: actionParamSchema, body: updateActionStatusSchema }),
  updateActionStatus
);
router.delete('/actions/:actionId', validate({ params: actionParamSchema }), deleteAction);

// ---------------- REVIEWS CRUD ----------------
router.post('/', validate({ body: createReviewSchema }), createReview);
router.get('/', validate({ query: reviewsQuerySchema }), getReviews);
router.get('/:id', validate({ params: idParamSchema }), getReviewById);
router.put('/:id', validate({ params: idParamSchema, body: updateReviewSchema }), updateReview);
router.patch('/:id/complete', validate({ params: idParamSchema }), completeReview);
router.delete('/:id', validate({ params: idParamSchema }), deleteReview);

// ---------------- REVIEW SPECIFIC RATINGS & ACTIONS ----------------
router.get('/:id/ratings', validate({ params: idParamSchema }), getRatings);
router.post(
  '/:id/ratings/habits',
  validate({ params: idParamSchema, body: habitRatingsBatchSchema }),
  addHabitRatings
);
router.post(
  '/:id/ratings/tasks',
  validate({ params: idParamSchema, body: taskRatingsBatchSchema }),
  addTaskRatings
);
router.post(
  '/:id/actions',
  validate({ params: idParamSchema, body: createReviewActionSchema }),
  createAction
);

export default router;
