import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createPriority,
  getPriorities,
  getPriorityById,
  updatePriority,
  updatePriorityCompletion,
  reorderPriorities,
  deletePriority,
} from './priorities.controller';
import {
  idParamSchema,
  createPrioritySchema,
  updatePrioritySchema,
  priorityCompletionSchema,
  reorderPrioritiesSchema,
  prioritiesQuerySchema,
} from './priorities.validation';

const router = Router();

// All priority endpoints require authentication
router.use(authenticate);

// Registered before '/:id' so 'reorder' is not treated as a priority ID.
router.patch('/reorder', validate({ body: reorderPrioritiesSchema }), reorderPriorities);

router.post('/', validate({ body: createPrioritySchema }), createPriority);
router.get('/', validate({ query: prioritiesQuerySchema }), getPriorities);
router.get('/:id', validate({ params: idParamSchema }), getPriorityById);
router.put('/:id', validate({ params: idParamSchema, body: updatePrioritySchema }), updatePriority);
router.patch('/:id/completion', validate({ params: idParamSchema, body: priorityCompletionSchema }), updatePriorityCompletion);
router.delete('/:id', validate({ params: idParamSchema }), deletePriority);

export default router;
