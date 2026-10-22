import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createIntention,
  getIntentions,
  getIntentionById,
  updateIntention,
  deleteIntention,
} from './intentions.controller';
import {
  idParamSchema,
  createIntentionSchema,
  updateIntentionSchema,
  intentionsQuerySchema,
} from './intentions.validation';

const router = Router();

// All intention endpoints require authentication
router.use(authenticate);

router.post('/', validate({ body: createIntentionSchema }), createIntention);
router.get('/', validate({ query: intentionsQuerySchema }), getIntentions);
router.get('/:id', validate({ params: idParamSchema }), getIntentionById);
router.put('/:id', validate({ params: idParamSchema, body: updateIntentionSchema }), updateIntention);
router.delete('/:id', validate({ params: idParamSchema }), deleteIntention);

export default router;
