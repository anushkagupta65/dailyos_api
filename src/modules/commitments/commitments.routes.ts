import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  updateHabitStatus,
  deleteHabit,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createLog,
  getHabitLogs,
  getAllLogs,
  updateLog,
  deleteLog,
  getProgress,
  getFlexibility,
  createFlexibility,
  updateFlexibility,
  deleteFlexibility,
  getReminders,
  createReminder,
  updateReminder,
  toggleReminder,
  deleteReminder,
} from './commitments.controller';
import {
  idParamSchema,
  createCategorySchema,
  updateCategorySchema,
  createHabitSchema,
  updateHabitSchema,
  updateHabitStatusSchema,
  habitsQuerySchema,
  createScheduleSchema,
  updateScheduleSchema,
  scheduleParamsSchema,
  createLogSchema,
  updateLogSchema,
  logParamsSchema,
  habitLogsQuerySchema,
  allLogsQuerySchema,
  progressQuerySchema,
  flexibilitySchema,
  updateFlexibilitySchema,
  createReminderSchema,
  updateReminderSchema,
  toggleReminderSchema,
  reminderParamsSchema,
} from './commitments.validation';

const router = Router();

// All commitments endpoints require authentication
router.use(authenticate);

// ---------------- CATEGORIES ----------------
router.get('/categories', getCategories);
router.post('/categories', validate({ body: createCategorySchema }), createCategory);
router.put('/categories/:id', validate({ params: idParamSchema, body: updateCategorySchema }), updateCategory);
router.delete('/categories/:id', validate({ params: idParamSchema }), deleteCategory);

// ---------------- CROSS-HABIT LOGS & PROGRESS ----------------
// Registered before '/:id' so these static paths are not treated as habit IDs.
router.get('/logs', validate({ query: allLogsQuerySchema }), getAllLogs);
router.get('/progress', validate({ query: progressQuerySchema }), getProgress);

// ---------------- HABITS ----------------
router.post('/', validate({ body: createHabitSchema }), createHabit);
router.get('/', validate({ query: habitsQuerySchema }), getHabits);
router.get('/:id', validate({ params: idParamSchema }), getHabitById);
router.put('/:id', validate({ params: idParamSchema, body: updateHabitSchema }), updateHabit);
router.patch('/:id/status', validate({ params: idParamSchema, body: updateHabitStatusSchema }), updateHabitStatus);
router.delete('/:id', validate({ params: idParamSchema }), deleteHabit);

// ---------------- SCHEDULES ----------------
router.get('/:id/schedules', validate({ params: idParamSchema }), getSchedules);
router.post('/:id/schedules', validate({ params: idParamSchema, body: createScheduleSchema }), createSchedule);
router.put('/:id/schedules/:scheduleId', validate({ params: scheduleParamsSchema, body: updateScheduleSchema }), updateSchedule);
router.delete('/:id/schedules/:scheduleId', validate({ params: scheduleParamsSchema }), deleteSchedule);

// ---------------- LOGS ----------------
router.post('/:id/logs', validate({ params: idParamSchema, body: createLogSchema }), createLog);
router.get('/:id/logs', validate({ params: idParamSchema, query: habitLogsQuerySchema }), getHabitLogs);
router.put('/:id/logs/:logId', validate({ params: logParamsSchema, body: updateLogSchema }), updateLog);
router.delete('/:id/logs/:logId', validate({ params: logParamsSchema }), deleteLog);

// ---------------- FLEXIBILITY ----------------
router.get('/:id/flexibility', validate({ params: idParamSchema }), getFlexibility);
router.post('/:id/flexibility', validate({ params: idParamSchema, body: flexibilitySchema }), createFlexibility);
router.put('/:id/flexibility', validate({ params: idParamSchema, body: updateFlexibilitySchema }), updateFlexibility);
router.delete('/:id/flexibility', validate({ params: idParamSchema }), deleteFlexibility);

// ---------------- REMINDERS ----------------
router.get('/:id/reminders', validate({ params: idParamSchema }), getReminders);
router.post('/:id/reminders', validate({ params: idParamSchema, body: createReminderSchema }), createReminder);
router.put('/:id/reminders/:reminderId', validate({ params: reminderParamsSchema, body: updateReminderSchema }), updateReminder);
router.patch('/:id/reminders/:reminderId/toggle', validate({ params: reminderParamsSchema, body: toggleReminderSchema }), toggleReminder);
router.delete('/:id/reminders/:reminderId', validate({ params: reminderParamsSchema }), deleteReminder);

export default router;
