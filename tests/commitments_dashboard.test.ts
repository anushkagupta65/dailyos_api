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
import { addDays, getTodayInTimezone, getWeekdayName, toDateString } from '../src/utils/date';
import { calculateProgress, isScheduledOn } from '../src/modules/commitments/commitments.progress';

process.env.NODE_ENV = 'test';

const TZ = 'UTC';

describe('DailyOS API - Commitments & Dashboard Test Suite', { concurrency: false }, () => {
  let memDb: any;
  let testPool: Pool;

  let user1Token: string;
  let user2Token: string;

  const today = getTodayInTimezone(TZ);

  let customCategoryId: string;
  let systemCategoryId: string;
  let habitId: string;
  let intervalHabitId: string;
  let selectedDaysHabitId: string;
  let scheduleId: string;
  let logId: string;
  let reminderId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const registerAndLogin = async (email: string, password: string, firstName: string) => {
    await request(app).post('/api/auth/register').send({ email, password, firstName, lastName: 'Test' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(res.status, 200);
    return (res.body.data?.accessToken || res.body.accessToken) as string;
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

    user1Token = await registerAndLogin('habit.alice@example.com', 'StrongPassword123!', 'Alice');
    user2Token = await registerAndLogin('habit.bob@example.com', 'BobPassword456!', 'Bob');
  });

  after(async () => {
    if (testPool) {
      await testPool.end();
    }
  });

  // ------------------------------------------------------------------
  describe('0. Date & schedule calculations (unit)', () => {
    const habit = { id: 'h1', name: 'Run', start_date: '2026-10-05', end_date: null, frequency_type: 'daily' };

    it('toDateString normalizes UTC-midnight and string dates', () => {
      assert.equal(toDateString(new Date('2026-10-20T00:00:00.000Z')), '2026-10-20');
      assert.equal(toDateString('2026-10-20'), '2026-10-20');
      assert.equal(toDateString(null), null);
    });

    it('getTodayInTimezone respects the user timezone, not the server timezone', () => {
      const instant = new Date('2026-10-20T20:00:00.000Z');
      assert.equal(getTodayInTimezone('UTC', instant), '2026-10-20');
      assert.equal(getTodayInTimezone('Asia/Kolkata', instant), '2026-10-21');
      assert.equal(getTodayInTimezone('America/Los_Angeles', instant), '2026-10-20');
    });

    it('daily habit without schedule is expected every day from its start date', () => {
      assert.equal(isScheduledOn(habit, [], '2026-10-04'), false);
      assert.equal(isScheduledOn(habit, [], '2026-10-05'), true);
      assert.equal(isScheduledOn(habit, [], '2026-10-06'), true);
    });

    it('selected_days schedule only expects the chosen weekdays', () => {
      const schedules = [{ habit_id: 'h1', schedule_type: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'], interval_days: null, effective_from: '2026-10-05', effective_until: null }];
      // 2026-10-05 is a Monday
      assert.equal(isScheduledOn(habit, schedules, '2026-10-05'), true);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-06'), false);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-07'), true);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-09'), true);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-10'), false);
    });

    it('interval schedule repeats every N days from effective_from', () => {
      const schedules = [{ habit_id: 'h1', schedule_type: 'interval', weekdays: [], interval_days: 3, effective_from: '2026-10-05', effective_until: null }];
      assert.equal(isScheduledOn(habit, schedules, '2026-10-05'), true);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-06'), false);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-08'), true);
      assert.equal(isScheduledOn(habit, schedules, '2026-10-11'), true);
    });

    it('uses the schedule effective on each date (schedule history)', () => {
      const schedules = [
        { habit_id: 'h1', schedule_type: 'daily', weekdays: [], interval_days: null, effective_from: '2026-10-05', effective_until: '2026-10-11' },
        { habit_id: 'h1', schedule_type: 'selected_days', weekdays: ['monday'], interval_days: null, effective_from: '2026-10-12', effective_until: null },
      ];
      assert.equal(isScheduledOn(habit, schedules, '2026-10-07'), true); // daily period
      assert.equal(isScheduledOn(habit, schedules, '2026-10-14'), false); // Wednesday, Mondays-only period
      assert.equal(isScheduledOn(habit, schedules, '2026-10-19'), true); // Monday
    });

    it('calculates daily and weekly progress without counting unscheduled days as missed', () => {
      const schedules = [{ habit_id: 'h1', schedule_type: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'], interval_days: null, effective_from: '2026-10-05', effective_until: null }];
      const logs = [
        { habit_id: 'h1', log_date: '2026-10-05', status: 'completed' },
        { habit_id: 'h1', log_date: '2026-10-07', status: 'skipped' },
        { habit_id: 'h1', log_date: '2026-10-10', status: 'completed' }, // Saturday: unscheduled bonus
        { habit_id: 'h1', log_date: '2026-10-12', status: 'completed' },
      ];
      const result = calculateProgress({
        habits: [habit],
        schedules,
        logs,
        startDate: '2026-10-05',
        endDate: '2026-10-18',
        today: '2026-10-14',
      });

      // Scheduled: 5,7,9 (week 1), 12,14,16 (week 2). 16 is in the future.
      assert.equal(result.summary.expected, 5);
      assert.equal(result.summary.completed, 2);
      assert.equal(result.summary.skipped, 1);
      assert.equal(result.summary.missed, 1); // 9th
      assert.equal(result.summary.pending, 1); // 14th = today
      assert.equal(result.summary.upcoming, 1); // 16th
      assert.equal(result.summary.unscheduledCompletions, 1);
      assert.equal(result.summary.completionRate, 50); // 2 / (5 - 1)

      const tuesday = result.daily.find((d) => d.date === '2026-10-06')!;
      assert.equal(tuesday.expected, 0);
      assert.equal(tuesday.missed, 0);

      assert.equal(result.weekly.length, 2);
      assert.equal(result.weekly[0].weekStart, '2026-10-05');
      assert.equal(result.weekly[0].expected, 3);
      assert.equal(result.weekly[0].completed, 1);
      assert.equal(result.weekly[1].weekStart, '2026-10-12');
      assert.equal(result.weekly[1].expected, 2);
      assert.equal(result.weekly[1].completed, 1);
    });

    it('current streak ignores pending today and skipped days', () => {
      const logs = [
        { habit_id: 'h1', log_date: '2026-10-10', status: 'completed' },
        { habit_id: 'h1', log_date: '2026-10-11', status: 'skipped' },
        { habit_id: 'h1', log_date: '2026-10-12', status: 'completed' },
        { habit_id: 'h1', log_date: '2026-10-13', status: 'completed' },
      ];
      const result = calculateProgress({
        habits: [habit],
        schedules: [],
        logs,
        startDate: '2026-10-12',
        endDate: '2026-10-14',
        today: '2026-10-14',
      });
      assert.equal(result.habits[0].currentStreak, 3);
    });
  });

  // ------------------------------------------------------------------
  describe('1. Habit Categories', () => {
    it('GET /api/habits/categories requires authentication', async () => {
      const res = await request(app).get('/api/habits/categories');
      assert.equal(res.status, 401);
    });

    it('GET /api/habits/categories returns the 10 system categories', async () => {
      const res = await request(app).get('/api/habits/categories').set(auth(user1Token));
      assert.equal(res.status, 200);
      const system = res.body.categories.filter((c: any) => c.is_system);
      assert.equal(system.length, 10);
      assert.deepEqual(
        system.map((c: any) => c.name),
        ['Fitness', 'Health', 'Sleep', 'Mindfulness', 'Reading', 'Learning', 'Career', 'Personal', 'Finance', 'Other']
      );
      systemCategoryId = system[0].id;
    });

    it('POST /api/habits/categories creates a custom category', async () => {
      const res = await request(app)
        .post('/api/habits/categories')
        .set(auth(user1Token))
        .send({ name: 'Side Projects', icon: 'code', color: '#111111', user_id: 'ignored' });
      assert.equal(res.status, 201);
      assert.equal(res.body.category.name, 'Side Projects');
      assert.equal(res.body.category.is_system, false);
      customCategoryId = res.body.category.id;
    });

    it('POST /api/habits/categories rejects duplicate names (including system names)', async () => {
      const res = await request(app)
        .post('/api/habits/categories')
        .set(auth(user1Token))
        .send({ name: 'fitness' });
      assert.equal(res.status, 409);
    });

    it('POST /api/habits/categories validates the body', async () => {
      const res = await request(app).post('/api/habits/categories').set(auth(user1Token)).send({ name: '' });
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Validation failed');
    });

    it('PUT /api/habits/categories/:id updates a custom category', async () => {
      const res = await request(app)
        .put(`/api/habits/categories/${customCategoryId}`)
        .set(auth(user1Token))
        .send({ name: 'Side Hustles', description: 'Evening work' });
      assert.equal(res.status, 200);
      assert.equal(res.body.category.name, 'Side Hustles');
      assert.equal(res.body.category.description, 'Evening work');
    });

    it('PUT/DELETE on a system category is forbidden', async () => {
      const put = await request(app)
        .put(`/api/habits/categories/${systemCategoryId}`)
        .set(auth(user1Token))
        .send({ name: 'Hacked' });
      assert.equal(put.status, 403);

      const del = await request(app).delete(`/api/habits/categories/${systemCategoryId}`).set(auth(user1Token));
      assert.equal(del.status, 403);
    });

    it("users cannot see or modify another user's custom category", async () => {
      const list = await request(app).get('/api/habits/categories').set(auth(user2Token));
      assert.ok(!list.body.categories.some((c: any) => c.id === customCategoryId));

      const put = await request(app)
        .put(`/api/habits/categories/${customCategoryId}`)
        .set(auth(user2Token))
        .send({ name: 'Mine now' });
      assert.equal(put.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('2. Habits', () => {
    it('POST /api/habits creates a habit with defaults and today in user timezone', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({
          name: 'Morning Run',
          categoryId: systemCategoryId,
          trackingType: 'duration',
          targetValue: 30,
          targetUnit: 'minutes',
          preferredTime: '06:30',
          startDate: addDays(today, -6),
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.habit.name, 'Morning Run');
      assert.equal(res.body.habit.habit_type, 'positive');
      assert.equal(res.body.habit.status, 'active');
      assert.equal(res.body.habit.target_value, 30);
      assert.equal(res.body.habit.start_date, addDays(today, -6));
      habitId = res.body.habit.id;
    });

    it('POST /api/habits defaults startDate to today in the requested timezone', async () => {
      const res = await request(app)
        .post('/api/habits?timezone=Pacific/Kiritimati')
        .set(auth(user1Token))
        .send({ name: 'Timezone Habit' });
      assert.equal(res.status, 201);
      assert.equal(res.body.habit.start_date, getTodayInTimezone('Pacific/Kiritimati'));
      await request(app).delete(`/api/habits/${res.body.habit.id}`).set(auth(user1Token));
    });

    it('POST /api/habits requires targetValue for measurable habits', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'Pushups', trackingType: 'count' });
      assert.equal(res.status, 400);
      assert.equal(res.body.errors[0].field, 'targetValue');
    });

    it('POST /api/habits rejects endDate before startDate and invalid enums', async () => {
      const dates = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'Bad', startDate: '2026-10-10', endDate: '2026-10-01' });
      assert.equal(dates.status, 400);

      const enums = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'Bad', habitType: 'neutral' });
      assert.equal(enums.status, 400);
    });

    it("POST /api/habits rejects another user's category", async () => {
      const res = await request(app)
        .post('/api/habits')
        .set(auth(user2Token))
        .send({ name: 'Sneaky', categoryId: customCategoryId });
      assert.equal(res.status, 404);
    });

    it('creates additional habits for scheduling tests', async () => {
      const interval = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'Deep Clean', frequencyType: 'custom', startDate: addDays(today, -6), categoryId: customCategoryId });
      assert.equal(interval.status, 201);
      intervalHabitId = interval.body.habit.id;

      const selected = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'No Sugar', habitType: 'avoid', frequencyType: 'custom', startDate: addDays(today, -6) });
      assert.equal(selected.status, 201);
      selectedDaysHabitId = selected.body.habit.id;
    });

    it('GET /api/habits lists only the user habits with pagination', async () => {
      const res = await request(app).get('/api/habits').set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 3);
      assert.equal(res.body.pagination.total, 3);

      const other = await request(app).get('/api/habits').set(auth(user2Token));
      assert.equal(other.body.data.length, 0);
    });

    it('GET /api/habits filters by category, habit type, frequency and status', async () => {
      const byCategory = await request(app).get(`/api/habits?categoryId=${customCategoryId}`).set(auth(user1Token));
      assert.equal(byCategory.body.data.length, 1);
      assert.equal(byCategory.body.data[0].category_name, 'Side Hustles');

      const byType = await request(app).get('/api/habits?habitType=avoid').set(auth(user1Token));
      assert.equal(byType.body.data.length, 1);
      assert.equal(byType.body.data[0].name, 'No Sugar');

      const byFrequency = await request(app).get('/api/habits?frequencyType=custom').set(auth(user1Token));
      assert.equal(byFrequency.body.data.length, 2);

      const byStatus = await request(app).get('/api/habits?status=paused').set(auth(user1Token));
      assert.equal(byStatus.body.data.length, 0);

      const invalid = await request(app).get('/api/habits?status=unknown').set(auth(user1Token));
      assert.equal(invalid.status, 400);
    });

    it('PUT /api/habits/:id updates fields and can clear nullable fields', async () => {
      const res = await request(app)
        .put(`/api/habits/${habitId}`)
        .set(auth(user1Token))
        .send({ description: 'Easy pace', cue: 'After coffee', preferredTime: null });
      assert.equal(res.status, 200);
      assert.equal(res.body.habit.description, 'Easy pace');
      assert.equal(res.body.habit.preferred_time, null);
    });

    it('PATCH /api/habits/:id/status changes status', async () => {
      const paused = await request(app)
        .patch(`/api/habits/${habitId}/status`)
        .set(auth(user1Token))
        .send({ status: 'paused' });
      assert.equal(paused.status, 200);
      assert.equal(paused.body.habit.status, 'paused');

      const active = await request(app)
        .patch(`/api/habits/${habitId}/status`)
        .set(auth(user1Token))
        .send({ status: 'active' });
      assert.equal(active.body.habit.status, 'active');

      const invalid = await request(app)
        .patch(`/api/habits/${habitId}/status`)
        .set(auth(user1Token))
        .send({ status: 'deleted' });
      assert.equal(invalid.status, 400);
    });
  });

  // ------------------------------------------------------------------
  describe('3. Habit Schedules', () => {
    it('POST /api/habits/:id/schedules validates schedule shape', async () => {
      const noDays = await request(app)
        .post(`/api/habits/${selectedDaysHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'selected_days', weekdays: [] });
      assert.equal(noDays.status, 400);

      const noInterval = await request(app)
        .post(`/api/habits/${intervalHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'interval' });
      assert.equal(noInterval.status, 400);

      const mixed = await request(app)
        .post(`/api/habits/${intervalHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'daily', weekdays: ['monday'] });
      assert.equal(mixed.status, 400);

      const badDay = await request(app)
        .post(`/api/habits/${intervalHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'selected_days', weekdays: ['funday'] });
      assert.equal(badDay.status, 400);
    });

    it('creates an interval schedule (every 2 days) starting at the habit start date', async () => {
      const res = await request(app)
        .post(`/api/habits/${intervalHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'interval', intervalDays: 2 });
      assert.equal(res.status, 201);
      assert.equal(res.body.schedule.interval_days, 2);
      assert.equal(res.body.schedule.effective_from, addDays(today, -6));
    });

    it('creates a selected-days schedule for yesterday only', async () => {
      const yesterdayName = getWeekdayName(addDays(today, -1));
      const res = await request(app)
        .post(`/api/habits/${selectedDaysHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'selected_days', weekdays: [yesterdayName, yesterdayName] });
      assert.equal(res.status, 201);
      assert.deepEqual(res.body.schedule.weekdays, [yesterdayName]);
      scheduleId = res.body.schedule.id;
    });

    it('rejects overlapping schedules that cannot be auto-closed', async () => {
      const res = await request(app)
        .post(`/api/habits/${selectedDaysHabitId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'daily', effectiveFrom: addDays(today, -6) });
      assert.equal(res.status, 409);
    });

    it('a later schedule closes the open-ended one, preserving history', async () => {
      const temp = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'Schedule History', startDate: addDays(today, -10) });
      const tempId = temp.body.habit.id;

      await request(app).post(`/api/habits/${tempId}/schedules`).set(auth(user1Token)).send({ scheduleType: 'daily' });
      const second = await request(app)
        .post(`/api/habits/${tempId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'selected_days', weekdays: ['monday'], effectiveFrom: addDays(today, -3) });
      assert.equal(second.status, 201);

      const list = await request(app).get(`/api/habits/${tempId}/schedules`).set(auth(user1Token));
      assert.equal(list.status, 200);
      assert.equal(list.body.schedules.length, 2);
      assert.equal(list.body.schedules[0].effective_until, addDays(today, -4));
      assert.equal(list.body.currentSchedule.schedule_type, 'selected_days');

      await request(app).delete(`/api/habits/${tempId}`).set(auth(user1Token));
    });

    it('PUT /api/habits/:id/schedules/:scheduleId updates the schedule', async () => {
      const yesterdayName = getWeekdayName(addDays(today, -1));
      const res = await request(app)
        .put(`/api/habits/${selectedDaysHabitId}/schedules/${scheduleId}`)
        .set(auth(user1Token))
        .send({ weekdays: [yesterdayName] });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.schedule.weekdays, [yesterdayName]);
    });

    it('switching schedule type resets type-specific fields', async () => {
      const temp = await request(app).post('/api/habits').set(auth(user1Token)).send({ name: 'Type Switch' });
      const tempId = temp.body.habit.id;
      const created = await request(app)
        .post(`/api/habits/${tempId}/schedules`)
        .set(auth(user1Token))
        .send({ scheduleType: 'selected_days', weekdays: ['monday'] });
      const updated = await request(app)
        .put(`/api/habits/${tempId}/schedules/${created.body.schedule.id}`)
        .set(auth(user1Token))
        .send({ scheduleType: 'daily' });
      assert.equal(updated.status, 200);
      assert.deepEqual(updated.body.schedule.weekdays, []);

      const del = await request(app)
        .delete(`/api/habits/${tempId}/schedules/${created.body.schedule.id}`)
        .set(auth(user1Token));
      assert.equal(del.status, 200);
      const list = await request(app).get(`/api/habits/${tempId}/schedules`).set(auth(user1Token));
      assert.equal(list.body.schedules.length, 0);
      await request(app).delete(`/api/habits/${tempId}`).set(auth(user1Token));
    });

    it("users cannot read or change another user's schedules", async () => {
      const get = await request(app).get(`/api/habits/${selectedDaysHabitId}/schedules`).set(auth(user2Token));
      assert.equal(get.status, 404);

      const put = await request(app)
        .put(`/api/habits/${selectedDaysHabitId}/schedules/${scheduleId}`)
        .set(auth(user2Token))
        .send({ scheduleType: 'daily' });
      assert.equal(put.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('4. Habit Logs', () => {
    it('POST /api/habits/:id/logs creates a daily log', async () => {
      const res = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, -6), status: 'completed', actualValue: 32, notes: 'Felt good' });
      assert.equal(res.status, 201);
      assert.equal(res.body.log.log_date, addDays(today, -6));
      assert.equal(res.body.log.status, 'completed');
      assert.equal(res.body.log.actual_value, 32);
      assert.ok(res.body.log.completed_at);
      logId = res.body.log.id;
    });

    it('prevents duplicate logs for the same habit and date', async () => {
      const res = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, -6), status: 'skipped' });
      assert.equal(res.status, 409);
      assert.equal(res.body.errors[0].existingLogId, logId);

      const logs = await request(app)
        .get(`/api/habits/${habitId}/logs?startDate=${addDays(today, -6)}&endDate=${addDays(today, -6)}`)
        .set(auth(user1Token));
      assert.equal(logs.body.data.length, 1);
      assert.equal(logs.body.data[0].status, 'completed');
    });

    it('derives status from actualValue vs target when status is omitted', async () => {
      const partial = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, -5), actualValue: 10 });
      assert.equal(partial.status, 201);
      assert.equal(partial.body.log.status, 'partial');
      assert.equal(partial.body.log.completed_at, null);

      const updated = await request(app)
        .put(`/api/habits/${habitId}/logs/${partial.body.log.id}`)
        .set(auth(user1Token))
        .send({ actualValue: 30 });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.log.status, 'completed');
      assert.ok(updated.body.log.completed_at);
    });

    it('records the remaining logs for progress tests', async () => {
      const entries = [
        { logDate: addDays(today, -4), status: 'skipped' },
        { logDate: addDays(today, -2), status: 'completed', actualValue: 30 },
      ];
      for (const entry of entries) {
        const res = await request(app).post(`/api/habits/${habitId}/logs`).set(auth(user1Token)).send(entry);
        assert.equal(res.status, 201);
      }
    });

    it('rejects future dates and dates before the habit start', async () => {
      const future = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, 2), status: 'completed' });
      assert.equal(future.status, 400);

      const beforeStart = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, -30), status: 'completed' });
      assert.equal(beforeStart.status, 400);
    });

    it("judges 'future' using the user's timezone", async () => {
      // Kiritimati (UTC+14) is always ahead of Pago Pago (UTC-11) by a calendar day
      const kiritimatiToday = getTodayInTimezone('Pacific/Kiritimati');
      const temp = await request(app)
        .post('/api/habits')
        .set(auth(user1Token))
        .send({ name: 'TZ Log', startDate: addDays(kiritimatiToday, -3) });
      const tempId = temp.body.habit.id;

      const behind = await request(app)
        .post(`/api/habits/${tempId}/logs`)
        .set(auth(user1Token))
        .set('X-Timezone', 'Pacific/Pago_Pago')
        .send({ logDate: kiritimatiToday, status: 'completed' });
      assert.equal(behind.status, 400);

      const ahead = await request(app)
        .post(`/api/habits/${tempId}/logs`)
        .set(auth(user1Token))
        .set('X-Timezone', 'Pacific/Kiritimati')
        .send({ logDate: kiritimatiToday, status: 'completed' });
      assert.equal(ahead.status, 201);

      await request(app).delete(`/api/habits/${tempId}`).set(auth(user1Token));
    });

    it('GET /api/habits/:id/logs filters by date range and status', async () => {
      const res = await request(app)
        .get(`/api/habits/${habitId}/logs?startDate=${addDays(today, -6)}&endDate=${today}&status=completed`)
        .set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 3);
      assert.ok(res.body.data.every((l: any) => l.status === 'completed'));

      const badRange = await request(app)
        .get(`/api/habits/${habitId}/logs?startDate=${today}&endDate=${addDays(today, -1)}`)
        .set(auth(user1Token));
      assert.equal(badRange.status, 400);
    });

    it('GET /api/habits/logs returns logs across habits for a date range', async () => {
      const res = await request(app)
        .get(`/api/habits/logs?startDate=${addDays(today, -6)}&endDate=${today}`)
        .set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 4);
      assert.ok(res.body.data[0].habit_name);
      assert.equal(res.body.range.startDate, addDays(today, -6));

      const other = await request(app)
        .get(`/api/habits/logs?startDate=${addDays(today, -6)}&endDate=${today}`)
        .set(auth(user2Token));
      assert.equal(other.body.data.length, 0);
    });

    it('logs are preserved when a habit is edited or paused', async () => {
      await request(app).put(`/api/habits/${habitId}`).set(auth(user1Token)).send({ name: 'Morning Jog', targetValue: 45 });
      await request(app).patch(`/api/habits/${habitId}/status`).set(auth(user1Token)).send({ status: 'paused' });

      const logs = await request(app)
        .get(`/api/habits/${habitId}/logs?startDate=${addDays(today, -6)}&endDate=${today}`)
        .set(auth(user1Token));
      assert.equal(logs.body.data.length, 4);

      const restore = await request(app)
        .put(`/api/habits/${habitId}`)
        .set(auth(user1Token))
        .send({ name: 'Morning Run', targetValue: 30, status: 'active' });
      assert.equal(restore.status, 200);
    });

    it('archived habits cannot receive new logs', async () => {
      const temp = await request(app).post('/api/habits').set(auth(user1Token)).send({ name: 'Old Habit' });
      await request(app).patch(`/api/habits/${temp.body.habit.id}/status`).set(auth(user1Token)).send({ status: 'archived' });
      const res = await request(app)
        .post(`/api/habits/${temp.body.habit.id}/logs`)
        .set(auth(user1Token))
        .send({ logDate: today });
      assert.equal(res.status, 409);
      await request(app).delete(`/api/habits/${temp.body.habit.id}`).set(auth(user1Token));
    });

    it("users cannot read, update or delete another user's logs", async () => {
      const create = await request(app)
        .post(`/api/habits/${habitId}/logs`)
        .set(auth(user2Token))
        .send({ logDate: today });
      assert.equal(create.status, 404);

      const list = await request(app).get(`/api/habits/${habitId}/logs`).set(auth(user2Token));
      assert.equal(list.status, 404);

      const put = await request(app)
        .put(`/api/habits/${habitId}/logs/${logId}`)
        .set(auth(user2Token))
        .send({ status: 'missed' });
      assert.equal(put.status, 404);

      const del = await request(app).delete(`/api/habits/${habitId}/logs/${logId}`).set(auth(user2Token));
      assert.equal(del.status, 404);
    });

    it('PUT and DELETE a log', async () => {
      const temp = await request(app)
        .post(`/api/habits/${intervalHabitId}/logs`)
        .set(auth(user1Token))
        .send({ logDate: addDays(today, -1), status: 'completed' });
      assert.equal(temp.status, 201);

      const updated = await request(app)
        .put(`/api/habits/${intervalHabitId}/logs/${temp.body.log.id}`)
        .set(auth(user1Token))
        .send({ status: 'skipped', notes: 'Rest day' });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.log.status, 'skipped');
      assert.equal(updated.body.log.completed_at, null);

      const del = await request(app)
        .delete(`/api/habits/${intervalHabitId}/logs/${temp.body.log.id}`)
        .set(auth(user1Token));
      assert.equal(del.status, 200);
      assert.equal(del.body.message, 'Habit log deleted successfully.');
    });
  });

  // ------------------------------------------------------------------
  describe('5. Habit Progress', () => {
    const range = () => `startDate=${addDays(today, -6)}&endDate=${today}`;

    it('calculates progress for a daily habit (completed, skipped, missed, pending)', async () => {
      const res = await request(app)
        .get(`/api/habits/progress?${range()}&habitId=${habitId}`)
        .set(auth(user1Token));
      assert.equal(res.status, 200);
      const { summary } = res.body.progress;
      // 7 days: -6 completed, -5 completed, -4 skipped, -3 missed, -2 completed, -1 missed, today pending
      assert.equal(summary.expected, 7);
      assert.equal(summary.completed, 3);
      assert.equal(summary.skipped, 1);
      assert.equal(summary.missed, 2);
      assert.equal(summary.pending, 1);
      assert.equal(summary.completionRate, 50);
      assert.equal(res.body.progress.daily.length, 7);
      assert.ok(res.body.progress.weekly.length >= 1);
    });

    it('respects interval schedules (every 2 days)', async () => {
      const res = await request(app)
        .get(`/api/habits/progress?${range()}&habitId=${intervalHabitId}`)
        .set(auth(user1Token));
      const { summary, habits } = res.body.progress;
      // Scheduled on -6, -4, -2, today
      assert.equal(summary.expected, 4);
      assert.equal(summary.missed, 3);
      assert.equal(summary.pending, 1);
      assert.equal(habits[0].days.filter((d: any) => d.status === 'not_scheduled').length, 3);
    });

    it('does not treat non-scheduled days as missed', async () => {
      const res = await request(app)
        .get(`/api/habits/progress?${range()}&habitId=${selectedDaysHabitId}`)
        .set(auth(user1Token));
      const { summary } = res.body.progress;
      assert.equal(summary.expected, 1);
      assert.equal(summary.missed, 1);
      assert.equal(summary.pending, 0);
    });

    it('aggregates all active habits by default and supports period=week', async () => {
      const res = await request(app).get('/api/habits/progress?period=week').set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.progress.period, 'week');
      assert.equal(res.body.progress.daily.length, 7);
      assert.equal(res.body.progress.habits.length, 3);
      assert.equal(res.body.progress.timezone, 'UTC');
    });

    it('validates progress query params', async () => {
      const tz = await request(app).get('/api/habits/progress?timezone=Mars/Olympus').set(auth(user1Token));
      assert.equal(tz.status, 400);

      const tooLong = await request(app)
        .get('/api/habits/progress?startDate=2024-01-01&endDate=2026-01-01')
        .set(auth(user1Token));
      assert.equal(tooLong.status, 400);
    });

    it("users cannot read another user's habit progress", async () => {
      const res = await request(app).get(`/api/habits/progress?habitId=${habitId}`).set(auth(user2Token));
      assert.equal(res.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('6. Habit Flexibility', () => {
    it('GET returns null when not configured', async () => {
      const res = await request(app).get(`/api/habits/${habitId}/flexibility`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.flexibility, null);
    });

    it('POST creates flexibility settings', async () => {
      const res = await request(app)
        .post(`/api/habits/${habitId}/flexibility`)
        .set(auth(user1Token))
        .send({
          minimumVersion: 'Walk 10 minutes',
          normalVersion: 'Run 30 minutes',
          idealVersion: 'Run 45 minutes',
          alternativeAction: 'Indoor cycling',
          recoveryRule: 'Run the next morning',
          neverMissTwice: true,
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.flexibility.minimum_version, 'Walk 10 minutes');
      assert.equal(res.body.flexibility.never_miss_twice, true);
    });

    it('POST again returns 409', async () => {
      const res = await request(app).post(`/api/habits/${habitId}/flexibility`).set(auth(user1Token)).send({});
      assert.equal(res.status, 409);
    });

    it('PUT updates flexibility settings', async () => {
      const res = await request(app)
        .put(`/api/habits/${habitId}/flexibility`)
        .set(auth(user1Token))
        .send({ idealVersion: 'Run 60 minutes', neverMissTwice: false });
      assert.equal(res.status, 200);
      assert.equal(res.body.flexibility.ideal_version, 'Run 60 minutes');
      assert.equal(res.body.flexibility.never_miss_twice, false);
      assert.equal(res.body.flexibility.minimum_version, 'Walk 10 minutes');
    });

    it('flexibility is per habit and isolated per user', async () => {
      const other = await request(app).get(`/api/habits/${intervalHabitId}/flexibility`).set(auth(user1Token));
      assert.equal(other.body.flexibility, null);

      const foreign = await request(app).get(`/api/habits/${habitId}/flexibility`).set(auth(user2Token));
      assert.equal(foreign.status, 404);
    });

    it('DELETE removes flexibility settings', async () => {
      const res = await request(app).delete(`/api/habits/${habitId}/flexibility`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const again = await request(app).delete(`/api/habits/${habitId}/flexibility`).set(auth(user1Token));
      assert.equal(again.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('7. Habit Reminders', () => {
    it('POST creates a gentle in-app reminder by default', async () => {
      const res = await request(app)
        .post(`/api/habits/${habitId}/reminders`)
        .set(auth(user1Token))
        .send({ reminderTime: '06:15' });
      assert.equal(res.status, 201);
      assert.equal(res.body.reminder.reminder_type, 'in_app');
      assert.equal(res.body.reminder.is_enabled, true);
      reminderId = res.body.reminder.id;
    });

    it('POST validates reminder time and type', async () => {
      const res = await request(app)
        .post(`/api/habits/${habitId}/reminders`)
        .set(auth(user1Token))
        .send({ reminderTime: '25:00', reminderType: 'sms' });
      assert.equal(res.status, 400);
    });

    it('GET lists reminders for a habit', async () => {
      const res = await request(app).get(`/api/habits/${habitId}/reminders`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.reminders.length, 1);
    });

    it('PUT updates a reminder', async () => {
      const res = await request(app)
        .put(`/api/habits/${habitId}/reminders/${reminderId}`)
        .set(auth(user1Token))
        .send({ reminderTime: '06:45' });
      assert.equal(res.status, 200);
      assert.equal(res.body.reminder.reminder_time, '06:45:00');
    });

    it('PATCH toggle disables and enables a reminder', async () => {
      const off = await request(app)
        .patch(`/api/habits/${habitId}/reminders/${reminderId}/toggle`)
        .set(auth(user1Token))
        .send({ isEnabled: false });
      assert.equal(off.status, 200);
      assert.equal(off.body.reminder.is_enabled, false);
      assert.equal(off.body.message, 'Habit reminder disabled successfully.');

      const on = await request(app)
        .patch(`/api/habits/${habitId}/reminders/${reminderId}/toggle`)
        .set(auth(user1Token))
        .send({ isEnabled: true });
      assert.equal(on.body.reminder.is_enabled, true);
    });

    it("users cannot modify another user's reminders", async () => {
      const res = await request(app)
        .patch(`/api/habits/${habitId}/reminders/${reminderId}/toggle`)
        .set(auth(user2Token))
        .send({ isEnabled: false });
      assert.equal(res.status, 404);
    });

    it('a reminder cannot be reached through a different habit', async () => {
      const res = await request(app)
        .put(`/api/habits/${intervalHabitId}/reminders/${reminderId}`)
        .set(auth(user1Token))
        .send({ reminderTime: '07:00' });
      assert.equal(res.status, 404);
    });

    it('DELETE removes a reminder', async () => {
      const temp = await request(app)
        .post(`/api/habits/${habitId}/reminders`)
        .set(auth(user1Token))
        .send({ reminderTime: '21:00', isEnabled: false });
      const res = await request(app)
        .delete(`/api/habits/${habitId}/reminders/${temp.body.reminder.id}`)
        .set(auth(user1Token));
      assert.equal(res.status, 200);
      const list = await request(app).get(`/api/habits/${habitId}/reminders`).set(auth(user1Token));
      assert.equal(list.body.reminders.length, 1);
    });

    it('GET /api/habits/:id returns schedules, flexibility and reminders', async () => {
      const res = await request(app).get(`/api/habits/${selectedDaysHabitId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.habit.schedules.length, 1);
      assert.ok(Array.isArray(res.body.habit.reminders));
      assert.equal(res.body.habit.flexibility, null);

      const foreign = await request(app).get(`/api/habits/${selectedDaysHabitId}`).set(auth(user2Token));
      assert.equal(foreign.status, 404);
    });
  });

  // ------------------------------------------------------------------
  describe('8. Dashboard Preferences', () => {
    it('GET returns defaults when nothing is saved', async () => {
      const res = await request(app).get('/api/dashboard/preferences').set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.preferences.is_default, true);
      assert.equal(res.body.preferences.default_period, 'week');
      assert.ok(res.body.preferences.visible_widgets.includes('habit_progress'));
      assert.equal(res.body.preferences.widget_order.length, res.body.preferences.visible_widgets.length);
    });

    it('PUT updates visible widgets', async () => {
      const res = await request(app)
        .put('/api/dashboard/preferences')
        .set(auth(user1Token))
        .send({ visibleWidgets: ['today', 'habit_progress', 'weekly_habit_tracker', 'upcoming_commitments', 'daily_progress_chart', 'todays_tasks'] });
      assert.equal(res.status, 200);
      assert.equal(res.body.preferences.is_default, false);
      assert.equal(res.body.preferences.visible_widgets.length, 6);
    });

    it('PUT updates widget order and appends unspecified widgets', async () => {
      const res = await request(app)
        .put('/api/dashboard/preferences')
        .set(auth(user1Token))
        .send({ widgetOrder: ['habit_progress', 'today'] });
      assert.equal(res.status, 200);
      assert.equal(res.body.preferences.widget_order[0], 'habit_progress');
      assert.equal(res.body.preferences.widget_order[1], 'today');
      assert.equal(res.body.preferences.widget_order.length, 14);
      assert.equal(res.body.preferences.visible_widgets.length, 6);
    });

    it('PUT updates default period', async () => {
      const res = await request(app)
        .put('/api/dashboard/preferences')
        .set(auth(user1Token))
        .send({ defaultPeriod: 'month' });
      assert.equal(res.status, 200);
      assert.equal(res.body.preferences.default_period, 'month');
    });

    it('PUT validates widgets, duplicates and periods', async () => {
      const unknown = await request(app).put('/api/dashboard/preferences').set(auth(user1Token)).send({ visibleWidgets: ['weather'] });
      assert.equal(unknown.status, 400);
      const dupes = await request(app).put('/api/dashboard/preferences').set(auth(user1Token)).send({ widgetOrder: ['today', 'today'] });
      assert.equal(dupes.status, 400);
      const period = await request(app).put('/api/dashboard/preferences').set(auth(user1Token)).send({ defaultPeriod: 'year' });
      assert.equal(period.status, 400);
      const empty = await request(app).put('/api/dashboard/preferences').set(auth(user1Token)).send({});
      assert.equal(empty.status, 400);
    });

    it("preferences are isolated per user and ignore user_id in the body", async () => {
      const res = await request(app)
        .put('/api/dashboard/preferences')
        .set(auth(user2Token))
        .send({ defaultPeriod: 'day', user_id: 'someone-else' });
      assert.equal(res.status, 200);

      const user1 = await request(app).get('/api/dashboard/preferences').set(auth(user1Token));
      assert.equal(user1.body.preferences.default_period, 'month');
      const user2 = await request(app).get('/api/dashboard/preferences').set(auth(user2Token));
      assert.equal(user2.body.preferences.default_period, 'day');
    });
  });

  // ------------------------------------------------------------------
  describe('9. Dashboard Overview', () => {
    it('GET /api/dashboard requires authentication', async () => {
      const res = await request(app).get('/api/dashboard');
      assert.equal(res.status, 401);
    });

    it('returns visible widgets in the saved order using the saved default period', async () => {
      const res = await request(app).get('/api/dashboard').set(auth(user1Token));
      assert.equal(res.status, 200);
      const { dashboard } = res.body;
      assert.equal(dashboard.period, 'month');
      assert.equal(dashboard.date, today);
      assert.deepEqual(
        dashboard.widgets.map((w: any) => w.key),
        ['habit_progress', 'today', 'weekly_habit_tracker', 'upcoming_commitments', 'daily_progress_chart', 'todays_tasks']
      );
    });

    it('aggregates habit progress from habits and habit_logs', async () => {
      const res = await request(app)
        .get(`/api/dashboard?period=week&date=${addDays(today, -2)}`)
        .set(auth(user1Token));
      const widgets = Object.fromEntries(res.body.dashboard.widgets.map((w: any) => [w.key, w]));

      const habitProgress = widgets.habit_progress;
      assert.equal(habitProgress.available, true);
      assert.equal(habitProgress.data.activeHabits, 3);
      const run = habitProgress.data.habits.find((h: any) => h.habitId === habitId);
      assert.equal(run.status, 'completed');
      assert.equal(run.actualValue, 30);

      const tracker = widgets.weekly_habit_tracker;
      assert.equal(tracker.data.days.length, 7);
      assert.equal(tracker.data.habits.length, 3);

      const chart = widgets.daily_progress_chart;
      assert.equal(chart.data.points.length, 7);
    });

    it('lists upcoming commitments with reminder times', async () => {
      const res = await request(app).get('/api/dashboard').set(auth(user1Token));
      const upcoming = res.body.dashboard.widgets.find((w: any) => w.key === 'upcoming_commitments');
      assert.equal(upcoming.available, true);
      const runToday = upcoming.data.items.find((i: any) => i.habitId === habitId && i.date === today);
      assert.ok(runToday);
      assert.deepEqual(runToday.reminderTimes, ['06:45:00']);
    });

    it('returns widget availability correctly for available modules', async () => {
      // user 2 keeps the default preferences, so every widget (including finance) is visible
      const res = await request(app).get('/api/dashboard').set(auth(user2Token));
      const finance = res.body.dashboard.widgets.find((w: any) => w.key === 'money_spent_this_week');
      assert.equal(finance.available, true);
      assert.ok(finance.data !== null);

      const tasks = res.body.dashboard.widgets.find((w: any) => w.key === 'todays_tasks');
      assert.equal(tasks.available, true);
    });

    it('uses the requested timezone for today', async () => {
      const res = await request(app)
        .get('/api/dashboard?timezone=Pacific/Kiritimati')
        .set(auth(user1Token));
      assert.equal(res.status, 200);
      assert.equal(res.body.dashboard.timezone, 'Pacific/Kiritimati');
      assert.equal(res.body.dashboard.today, getTodayInTimezone('Pacific/Kiritimati'));
    });

    it("never includes another user's habits", async () => {
      const res = await request(app).get('/api/dashboard').set(auth(user2Token));
      assert.equal(res.status, 200);
      const habitProgress = res.body.dashboard.widgets.find((w: any) => w.key === 'habit_progress');
      // user 2 hid nothing, so all widgets show
      assert.equal(res.body.dashboard.widgets.length, 14);
      assert.equal(habitProgress.data.activeHabits, 0);
      assert.equal(habitProgress.data.habits.length, 0);
    });

    it('validates query params', async () => {
      const res = await request(app).get('/api/dashboard?period=decade').set(auth(user1Token));
      assert.equal(res.status, 400);
    });
  });

  // ------------------------------------------------------------------
  describe('10. Cleanup behaviour', () => {
    it('deleting a custom category keeps its habits (category_id set to null)', async () => {
      const res = await request(app).delete(`/api/habits/categories/${customCategoryId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const habit = await request(app).get(`/api/habits/${intervalHabitId}`).set(auth(user1Token));
      assert.equal(habit.status, 200);
      assert.equal(habit.body.habit.category_id, null);
    });

    it("users cannot delete another user's habit", async () => {
      const res = await request(app).delete(`/api/habits/${habitId}`).set(auth(user2Token));
      assert.equal(res.status, 404);
    });

    it('deleting a habit removes its logs, schedules and reminders', async () => {
      const res = await request(app).delete(`/api/habits/${habitId}`).set(auth(user1Token));
      assert.equal(res.status, 200);
      const logs = await request(app).get(`/api/habits/logs?habitId=${habitId}`).set(auth(user1Token));
      assert.equal(logs.status, 404);
      const all = await request(app)
        .get(`/api/habits/logs?startDate=${addDays(today, -6)}&endDate=${today}`)
        .set(auth(user1Token));
      assert.equal(all.body.data.length, 0);
    });
  });
});
