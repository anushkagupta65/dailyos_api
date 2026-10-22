import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createLearning,
  getLearningEntries,
  searchLearning,
  getUpcomingReviews,
  getLearningById,
  updateLearning,
  deleteLearning,
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from './learning.controller';
import {
  idParamSchema,
  createLearningSchema,
  updateLearningSchema,
  learningQuerySchema,
  searchLearningQuerySchema,
  upcomingReviewsQuerySchema,
  createReviewSchema,
  updateReviewSchema,
  reviewParamsSchema,
} from './learning.validation';

const router = Router();

// All learning endpoints require authentication
router.use(authenticate);

// Registered before '/:id' so these static paths are not treated as entry IDs.
router.get('/search', validate({ query: searchLearningQuerySchema }), searchLearning);
router.get('/upcoming-reviews', validate({ query: upcomingReviewsQuerySchema }), getUpcomingReviews);

// ---------------- ENTRIES ----------------
router.post('/', validate({ body: createLearningSchema }), createLearning);
router.get('/', validate({ query: learningQuerySchema }), getLearningEntries);
router.get('/:id', validate({ params: idParamSchema }), getLearningById);
router.put('/:id', validate({ params: idParamSchema, body: updateLearningSchema }), updateLearning);
router.delete('/:id', validate({ params: idParamSchema }), deleteLearning);

// ---------------- REVIEWS ----------------
router.post('/:id/reviews', validate({ params: idParamSchema, body: createReviewSchema }), createReview);
router.get('/:id/reviews', validate({ params: idParamSchema }), getReviews);
router.put('/:id/reviews/:reviewId', validate({ params: reviewParamsSchema, body: updateReviewSchema }), updateReview);
router.delete('/:id/reviews/:reviewId', validate({ params: reviewParamsSchema }), deleteReview);

export default router;
