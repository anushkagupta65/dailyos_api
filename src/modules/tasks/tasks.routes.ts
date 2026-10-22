import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getStatusHistory,
  createRecurrence,
  getRecurrences,
  getRecurrenceById,
  getTaskRecurrence,
  updateRecurrence,
  pauseRecurrence,
  resumeRecurrence,
  deleteRecurrence,
  generateRecurrenceOccurrence,
  getRecurrenceHistory,
} from './tasks.controller';
import {
  idParamSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  tasksQuerySchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  subtaskParamsSchema,
  createTaskRecurrenceSchema,
  updateTaskRecurrenceSchema,
  taskRecurrencesQuerySchema,
} from './tasks.validation';

const router = Router();

// All task endpoints require authentication
router.use(authenticate);

// ---------------- RECURRING TASKS (SPECIFIC PATHS FIRST) ----------------
router.post('/recurrences', validate({ body: createTaskRecurrenceSchema }), createRecurrence);
router.get('/recurrences', validate({ query: taskRecurrencesQuerySchema }), getRecurrences);
router.get('/recurrences/:id', validate({ params: idParamSchema }), getRecurrenceById);
router.put('/recurrences/:id', validate({ params: idParamSchema, body: updateTaskRecurrenceSchema }), updateRecurrence);
router.patch('/recurrences/:id/pause', validate({ params: idParamSchema }), pauseRecurrence);
router.patch('/recurrences/:id/resume', validate({ params: idParamSchema }), resumeRecurrence);
router.delete('/recurrences/:id', validate({ params: idParamSchema }), deleteRecurrence);
router.post('/recurrences/:id/generate', validate({ params: idParamSchema }), generateRecurrenceOccurrence);
router.get('/recurrences/:id/history', validate({ params: idParamSchema }), getRecurrenceHistory);

// ---------------- TASKS ----------------
router.post('/', validate({ body: createTaskSchema }), createTask);
router.get('/', validate({ query: tasksQuerySchema }), getTasks);
router.get('/:id', validate({ params: idParamSchema }), getTaskById);
router.put('/:id', validate({ params: idParamSchema, body: updateTaskSchema }), updateTask);
router.patch('/:id/status', validate({ params: idParamSchema, body: updateTaskStatusSchema }), updateTaskStatus);
router.delete('/:id', validate({ params: idParamSchema }), deleteTask);

// Task-specific recurrence routes
router.post('/:id/recurrence', validate({ params: idParamSchema, body: createTaskRecurrenceSchema }), createRecurrence);
router.get('/:id/recurrence', validate({ params: idParamSchema }), getTaskRecurrence);

// ---------------- SUBTASKS ----------------
router.post('/:id/subtasks', validate({ params: idParamSchema, body: createSubtaskSchema }), createSubtask);
router.put('/:id/subtasks/:subtaskId', validate({ params: subtaskParamsSchema, body: updateSubtaskSchema }), updateSubtask);
router.delete('/:id/subtasks/:subtaskId', validate({ params: subtaskParamsSchema }), deleteSubtask);

// ---------------- STATUS HISTORY ----------------
router.get('/:id/history', validate({ params: idParamSchema }), getStatusHistory);

export default router;
