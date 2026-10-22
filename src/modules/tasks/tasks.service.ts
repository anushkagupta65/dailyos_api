import { withTransaction } from '../../config/database';
import { tasksRepository } from './tasks.repository';
import { isValidTimeRange } from './tasks.validation';
import { addDays, getWeekdayName, toDateString, WEEKDAYS } from '../../utils/date';

const calculateNextOccurrence = (
  currentDate: string,
  frequency: string,
  intervalValue: number = 1,
  weekdays: string[] = []
): string => {
  const interval = Math.max(1, intervalValue);

  if (frequency === 'daily') {
    return addDays(currentDate, interval);
  }

  if (frequency === 'weekly') {
    if (weekdays && weekdays.length > 0) {
      const normalizedWeekdays = weekdays.map((w) => w.toLowerCase());
      for (let i = 1; i <= 6; i++) {
        const candidate = addDays(currentDate, i);
        if (normalizedWeekdays.includes(getWeekdayName(candidate).toLowerCase())) {
          return candidate;
        }
      }
      const daysToNextWeek = 7 - (WEEKDAYS.indexOf(getWeekdayName(currentDate)) || 0);
      const candidate = addDays(currentDate, daysToNextWeek + (interval - 1) * 7);
      for (let i = 0; i < 7; i++) {
        const testDate = addDays(candidate, i);
        if (normalizedWeekdays.includes(getWeekdayName(testDate).toLowerCase())) {
          return testDate;
        }
      }
    }
    return addDays(currentDate, interval * 7);
  }

  const d = new Date(`${currentDate}T00:00:00.000Z`);
  if (frequency === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + interval);
    return d.toISOString().slice(0, 10);
  }

  if (frequency === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + interval);
    return d.toISOString().slice(0, 10);
  }

  return addDays(currentDate, interval);
};

const validationError = (field: string, message: string) => ({
  status: 400,
  message: 'Validation failed',
  errors: [{ field, message }],
});

/**
 * completed_at follows the status: set when a task becomes completed, cleared when it leaves it.
 */
const completedAtFor = (newStatus: string, previousStatus: string | null, existingCompletedAt: any) => {
  if (newStatus === 'completed') {
    return previousStatus === 'completed' && existingCompletedAt
      ? existingCompletedAt
      : new Date().toISOString();
  }
  return null;
};

export class TasksService {
  // ---------------- HELPERS ----------------
  private async ensureTask(userId: string, id: string) {
    const task = await tasksRepository.getTaskById(userId, id);
    if (!task) {
      throw { status: 404, message: 'Task not found.' };
    }
    return task;
  }

  // ---------------- TASKS ----------------
  async createTask(userId: string, data: any) {
    // Tasks with a scheduled date start as planned unless a status is given.
    const status = data.status || (data.scheduledDate ? 'planned' : 'inbox');
    const { subtasks = [], ...taskData } = data;

    return withTransaction(async (client) => {
      const task = await tasksRepository.createTask(client, userId, {
        ...taskData,
        status,
        completedAt: completedAtFor(status, null, null),
      });
      await tasksRepository.createStatusHistory(client, userId, task.id, null, status, 'Task created');
      const createdSubtasks = [];
      for (const [index, subtask] of subtasks.entries()) {
        createdSubtasks.push(
          await tasksRepository.createSubtask(userId, task.id, { title: subtask.title, sortOrder: index }, client)
        );
      }
      return { ...task, subtasks: createdSubtasks };
    });
  }

  async getTasks(userId: string, filters: any) {
    return tasksRepository.getTasks(userId, filters);
  }

  async getTaskById(userId: string, id: string) {
    const task = await this.ensureTask(userId, id);
    const subtasks = await tasksRepository.getSubtasks(userId, id);
    return {
      ...task,
      subtasks,
      subtask_summary: {
        total: subtasks.length,
        completed: subtasks.filter((s) => s.is_completed).length,
      },
    };
  }

  /**
   * Updates task fields. A status change also updates completed_at and writes a history
   * record in the same transaction; an unchanged status writes no history.
   */
  async updateTask(userId: string, id: string, data: any, statusNote?: string | null) {
    const existing = await this.ensureTask(userId, id);

    const startTime = data.startTime !== undefined ? data.startTime : existing.start_time;
    const endTime = data.endTime !== undefined ? data.endTime : existing.end_time;
    if (!isValidTimeRange(startTime, endTime)) {
      throw validationError('endTime', 'endTime must be on or after startTime');
    }

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    const payload = { ...data };
    if (statusChanged) {
      payload.completedAt = completedAtFor(data.status, existing.status, existing.completed_at);
    }

    return withTransaction(async (client) => {
      const task = await tasksRepository.updateTask(client, userId, id, payload);
      if (statusChanged) {
        await tasksRepository.createStatusHistory(client, userId, id, existing.status, data.status, statusNote);
      }
      return task;
    });
  }

  async updateTaskStatus(userId: string, id: string, status: string, note?: string | null) {
    const existing = await this.ensureTask(userId, id);
    if (existing.status === status) {
      return { task: existing, changed: false };
    }
    const task = await this.updateTask(userId, id, { status }, note);
    return { task, changed: true };
  }

  async deleteTask(userId: string, id: string) {
    const deleted = await tasksRepository.deleteTask(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Task not found.' };
    }
    return { message: 'Task deleted successfully.' };
  }

  // ---------------- SUBTASKS ----------------
  async createSubtask(userId: string, taskId: string, data: any) {
    await this.ensureTask(userId, taskId);
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const existing = await tasksRepository.getSubtasks(userId, taskId);
      sortOrder = existing.length ? Math.max(...existing.map((s) => s.sort_order)) + 1 : 0;
    }
    return tasksRepository.createSubtask(userId, taskId, {
      ...data,
      sortOrder,
      completedAt: data.isCompleted ? new Date().toISOString() : null,
    });
  }

  async updateSubtask(userId: string, taskId: string, subtaskId: string, data: any) {
    await this.ensureTask(userId, taskId);
    const existing = await tasksRepository.getSubtaskById(userId, taskId, subtaskId);
    if (!existing) {
      throw { status: 404, message: 'Subtask not found.' };
    }
    const payload = { ...data };
    if (data.isCompleted !== undefined && data.isCompleted !== existing.is_completed) {
      payload.completedAt = data.isCompleted ? new Date().toISOString() : null;
    }
    return tasksRepository.updateSubtask(userId, taskId, subtaskId, payload);
  }

  async deleteSubtask(userId: string, taskId: string, subtaskId: string) {
    await this.ensureTask(userId, taskId);
    const deleted = await tasksRepository.deleteSubtask(userId, taskId, subtaskId);
    if (!deleted) {
      throw { status: 404, message: 'Subtask not found.' };
    }
    return { message: 'Subtask deleted successfully.' };
  }

  // ---------------- STATUS HISTORY ----------------
  async getStatusHistory(userId: string, taskId: string) {
    await this.ensureTask(userId, taskId);
    return tasksRepository.getStatusHistory(userId, taskId);
  }

  // ---------------- TASK RECURRENCES ----------------
  async createRecurrence(userId: string, data: any) {
    const taskId = data.taskId;
    if (!taskId) {
      throw { status: 400, message: 'taskId is required.' };
    }
    await this.ensureTask(userId, taskId);

    const existing = await tasksRepository.getRecurrenceByTaskId(userId, taskId);
    if (existing) {
      throw {
        status: 409,
        message: 'A recurring schedule already exists for this task. Please update the existing schedule.',
      };
    }

    const startDate = toDateString(data.startDate)!;
    const nextOccurrence = toDateString(data.nextOccurrence) || startDate;

    return withTransaction(async (client) => {
      const rec = await tasksRepository.createRecurrence(client, userId, {
        ...data,
        startDate,
        nextOccurrence,
      });
      return rec;
    });
  }

  async getRecurrenceById(userId: string, id: string) {
    const rec = await tasksRepository.getRecurrenceById(userId, id);
    if (!rec) {
      throw { status: 404, message: 'Recurring task schedule not found.' };
    }
    return rec;
  }

  async getRecurrenceByTaskId(userId: string, taskId: string) {
    await this.ensureTask(userId, taskId);
    const rec = await tasksRepository.getRecurrenceByTaskId(userId, taskId);
    if (!rec) {
      throw { status: 404, message: 'No recurrence schedule configured for this task.' };
    }
    return rec;
  }

  async listRecurrences(userId: string, filters: any) {
    return tasksRepository.listRecurrences(userId, filters);
  }

  async updateRecurrence(userId: string, id: string, data: any) {
    await this.getRecurrenceById(userId, id);
    return withTransaction(async (client) => {
      return tasksRepository.updateRecurrence(client, userId, id, data);
    });
  }

  async pauseRecurrence(userId: string, id: string) {
    await this.getRecurrenceById(userId, id);
    return withTransaction(async (client) => {
      const updated = await tasksRepository.updateRecurrence(client, userId, id, { isActive: false });
      return { message: 'Recurring task schedule paused successfully.', recurrence: updated };
    });
  }

  async resumeRecurrence(userId: string, id: string) {
    await this.getRecurrenceById(userId, id);
    return withTransaction(async (client) => {
      const updated = await tasksRepository.updateRecurrence(client, userId, id, { isActive: true });
      return { message: 'Recurring task schedule resumed successfully.', recurrence: updated };
    });
  }

  async deleteRecurrence(userId: string, id: string) {
    await this.getRecurrenceById(userId, id);
    return withTransaction(async (client) => {
      await tasksRepository.deleteRecurrence(client, userId, id);
      return { message: 'Recurring task schedule deleted successfully.' };
    });
  }

  async generateOccurrence(userId: string, recurrenceId: string) {
    const rec = await this.getRecurrenceById(userId, recurrenceId);
    if (!rec.is_active) {
      throw { status: 400, message: 'Cannot generate occurrence for paused or inactive recurrence.' };
    }

    const templateTask = await tasksRepository.getTaskById(userId, rec.task_id);
    if (!templateTask) {
      throw { status: 404, message: 'Template task not found.' };
    }

    const occurrenceDate = toDateString(rec.next_occurrence)!;
    if (rec.end_date && occurrenceDate > toDateString(rec.end_date)!) {
      await withTransaction(async (client) => {
        await tasksRepository.updateRecurrence(client, userId, rec.id, { isActive: false });
      });
      throw { status: 400, message: 'Recurrence schedule has passed its end date.' };
    }

    // Duplicate prevention check
    const existingOccurrence = await tasksRepository.getTaskOccurrenceForDate(rec.id, occurrenceDate);
    if (existingOccurrence) {
      throw {
        status: 409,
        message: `A task has already been generated for this recurrence schedule on ${occurrenceDate}.`,
      };
    }

    return withTransaction(async (client) => {
      const generatedTask = await tasksRepository.createTask(client, userId, {
        title: templateTask.title,
        description: templateTask.description,
        category: templateTask.category,
        priority: templateTask.priority,
        status: 'planned',
        scheduledDate: occurrenceDate,
        dueDate: occurrenceDate,
        startTime: templateTask.start_time,
        endTime: templateTask.end_time,
        estimatedMinutes: templateTask.estimated_minutes,
        source: 'manual',
      });

      // Associate with recurrence
      await client.query(
        `UPDATE tasks SET recurrence_id = $1 WHERE id = $2`,
        [rec.id, generatedTask.id]
      );

      // Clone subtasks from template task if any
      const subtasks = await tasksRepository.getSubtasks(userId, templateTask.id);
      for (const st of subtasks) {
        await tasksRepository.createSubtask(userId, generatedTask.id, {
          title: st.title,
          sortOrder: st.sort_order,
        }, client);
      }

      await tasksRepository.createStatusHistory(
        client,
        userId,
        generatedTask.id,
        null,
        'planned',
        `Generated from recurring schedule (${rec.frequency})`
      );

      // Compute next occurrence date
      const weekdays = typeof rec.weekdays === 'string' ? JSON.parse(rec.weekdays) : (rec.weekdays || []);
      const nextDate = calculateNextOccurrence(occurrenceDate, rec.frequency, rec.interval_value, weekdays);
      const isPastEnd = rec.end_date && nextDate > toDateString(rec.end_date)!;

      const updatedRecurrence = await tasksRepository.updateRecurrence(client, userId, rec.id, {
        nextOccurrence: nextDate,
        isActive: !isPastEnd,
      });

      return {
        message: 'Task occurrence generated successfully.',
        task: generatedTask,
        recurrence: updatedRecurrence,
      };
    });
  }

  async getRecurrenceHistory(userId: string, recurrenceId: string) {
    await this.getRecurrenceById(userId, recurrenceId);
    const tasks = await tasksRepository.getTasksByRecurrenceId(userId, recurrenceId);
    return { recurrenceId, totalOccurrences: tasks.length, tasks };
  }
}

export const tasksService = new TasksService();
