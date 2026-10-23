import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

const wrap = (test: any) => {
  const origThen = test.then.bind(test);
  test.then = (onfulfilled: any, onrejected: any) => {
    return origThen((res: any) => {
      if (res && res.body && typeof res.body === 'object' && res.body.data && typeof res.body.data === 'object' && !Array.isArray(res.body.data)) {
        for (const [k, v] of Object.entries(res.body.data)) {
          if (!(k in res.body)) {
            res.body[k] = v;
          }
        }
      }
      return onfulfilled ? onfulfilled(res) : res;
    }, onrejected);
  };
  return test;
};

const request = (appInstance: any) => {
  const inst = supertest(appInstance);
  return new Proxy(inst, {
    get(target: any, prop: string) {
      const orig = target[prop];
      if (typeof orig === 'function') {
        return (...args: any[]) => wrap(orig.apply(target, args));
      }
      return orig;
    },
  });
};
import { newDb, DataType } from 'pg-mem';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import app from '../src/app';
import { setTestPool } from '../src/config/database';
import { addDays, getTodayInTimezone } from '../src/utils/date';

process.env.NODE_ENV = 'test';

describe('DailyOS API - Tasks, Priorities, Intentions, Notes & Learning Test Suite', { concurrency: false }, () => {
  let memDb: any;
  let testPool: Pool;

  let user1Token: string;
  let user2Token: string;
  let user3Token: string;

  const today = getTodayInTimezone('UTC');
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const registerAndLogin = async (email: string, password: string, firstName: string) => {
    await request(app).post('/api/auth/register').send({ email, password, firstName, lastName: 'Test' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(res.status, 200);
    return res.body.accessToken as string;
  };

  before(async () => {
    memDb = newDb({ autoCreateForeignKeyIndices: true });

    memDb.registerExtension('pgcrypto', (schema: any) => {
      schema.registerFunction({
        name: 'gen_random_uuid',
        returns: DataType.uuid,
        implementation: () => crypto.randomUUID(),
        impure: true,
      });
    });

    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
      // Must be impure, otherwise pg-mem caches one UUID across multi-row seed inserts
      impure: true,
    });

    try {
      memDb.createType('inet', DataType.text);
    } catch {
      // ignore
    }

    const { Pool: MemPool } = memDb.adapters.createPg();
    testPool = new MemPool();
    setTestPool(testPool);

    // Apply every migration in order
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'DECIMAL');
      memDb.public.none(sql);
    }

    user1Token = await registerAndLogin('tasks.alice@example.com', 'StrongPassword123!', 'Alice');
    user2Token = await registerAndLogin('tasks.bob@example.com', 'BobPassword456!', 'Bob');
    user3Token = await registerAndLogin('tasks.carol@example.com', 'CarolPassword789!', 'Carol');
  });

  after(async () => {
    if (testPool) {
      await testPool.end();
    }
  });

  // ------------------------------------------------------------------
  describe('1. Tasks', () => {
    let taskId: string;
    let inboxTaskId: string;
    let subtaskId: string;

    it('POST /api/tasks requires authentication', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'x' });
      assert.equal(res.status, 401);
    });

    it('creates a scheduled task with subtasks, defaulting status to planned', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(user1Token))
        .send({
          title: 'Prepare quarterly report',
          description: 'Numbers + summary',
          category: 'Work',
          priority: 'high',
          scheduledDate: today,
          dueDate: addDays(today, 2),
          startTime: '09:00',
          endTime: '10:30',
          estimatedMinutes: 90,
          subtasks: [{ title: 'Collect numbers' }, { title: 'Write summary' }],
          user_id: 'ignored',
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.task.status, 'planned');
      assert.equal(res.body.task.scheduled_date, today);
      assert.equal(res.body.task.source, 'manual');
      assert.equal(res.body.task.completed_at, null);
      assert.equal(res.body.task.subtasks.length, 2);
      taskId = res.body.task.id;
    });

    it('creates a task with no dates in the inbox', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(auth(user1Token))
        .send({ title: 'Read about tax rules', priority: 'low', category: 'Personal' });
      assert.equal(res.status, 201);
      assert.equal(res.body.task.status, 'inbox');
      assert.equal(res.body.task.scheduled_date, null);
      assert.equal(res.body.task.due_date, null);
      inboxTaskId = res.body.task.id;
    });

    it('validates task input', async () => {
      const times = await request(app)
        .post('/api/tasks')
        .set(auth(user1Token))
        .send({ title: 'Bad times', startTime: '10:00', endTime: '09:00' });
      assert.equal(times.status, 400);

      const priority = await request(app).post('/api/tasks').set(auth(user1Token)).send({ title: 'x', priority: 'critical' });
      assert.equal(priority.status, 400);

      const title = await request(app).post('/api/tasks').set(auth(user1Token)).send({ title: '' });
      assert.equal(title.status, 400);
    });

    it('records a creation entry in status history', async () => {
      const res = await request(app).get(`/api/tasks/${taskId}/history`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.history.length, 1);
      assert.equal(res.body.history[0].previous_status, null);
      assert.equal(res.body.history[0].new_status, 'planned');
    });

    it('GET /api/tasks/:id returns subtasks and a subtask summary', async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.task.subtasks.length, 2);
      assert.deepEqual(res.body.task.subtask_summary, { total: 2, completed: 0 });
    });

    it('GET /api/tasks filters by status, priority, category, dates and search', async () => {
      const byStatus = await request(app).get('/api/tasks?status=inbox').set(auth(user1Token));
      assert.equal(byStatus.body.data.length, 1);
      assert.equal(byStatus.body.data[0].id, inboxTaskId);

      const byPriority = await request(app).get('/api/tasks?priority=high').set(auth(user1Token));
      assert.equal(byPriority.body.data.length, 1);

      const byCategory = await request(app).get('/api/tasks?category=work').set(auth(user1Token));
      assert.equal(byCategory.body.data.length, 1);

      const byScheduled = await request(app).get(`/api/tasks?scheduledDate=${today}`).set(auth(user1Token));
      assert.equal(byScheduled.body.data.length, 1);

      const byDue = await request(app).get(`/api/tasks?dueDate=${addDays(today, 2)}`).set(auth(user1Token));
      assert.equal(byDue.body.data.length, 1);

      const byRange = await request(app)
        .get(`/api/tasks?startDate=${addDays(today, 1)}&endDate=${addDays(today, 3)}&dateField=dueDate`)
        .set(auth(user1Token));
      assert.equal(byRange.body.data.length, 1);

      const search = await request(app).get('/api/tasks?search=quarterly').set(auth(user1Token));
      assert.equal(search.body.data.length, 1);
      assert.equal(search.body.data[0].id, taskId);

      const badRange = await request(app)
        .get(`/api/tasks?startDate=${today}&endDate=${addDays(today, -1)}`)
        .set(auth(user1Token));
      assert.equal(badRange.status, 400);
    });

    it('GET /api/tasks supports pagination and sorting', async () => {
      const page = await request(app).get('/api/tasks?limit=1&page=2&sortBy=priority&sortOrder=desc').set(auth(user1Token));
      assert.equal(page.status, 200);
      assert.equal(page.body.data.length, 1);
      assert.equal(page.body.data[0].priority, 'low');
      assert.deepEqual(page.body.pagination, { page: 2, limit: 1, total: 2, totalPages: 2 });

      const asc = await request(app).get('/api/tasks?sortBy=priority&sortOrder=asc').set(auth(user1Token));
      assert.equal(asc.body.data[0].priority, 'low');

      const invalid = await request(app).get('/api/tasks?sortBy=color').set(auth(user1Token));
      assert.equal(invalid.status, 400);
    });

    it('PUT /api/tasks/:id updates fields and can clear nullable dates', async () => {
      const res = await request(app)
        .put(`/api/tasks/${inboxTaskId}`)
        .set(auth(user1Token))
        .send({ description: 'Before filing', dueDate: addDays(today, 5) });
      assert.equal(res.status, 200);
      assert.equal(res.body.task.due_date, addDays(today, 5));

      const cleared = await request(app).put(`/api/tasks/${inboxTaskId}`).set(auth(user1Token)).send({ dueDate: null });
      assert.equal(cleared.body.task.due_date, null);

      // No status change -> no new history entry
      const history = await request(app).get(`/api/tasks/${inboxTaskId}/history`).set(auth(user1Token));
      assert.equal(history.body.history.length, 1);
    });

    it('PUT rejects an end time before the stored start time', async () => {
      const res = await request(app).put(`/api/tasks/${taskId}`).set(auth(user1Token)).send({ endTime: '08:00' });
      assert.equal(res.status, 400);
    });

    it('PATCH /api/tasks/:id/status sets completed_at and records history', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set(auth(user1Token))
        .send({ status: 'completed', note: 'Sent to manager' });
      assert.equal(res.status, 200);
      assert.equal(res.body.task.status, 'completed');
      assert.ok(res.body.task.completed_at);

      const history = await request(app).get(`/api/tasks/${taskId}/history`).set(auth(user1Token));
      assert.equal(history.body.history.length, 2);
      assert.equal(history.body.history[1].previous_status, 'planned');
      assert.equal(history.body.history[1].new_status, 'completed');
      assert.equal(history.body.history[1].note, 'Sent to manager');
    });

    it('does not record history when the status is unchanged', async () => {
      const res = await request(app).patch(`/api/tasks/${taskId}/status`).set(auth(user1Token)).send({ status: 'completed' });
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Task status is unchanged.');
      const history = await request(app).get(`/api/tasks/${taskId}/history`).set(auth(user1Token));
      assert.equal(history.body.history.length, 2);
    });

    it('reopening a completed task clears completed_at; PUT status changes are also tracked', async () => {
      const res = await request(app).put(`/api/tasks/${taskId}`).set(auth(user1Token)).send({ status: 'active' });
      assert.equal(res.status, 200);
      assert.equal(res.body.task.completed_at, null);
      const history = await request(app).get(`/api/tasks/${taskId}/history`).set(auth(user1Token));
      assert.equal(history.body.history.length, 3);
      assert.equal(history.body.history[2].new_status, 'active');
    });

    it('subtask CRUD keeps completed_at in sync', async () => {
      const created = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .set(auth(user1Token))
        .send({ title: 'Proofread' });
      assert.equal(created.status, 201);
      assert.equal(created.body.subtask.sort_order, 2);
      subtaskId = created.body.subtask.id;

      const done = await request(app)
        .put(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
        .set(auth(user1Token))
        .send({ isCompleted: true });
      assert.equal(done.status, 200);
      assert.equal(done.body.subtask.is_completed, true);
      assert.ok(done.body.subtask.completed_at);

      const undone = await request(app)
        .put(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
        .set(auth(user1Token))
        .send({ isCompleted: false, title: 'Proofread twice' });
      assert.equal(undone.body.subtask.completed_at, null);
      assert.equal(undone.body.subtask.title, 'Proofread twice');

      const wrongTask = await request(app)
        .put(`/api/tasks/${inboxTaskId}/subtasks/${subtaskId}`)
        .set(auth(user1Token))
        .send({ title: 'Moved' });
      assert.equal(wrongTask.status, 404);

      const del = await request(app).delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`).set(auth(user1Token));
      assert.equal(del.status, 200);
      const detail = await request(app).get(`/api/tasks/${taskId}`).set(auth(user1Token));
      assert.equal(detail.body.task.subtasks.length, 2);
    });

    it("users cannot access another user's tasks, subtasks or history", async () => {
      const list = await request(app).get('/api/tasks').set(auth(user2Token));
      assert.equal(list.body.data.length, 0);

      const subtasks = (await request(app).get(`/api/tasks/${taskId}`).set(auth(user1Token))).body.task.subtasks;
      const attempts = [
        request(app).get(`/api/tasks/${taskId}`).set(auth(user2Token)),
        request(app).put(`/api/tasks/${taskId}`).set(auth(user2Token)).send({ title: 'Hacked' }),
        request(app).patch(`/api/tasks/${taskId}/status`).set(auth(user2Token)).send({ status: 'cancelled' }),
        request(app).get(`/api/tasks/${taskId}/history`).set(auth(user2Token)),
        request(app).post(`/api/tasks/${taskId}/subtasks`).set(auth(user2Token)).send({ title: 'Sneaky' }),
        request(app).put(`/api/tasks/${taskId}/subtasks/${subtasks[0].id}`).set(auth(user2Token)).send({ isCompleted: true }),
        request(app).delete(`/api/tasks/${taskId}`).set(auth(user2Token)),
      ];
      for (const res of await Promise.all(attempts)) {
        assert.equal(res.status, 404);
      }
    });

    it('DELETE /api/tasks/:id removes the task with its subtasks and history', async () => {
      const res = await request(app).delete(`/api/tasks/${inboxTaskId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Task deleted successfully.');
      const history = await request(app).get(`/api/tasks/${inboxTaskId}/history`).set(auth(user1Token));
      assert.equal(history.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('2. Daily Priorities', () => {
    const ids: string[] = [];
    let yesterdayId: string;

    it('creates up to three priorities for today (default date) in order', async () => {
      for (const title of ['Ship feature', 'Gym', 'Call parents']) {
        const res = await request(app).post('/api/priorities').set(auth(user1Token)).send({ title });
        assert.equal(res.status, 201);
        assert.equal(res.body.priority.priority_date, today);
        ids.push(res.body.priority.id);
      }
      const list = await request(app).get(`/api/priorities?date=${today}`).set(auth(user1Token));
      assert.deepEqual(list.body.data.map((p: any) => p.priority_order), [1, 2, 3]);
    });

    it('rejects a fourth priority for the same day', async () => {
      const res = await request(app).post('/api/priorities').set(auth(user1Token)).send({ title: 'One too many' });
      assert.equal(res.status, 409);
    });

    it('enforces the limit under concurrent creation', async () => {
      const date = addDays(today, 10);
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((n) =>
          request(app).post('/api/priorities').set(auth(user1Token)).send({ title: `Parallel ${n}`, priorityDate: date })
        )
      );
      assert.equal(results.filter((r) => r.status === 201).length, 3);
      assert.equal(results.filter((r) => r.status === 409).length, 2);
      const list = await request(app).get(`/api/priorities?date=${date}`).set(auth(user1Token));
      assert.equal(list.body.data.length, 3);
    });

    it('preserves priorities for previous dates', async () => {
      const res = await request(app)
        .post('/api/priorities')
        .set(auth(user1Token))
        .send({ title: 'Yesterday focus', priorityDate: addDays(today, -1) });
      assert.equal(res.status, 201);
      yesterdayId = res.body.priority.id;

      const yesterday = await request(app).get(`/api/priorities?date=${addDays(today, -1)}`).set(auth(user1Token));
      assert.equal(yesterday.body.data.length, 1);
      const todays = await request(app).get(`/api/priorities?date=${today}`).set(auth(user1Token));
      assert.equal(todays.body.data.length, 3);

      const range = await request(app)
        .get(`/api/priorities?startDate=${addDays(today, -1)}&endDate=${today}`)
        .set(auth(user1Token));
      assert.equal(range.body.data.length, 4);
    });

    it('uses the user timezone for the default date', async () => {
      // User 2 has no priorities yet, so the limit can't interfere whichever date Kiritimati is on
      const res = await request(app)
        .post('/api/priorities')
        .set(auth(user2Token))
        .set('X-Timezone', 'Pacific/Kiritimati')
        .send({ title: 'Island time' });
      assert.equal(res.status, 201);
      assert.equal(res.body.priority.priority_date, getTodayInTimezone('Pacific/Kiritimati'));
      await request(app).delete(`/api/priorities/${res.body.priority.id}`).set(auth(user2Token));
    });

    it('GET /:id and PUT /:id', async () => {
      const get = await request(app).get(`/api/priorities/${ids[0]}`).set(auth(user1Token));
      assert.equal(get.status, 200);
      assert.equal(get.body.priority.title, 'Ship feature');

      const put = await request(app)
        .put(`/api/priorities/${ids[0]}`)
        .set(auth(user1Token))
        .send({ title: 'Ship feature v2', description: 'Behind a flag' });
      assert.equal(put.status, 200);
      assert.equal(put.body.priority.title, 'Ship feature v2');
    });

    it('PATCH /:id/completion toggles completed_at', async () => {
      const done = await request(app).patch(`/api/priorities/${ids[1]}/completion`).set(auth(user1Token)).send({ isCompleted: true });
      assert.equal(done.status, 200);
      assert.equal(done.body.priority.is_completed, true);
      assert.ok(done.body.priority.completed_at);

      const undone = await request(app).patch(`/api/priorities/${ids[1]}/completion`).set(auth(user1Token)).send({ isCompleted: false });
      assert.equal(undone.body.priority.is_completed, false);
      assert.equal(undone.body.priority.completed_at, null);
    });

    it('PATCH /reorder reorders a day and validates the ID set', async () => {
      const reversed = [...ids].reverse();
      const res = await request(app)
        .patch('/api/priorities/reorder')
        .set(auth(user1Token))
        .send({ priorityDate: today, priorityIds: reversed });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.priorities.map((p: any) => p.id), reversed);
      assert.deepEqual(res.body.priorities.map((p: any) => p.priority_order), [1, 2, 3]);

      const missing = await request(app)
        .patch('/api/priorities/reorder')
        .set(auth(user1Token))
        .send({ priorityDate: today, priorityIds: reversed.slice(0, 2) });
      assert.equal(missing.status, 400);

      const otherDay = await request(app)
        .patch('/api/priorities/reorder')
        .set(auth(user1Token))
        .send({ priorityDate: today, priorityIds: [reversed[0], reversed[1], yesterdayId] });
      assert.equal(otherDay.status, 400);

      const dupes = await request(app)
        .patch('/api/priorities/reorder')
        .set(auth(user1Token))
        .send({ priorityDate: today, priorityIds: [ids[0], ids[0]] });
      assert.equal(dupes.status, 400);
    });

    it('DELETE compacts the remaining order and frees a slot', async () => {
      // Current order: ids[2], ids[1], ids[0] -> delete the middle one
      const res = await request(app).delete(`/api/priorities/${ids[1]}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const list = await request(app).get(`/api/priorities?date=${today}`).set(auth(user1Token));
      assert.deepEqual(list.body.data.map((p: any) => [p.id, p.priority_order]), [[ids[2], 1], [ids[0], 2]]);

      const again = await request(app).post('/api/priorities').set(auth(user1Token)).send({ title: 'Replacement' });
      assert.equal(again.status, 201);
      assert.equal(again.body.priority.priority_order, 3);
    });

    it("users cannot access another user's priorities", async () => {
      const list = await request(app).get(`/api/priorities?date=${today}`).set(auth(user2Token));
      assert.equal(list.body.data.length, 0);
      const get = await request(app).get(`/api/priorities/${ids[0]}`).set(auth(user2Token));
      assert.equal(get.status, 404);
      const reorder = await request(app)
        .patch('/api/priorities/reorder')
        .set(auth(user2Token))
        .send({ priorityDate: today, priorityIds: [ids[0]] });
      assert.equal(reorder.status, 404);
      const del = await request(app).delete(`/api/priorities/${ids[0]}`).set(auth(user2Token));
      assert.equal(del.status, 404);

      // User 2 has their own independent limit
      const own = await request(app).post('/api/priorities').set(auth(user2Token)).send({ title: 'Mine' });
      assert.equal(own.status, 201);
    });
  });

  // ------------------------------------------------------------------
  describe('3. Daily Intentions', () => {
    let todayId: string;
    let yesterdayId: string;

    it('creates today\'s intention by default', async () => {
      const res = await request(app).post('/api/intentions').set(auth(user1Token)).send({ content: 'Be present' });
      assert.equal(res.status, 201);
      assert.equal(res.body.intention.intention_date, today);
      todayId = res.body.intention.id;
    });

    it('allows only one intention per day', async () => {
      const res = await request(app).post('/api/intentions').set(auth(user1Token)).send({ content: 'Another', intentionDate: today });
      assert.equal(res.status, 409);
      assert.equal(res.body.errors[0].existingIntentionId, todayId);
    });

    it('creating for another date does not overwrite existing intentions', async () => {
      const res = await request(app)
        .post('/api/intentions')
        .set(auth(user1Token))
        .send({ content: 'Rest well', intentionDate: addDays(today, -1) });
      assert.equal(res.status, 201);
      yesterdayId = res.body.intention.id;

      const range = await request(app)
        .get(`/api/intentions?startDate=${addDays(today, -1)}&endDate=${today}`)
        .set(auth(user1Token));
      assert.equal(range.body.data.length, 2);
      assert.deepEqual(range.body.data.map((i: any) => i.content), ['Be present', 'Rest well']);
    });

    it('PUT updates the existing record for that date only', async () => {
      const res = await request(app).put(`/api/intentions/${todayId}`).set(auth(user1Token)).send({ content: 'Be kind' });
      assert.equal(res.status, 200);
      assert.equal(res.body.intention.id, todayId);
      assert.equal(res.body.intention.content, 'Be kind');

      const yesterday = await request(app).get(`/api/intentions/${yesterdayId}`).set(auth(user1Token));
      assert.equal(yesterday.body.intention.content, 'Rest well');

      const byDate = await request(app).get(`/api/intentions?date=${today}`).set(auth(user1Token));
      assert.equal(byDate.body.data.length, 1);
    });

    it('uses the user timezone for the default date', async () => {
      const kiritimati = getTodayInTimezone('Pacific/Kiritimati');
      const res = await request(app)
        .post('/api/intentions?timezone=Pacific/Kiritimati')
        .set(auth(user2Token))
        .send({ content: 'Sunrise first' });
      assert.equal(res.status, 201);
      assert.equal(res.body.intention.intention_date, kiritimati);
      // Kiritimati may be on the same calendar date as UTC; free the slot for later tests
      await request(app).delete(`/api/intentions/${res.body.intention.id}`).set(auth(user2Token));
    });

    it("users cannot access another user's intentions", async () => {
      const get = await request(app).get(`/api/intentions/${todayId}`).set(auth(user2Token));
      assert.equal(get.status, 404);
      const put = await request(app).put(`/api/intentions/${todayId}`).set(auth(user2Token)).send({ content: 'x' });
      assert.equal(put.status, 404);
      // User 2 can still have their own intention for the same date
      const own = await request(app).post('/api/intentions').set(auth(user2Token)).send({ content: 'Mine', intentionDate: today });
      assert.equal(own.status, 201);
    });

    it('DELETE removes an intention', async () => {
      const res = await request(app).delete(`/api/intentions/${yesterdayId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const again = await request(app).get(`/api/intentions/${yesterdayId}`).set(auth(user1Token));
      assert.equal(again.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('4. Notes, Categories & Tags', () => {
    let categoryId: string;
    let reflectionId: string;
    let ideaId: string;

    it('note category CRUD with duplicate protection', async () => {
      const created = await request(app).post('/api/notes/categories').set(auth(user1Token)).send({ name: 'Mindset', color: '#8B5CF6' });
      assert.equal(created.status, 201);
      categoryId = created.body.category.id;

      const dup = await request(app).post('/api/notes/categories').set(auth(user1Token)).send({ name: 'mindset' });
      assert.equal(dup.status, 409);

      const updated = await request(app).put(`/api/notes/categories/${categoryId}`).set(auth(user1Token)).send({ color: '#000000' });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.category.color, '#000000');

      const list = await request(app).get('/api/notes/categories').set(auth(user1Token));
      assert.equal(list.body.categories.length, 1);

      const other = await request(app).get('/api/notes/categories').set(auth(user2Token));
      assert.equal(other.body.categories.length, 0);
    });

    it('creates a note with a category and de-duplicated tags', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set(auth(user1Token))
        .send({
          title: 'Evening reflection',
          content: 'Felt calm after the walk',
          noteType: 'reflection',
          categoryId,
          tags: ['Focus', 'focus', ' Gratitude '],
          occurredAt: '2026-10-20T18:30:00.000Z',
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.note.category_name, 'Mindset');
      assert.deepEqual(res.body.note.tags, ['focus', 'gratitude']);
      reflectionId = res.body.note.id;
    });

    it('rejects categories that are not the user\'s', async () => {
      const res = await request(app).post('/api/notes').set(auth(user2Token)).send({ title: 'x', categoryId });
      assert.equal(res.status, 404);
    });

    it('creates more notes for filter tests', async () => {
      const idea = await request(app)
        .post('/api/notes')
        .set(auth(user1Token))
        .send({ title: 'App idea', content: 'Habit buddy matching', noteType: 'idea', tags: ['product'] });
      assert.equal(idea.status, 201);
      ideaId = idea.body.note.id;

      const general = await request(app).post('/api/notes').set(auth(user1Token)).send({ title: 'Groceries', content: 'Oats, berries' });
      assert.equal(general.body.note.note_type, 'general');
      assert.deepEqual(general.body.note.tags, []);
    });

    it('PATCH /:id/pin pins a note and pinned notes come first', async () => {
      const res = await request(app).patch(`/api/notes/${reflectionId}/pin`).set(auth(user1Token)).send({ isPinned: true });
      assert.equal(res.status, 200);
      assert.equal(res.body.note.is_pinned, true);

      const list = await request(app).get('/api/notes').set(auth(user1Token));
      assert.equal(list.body.data[0].id, reflectionId);
      assert.ok(Array.isArray(list.body.data[0].tags));
    });

    it('GET /api/notes filters by type, category, tag and pinned status', async () => {
      const byType = await request(app).get('/api/notes?noteType=idea').set(auth(user1Token));
      assert.deepEqual(byType.body.data.map((n: any) => n.id), [ideaId]);

      const byCategory = await request(app).get(`/api/notes?categoryId=${categoryId}`).set(auth(user1Token));
      assert.deepEqual(byCategory.body.data.map((n: any) => n.id), [reflectionId]);

      const byTag = await request(app).get('/api/notes?tag=FOCUS').set(auth(user1Token));
      assert.deepEqual(byTag.body.data.map((n: any) => n.id), [reflectionId]);

      const pinned = await request(app).get('/api/notes?isPinned=true').set(auth(user1Token));
      assert.equal(pinned.body.data.length, 1);
      const unpinned = await request(app).get('/api/notes?isPinned=false').set(auth(user1Token));
      assert.equal(unpinned.body.data.length, 2);
    });

    it('archived notes are hidden by default but remain retrievable', async () => {
      const archived = await request(app).patch(`/api/notes/${ideaId}/archive`).set(auth(user1Token)).send({});
      assert.equal(archived.status, 200);
      assert.ok(archived.body.note.archived_at);

      const active = await request(app).get('/api/notes').set(auth(user1Token));
      assert.ok(!active.body.data.some((n: any) => n.id === ideaId));

      const onlyArchived = await request(app).get('/api/notes?archived=true').set(auth(user1Token));
      assert.deepEqual(onlyArchived.body.data.map((n: any) => n.id), [ideaId]);

      const all = await request(app).get('/api/notes?archived=all').set(auth(user1Token));
      assert.equal(all.body.data.length, 3);

      const detail = await request(app).get(`/api/notes/${ideaId}`).set(auth(user1Token));
      assert.equal(detail.status, 200);

      const unarchived = await request(app).patch(`/api/notes/${ideaId}/archive`).set(auth(user1Token)).send({ archived: false });
      assert.equal(unarchived.body.note.archived_at, null);
    });

    it('GET /api/notes/search matches title, content and tags with pagination', async () => {
      const byTitle = await request(app).get('/api/notes/search?q=reflection').set(auth(user1Token));
      assert.deepEqual(byTitle.body.data.map((n: any) => n.id), [reflectionId]);

      const byContent = await request(app).get('/api/notes/search?q=buddy').set(auth(user1Token));
      assert.deepEqual(byContent.body.data.map((n: any) => n.id), [ideaId]);

      const byTag = await request(app).get('/api/notes/search?q=gratit').set(auth(user1Token));
      assert.deepEqual(byTag.body.data.map((n: any) => n.id), [reflectionId]);

      const withType = await request(app).get('/api/notes/search?q=a&noteType=idea').set(auth(user1Token));
      assert.deepEqual(withType.body.data.map((n: any) => n.id), [ideaId]);

      const paged = await request(app).get('/api/notes/search?q=e&limit=1&sortBy=title&sortOrder=asc').set(auth(user1Token));
      assert.equal(paged.body.data.length, 1);
      assert.ok(paged.body.pagination.total >= 2);

      const missingQ = await request(app).get('/api/notes/search').set(auth(user1Token));
      assert.equal(missingQ.status, 400);

      const other = await request(app).get('/api/notes/search?q=reflection').set(auth(user2Token));
      assert.equal(other.body.data.length, 0);
    });

    it('PUT /api/notes/:id/tags adds or replaces tags without duplicates', async () => {
      const added = await request(app)
        .put(`/api/notes/${reflectionId}/tags`)
        .set(auth(user1Token))
        .send({ tags: ['focus', 'calm'], mode: 'add' });
      assert.equal(added.status, 200);
      assert.deepEqual(added.body.note.tags, ['calm', 'focus', 'gratitude']);

      const replaced = await request(app)
        .put(`/api/notes/${reflectionId}/tags`)
        .set(auth(user1Token))
        .send({ tags: ['evening'] });
      assert.deepEqual(replaced.body.note.tags, ['evening']);
    });

    it('PUT /api/notes/:id updates fields and replaces tags when given', async () => {
      const res = await request(app)
        .put(`/api/notes/${reflectionId}`)
        .set(auth(user1Token))
        .send({ title: 'Evening reflection (edited)', tags: ['walks', 'Walks'] });
      assert.equal(res.status, 200);
      assert.equal(res.body.note.title, 'Evening reflection (edited)');
      assert.deepEqual(res.body.note.tags, ['walks']);
    });

    it('deleting a category keeps its notes', async () => {
      const res = await request(app).delete(`/api/notes/categories/${categoryId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const note = await request(app).get(`/api/notes/${reflectionId}`).set(auth(user1Token));
      assert.equal(note.status, 200);
      assert.equal(note.body.note.category_id, null);
    });

    it("users cannot access another user's notes or tags", async () => {
      const attempts = [
        request(app).get(`/api/notes/${reflectionId}`).set(auth(user2Token)),
        request(app).put(`/api/notes/${reflectionId}`).set(auth(user2Token)).send({ title: 'x' }),
        request(app).patch(`/api/notes/${reflectionId}/pin`).set(auth(user2Token)).send({ isPinned: false }),
        request(app).patch(`/api/notes/${reflectionId}/archive`).set(auth(user2Token)).send({}),
        request(app).put(`/api/notes/${reflectionId}/tags`).set(auth(user2Token)).send({ tags: ['x'] }),
        request(app).delete(`/api/notes/${reflectionId}`).set(auth(user2Token)),
      ];
      for (const res of await Promise.all(attempts)) {
        assert.equal(res.status, 404);
      }
    });

    it('DELETE removes a note and its tags', async () => {
      const res = await request(app).delete(`/api/notes/${ideaId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const search = await request(app).get('/api/notes/search?q=product&archived=all').set(auth(user1Token));
      assert.equal(search.body.data.length, 0);
    });
  });

  // ------------------------------------------------------------------
  describe('5. Learning & Reviews', () => {
    let entryId: string;
    let upcomingId: string;
    let reviewId: string;

    it('creates a learning entry with learnedAt defaulting to today', async () => {
      const res = await request(app)
        .post('/api/learning')
        .set(auth(user1Token))
        .send({
          title: 'Spaced repetition',
          content: 'Reviewing at increasing intervals improves retention',
          keyTakeaway: 'Review after 1, 3, 7 days',
          category: 'Memory',
          source: 'Make It Stick',
          reviewDate: addDays(today, 3),
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.learning.learned_at, today);
      upcomingId = res.body.learning.id;
    });

    it('validates review date and required fields', async () => {
      const early = await request(app)
        .post('/api/learning')
        .set(auth(user1Token))
        .send({ title: 'x', learnedAt: today, reviewDate: addDays(today, -1) });
      assert.equal(early.status, 400);
      const title = await request(app).post('/api/learning').set(auth(user1Token)).send({ content: 'no title' });
      assert.equal(title.status, 400);
    });

    it('creates entries for filters and upcoming reviews', async () => {
      const overdue = await request(app)
        .post('/api/learning')
        .set(auth(user1Token))
        .send({ title: 'SQL window functions', category: 'Databases', source: 'Postgres docs', learnedAt: addDays(today, -10), reviewDate: addDays(today, -1) });
      assert.equal(overdue.status, 201);
      entryId = overdue.body.learning.id;

      const later = await request(app)
        .post('/api/learning')
        .set(auth(user1Token))
        .send({ title: 'Negotiation basics', category: 'Career', learnedAt: addDays(today, -2), reviewDate: addDays(today, 20) });
      assert.equal(later.status, 201);

      const noReview = await request(app)
        .post('/api/learning')
        .set(auth(user1Token))
        .send({ title: 'Sourdough hydration', category: 'Cooking', learnedAt: addDays(today, -5) });
      assert.equal(noReview.status, 201);
    });

    it('GET /api/learning filters by category, learning date and review date with sorting', async () => {
      const byCategory = await request(app).get('/api/learning?category=databases').set(auth(user1Token));
      assert.deepEqual(byCategory.body.data.map((e: any) => e.id), [entryId]);

      const learnedRange = await request(app)
        .get(`/api/learning?learnedFrom=${addDays(today, -5)}&learnedTo=${today}`)
        .set(auth(user1Token));
      assert.equal(learnedRange.body.data.length, 3);

      const reviewRange = await request(app)
        .get(`/api/learning?reviewFrom=${today}&reviewTo=${addDays(today, 30)}&sortBy=reviewDate&sortOrder=asc`)
        .set(auth(user1Token));
      assert.deepEqual(reviewRange.body.data.map((e: any) => e.title), ['Spaced repetition', 'Negotiation basics']);

      const sorted = await request(app).get('/api/learning?sortBy=learnedAt&sortOrder=desc&limit=2').set(auth(user1Token));
      assert.equal(sorted.body.data[0].learned_at, today);
      assert.equal(sorted.body.pagination.total, 4);
    });

    it('GET /api/learning/search matches title, content, category and source', async () => {
      const cases: [string, string][] = [
        ['window', 'SQL window functions'],
        ['retention', 'Spaced repetition'],
        ['cooking', 'Sourdough hydration'],
        ['postgres docs', 'SQL window functions'],
      ];
      for (const [q, title] of cases) {
        const res = await request(app).get(`/api/learning/search?q=${encodeURIComponent(q)}`).set(auth(user1Token));
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data.map((e: any) => e.title), [title]);
      }
      const missing = await request(app).get('/api/learning/search').set(auth(user1Token));
      assert.equal(missing.status, 400);
    });

    it('GET /api/learning/upcoming-reviews returns due and approaching entries', async () => {
      const def = await request(app).get('/api/learning/upcoming-reviews').set(auth(user1Token));
      assert.equal(def.status, 200);
      assert.deepEqual(def.body.data.map((e: any) => e.title), ['SQL window functions', 'Spaced repetition']);
      assert.equal(def.body.data[0].is_overdue, true);
      assert.equal(def.body.data[0].days_until_review, -1);
      assert.equal(def.body.data[1].days_until_review, 3);

      const noOverdue = await request(app).get('/api/learning/upcoming-reviews?includeOverdue=false').set(auth(user1Token));
      assert.deepEqual(noOverdue.body.data.map((e: any) => e.title), ['Spaced repetition']);

      const wide = await request(app).get('/api/learning/upcoming-reviews?days=30').set(auth(user1Token));
      assert.equal(wide.body.data.length, 3);

      const explicit = await request(app)
        .get(`/api/learning/upcoming-reviews?startDate=${addDays(today, 10)}&endDate=${addDays(today, 25)}`)
        .set(auth(user1Token));
      assert.deepEqual(explicit.body.data.map((e: any) => e.title), ['Negotiation basics']);

      const other = await request(app).get('/api/learning/upcoming-reviews?days=30').set(auth(user2Token));
      assert.equal(other.body.data.length, 0);
    });

    it('reviews are kept as history and can schedule the next review', async () => {
      const first = await request(app)
        .post(`/api/learning/${entryId}/reviews`)
        .set(auth(user1Token))
        .send({ reflection: 'Remembered ROW_NUMBER', understandingLevel: 3, reviewedAt: '2026-10-01T10:00:00.000Z' });
      assert.equal(first.status, 201);
      assert.equal(first.body.review.understanding_level, 3);
      reviewId = first.body.review.id;

      const second = await request(app)
        .post(`/api/learning/${entryId}/reviews`)
        .set(auth(user1Token))
        .send({ reflection: 'Now comfortable with LAG/LEAD', understandingLevel: 5, nextReviewDate: addDays(today, 14) });
      assert.equal(second.status, 201);
      assert.equal(second.body.learning.review_date, addDays(today, 14));

      const history = await request(app).get(`/api/learning/${entryId}/reviews`).set(auth(user1Token));
      assert.equal(history.body.reviews.length, 2);
      assert.equal(history.body.reviews[0].understanding_level, 5);
      assert.equal(history.body.reviews[1].id, reviewId);

      const detail = await request(app).get(`/api/learning/${entryId}`).set(auth(user1Token));
      assert.equal(detail.body.learning.review_count, 2);
      assert.equal(detail.body.learning.is_overdue, false);
    });

    it('validates understanding level 1-5', async () => {
      for (const level of [0, 6, 2.5]) {
        const res = await request(app)
          .post(`/api/learning/${entryId}/reviews`)
          .set(auth(user1Token))
          .send({ understandingLevel: level });
        assert.equal(res.status, 400);
      }
    });

    it('PUT and DELETE a review', async () => {
      const put = await request(app)
        .put(`/api/learning/${entryId}/reviews/${reviewId}`)
        .set(auth(user1Token))
        .send({ understandingLevel: 4 });
      assert.equal(put.status, 200);
      assert.equal(put.body.review.understanding_level, 4);

      const wrongEntry = await request(app)
        .put(`/api/learning/${upcomingId}/reviews/${reviewId}`)
        .set(auth(user1Token))
        .send({ understandingLevel: 1 });
      assert.equal(wrongEntry.status, 404);

      const del = await request(app).delete(`/api/learning/${entryId}/reviews/${reviewId}`).set(auth(user1Token));
      assert.equal(del.status, 200);
      const history = await request(app).get(`/api/learning/${entryId}/reviews`).set(auth(user1Token));
      assert.equal(history.body.reviews.length, 1);
    });

    it('PUT /api/learning/:id updates an entry', async () => {
      const res = await request(app)
        .put(`/api/learning/${upcomingId}`)
        .set(auth(user1Token))
        .send({ keyTakeaway: 'Review after 1, 3, 7, 14 days', source: null });
      assert.equal(res.status, 200);
      assert.equal(res.body.learning.source, null);

      const bad = await request(app)
        .put(`/api/learning/${upcomingId}`)
        .set(auth(user1Token))
        .send({ reviewDate: addDays(today, -30) });
      assert.equal(bad.status, 400);
    });

    it("users cannot access another user's learning entries or reviews", async () => {
      const attempts = [
        request(app).get(`/api/learning/${entryId}`).set(auth(user2Token)),
        request(app).put(`/api/learning/${entryId}`).set(auth(user2Token)).send({ title: 'x' }),
        request(app).post(`/api/learning/${entryId}/reviews`).set(auth(user2Token)).send({ reflection: 'x' }),
        request(app).get(`/api/learning/${entryId}/reviews`).set(auth(user2Token)),
        request(app).delete(`/api/learning/${entryId}`).set(auth(user2Token)),
      ];
      for (const res of await Promise.all(attempts)) {
        assert.equal(res.status, 404);
      }
    });

    it('DELETE removes an entry and its reviews', async () => {
      const res = await request(app).delete(`/api/learning/${entryId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const reviews = await request(app).get(`/api/learning/${entryId}/reviews`).set(auth(user1Token));
      assert.equal(reviews.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('6. Dashboard integration', () => {
    const widgetsOf = (res: any) => Object.fromEntries(res.body.dashboard.widgets.map((w: any) => [w.key, w]));

    it('seeds data for user 3', async () => {
      const H = auth(user3Token);
      const done = await request(app).post('/api/tasks').set(H).send({ title: 'Done today', scheduledDate: today, startTime: '08:00' });
      await request(app).patch(`/api/tasks/${done.body.task.id}/status`).set(H).send({ status: 'completed' });
      await request(app).post('/api/tasks').set(H).send({ title: 'Active today', scheduledDate: today, status: 'active', priority: 'urgent' });
      await request(app).post('/api/tasks').set(H).send({ title: 'Cancelled today', scheduledDate: today, status: 'cancelled' });
      await request(app).post('/api/tasks').set(H).send({ title: 'Overdue', dueDate: addDays(today, -1) });
      await request(app).post('/api/tasks').set(H).send({ title: 'Later this week', scheduledDate: addDays(today, 2) });

      await request(app).post('/api/priorities').set(H).send({ title: 'Priority A' });
      await request(app).post('/api/priorities').set(H).send({ title: 'Priority B' });
      await request(app).post('/api/intentions').set(H).send({ content: 'Slow and steady' });

      await request(app).post('/api/notes').set(H).send({ title: 'Morning journal', noteType: 'journal', tags: ['morning'] });
      const archived = await request(app).post('/api/notes').set(H).send({ title: 'Old idea', noteType: 'idea' });
      await request(app).patch(`/api/notes/${archived.body.note.id}/archive`).set(H).send({});

      await request(app).post('/api/learning').set(H).send({ title: 'Overdue topic', learnedAt: addDays(today, -10), reviewDate: addDays(today, -1) });
      await request(app).post('/api/learning').set(H).send({ title: 'Soon topic', reviewDate: addDays(today, 2) });
    });

    it("shows today's tasks with overdue items and a completion summary", async () => {
      const res = await request(app).get('/api/dashboard?period=day').set(auth(user3Token));
      assert.equal(res.status, 200);
      const w = widgetsOf(res);

      assert.equal(w.todays_tasks.available, true);
      assert.equal(w.todays_tasks.data.total, 3);
      assert.equal(w.todays_tasks.data.completed, 1);
      assert.deepEqual(w.todays_tasks.data.overdue.map((t: any) => t.title), ['Overdue']);

      assert.equal(w.task_completion.data.total, 3);
      assert.equal(w.task_completion.data.completed, 1);
      assert.equal(w.task_completion.data.open, 1);
      assert.equal(w.task_completion.data.byStatus.cancelled, 1);
      assert.equal(w.task_completion.data.completionRate, 50);
    });

    it("shows today's priorities and intention", async () => {
      const w = widgetsOf(await request(app).get('/api/dashboard').set(auth(user3Token)));
      assert.equal(w.todays_priorities.data.total, 2);
      assert.equal(w.todays_priorities.data.maxPerDay, 3);
      assert.deepEqual(w.todays_priorities.data.priorities.map((p: any) => p.title), ['Priority A', 'Priority B']);
      assert.equal(w.todays_intention.data.intention.content, 'Slow and steady');
    });

    it('shows recent non-archived notes and learning review status', async () => {
      const w = widgetsOf(await request(app).get('/api/dashboard').set(auth(user3Token)));
      assert.deepEqual(w.recent_notes.data.notes.map((n: any) => n.title), ['Morning journal']);
      assert.deepEqual(w.recent_notes.data.notes[0].tags, ['morning']);

      assert.equal(w.learning_summary.available, true);
      assert.equal(w.learning_summary.data.recentEntries.length, 2);
      assert.equal(w.learning_summary.data.dueForReview, 2);
      assert.equal(w.learning_summary.data.overdueReviews, 1);
    });

    it('adds open tasks to upcoming commitments and the daily progress chart', async () => {
      const w = widgetsOf(await request(app).get('/api/dashboard?period=day').set(auth(user3Token)));
      const taskItems = w.upcoming_commitments.data.items.filter((i: any) => i.type === 'task');
      assert.deepEqual(taskItems.map((i: any) => i.name), ['Active today', 'Later this week']);
      assert.deepEqual(w.upcoming_commitments.data.sources, ['habits', 'tasks']);

      const point = w.daily_progress_chart.data.points.find((p: any) => p.date === today);
      assert.equal(point.tasksPlanned, 2);
      assert.equal(point.tasksCompleted, 1);
    });

    it('only finance widgets remain unavailable', async () => {
      const res = await request(app).get('/api/dashboard').set(auth(user3Token));
      const unavailable = res.body.dashboard.widgets.filter((w: any) => !w.available).map((w: any) => w.key);
      assert.deepEqual(unavailable, ['money_spent_this_week', 'income_overview', 'investment_summary']);
    });

    it("never includes another user's records", async () => {
      const w = widgetsOf(await request(app).get('/api/dashboard').set(auth(user2Token)));
      assert.equal(w.todays_tasks.data.total, 0);
      assert.equal(w.todays_intention.data.intention.content, 'Mine');
      assert.equal(w.recent_notes.data.notes.length, 0);
      assert.equal(w.learning_summary.data.recentEntries.length, 0);
      assert.equal(w.todays_priorities.data.total, 1);
    });
  });
});
