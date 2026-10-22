/**
 * Postman collection for the Dashboard and Habit (Commitments) modules.
 * Imported by generate_postman.ts, which writes LifeTracker_Dashboard_Habit_APIs.postman_collection.json.
 */

export interface QueryParam {
  key: string;
  value: string;
  description: string;
  disabled?: boolean;
}

export interface EndpointDefinition {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  pathVariables?: Record<string, { value: string; description: string }>;
  query?: QueryParam[];
  body?: Record<string, any>;
  response: { code: number; status: string; body: Record<string, any> };
  /** Environment variables to capture from the response: [envKey, jsonPath]. */
  saveVariables?: [string, string][];
}

const JSON_HEADER = [{ key: 'Content-Type', value: 'application/json' }];
const TIMEZONE_HEADER = {
  key: 'X-Timezone',
  value: '{{timezone}}',
  description: 'IANA timezone used for "today" and date ranges (alternative to ?timezone=). Defaults to UTC.',
};

const SAMPLE = {
  userId: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  categoryId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  systemCategoryId: 'c0a1b2c3-d4e5-4f6a-8b7c-9d0e1f2a3b4c',
  habitId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  scheduleId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  logId: 'd3e4f5a6-b7c8-4d9e-8f0a-1b2c3d4e5f6a',
  flexibilityId: 'e4f5a6b7-c8d9-4e0f-9a1b-2c3d4e5f6a7b',
  reminderId: 'f5a6b7c8-d9e0-4f1a-8b2c-3d4e5f6a7b8c',
  preferencesId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
};

const sampleCategory = {
  id: SAMPLE.categoryId,
  user_id: SAMPLE.userId,
  name: 'Side Projects',
  description: 'Evening and weekend projects',
  icon: 'code',
  color: '#0F172A',
  is_system: false,
  sort_order: 0,
  created_at: '2026-10-21T08:00:00.000Z',
  updated_at: '2026-10-21T08:00:00.000Z',
};

const sampleHabit = {
  id: SAMPLE.habitId,
  user_id: SAMPLE.userId,
  category_id: SAMPLE.systemCategoryId,
  name: 'Morning Run',
  description: 'Easy pace around the park',
  icon: 'running',
  color: '#EF4444',
  habit_type: 'positive',
  tracking_type: 'duration',
  target_value: 30,
  target_unit: 'minutes',
  frequency_type: 'custom',
  start_date: '2026-10-19',
  end_date: null,
  preferred_time: '06:30:00',
  cue: 'After morning coffee',
  difficulty: 'medium',
  status: 'active',
  sort_order: 0,
  created_at: '2026-10-19T01:00:00.000Z',
  updated_at: '2026-10-19T01:00:00.000Z',
};

const sampleSchedule = {
  id: SAMPLE.scheduleId,
  habit_id: SAMPLE.habitId,
  user_id: SAMPLE.userId,
  schedule_type: 'selected_days',
  weekdays: ['monday', 'wednesday', 'friday'],
  interval_days: null,
  effective_from: '2026-10-19',
  effective_until: null,
  created_at: '2026-10-19T01:00:00.000Z',
  updated_at: '2026-10-19T01:00:00.000Z',
};

const sampleLog = {
  id: SAMPLE.logId,
  user_id: SAMPLE.userId,
  habit_id: SAMPLE.habitId,
  log_date: '2026-10-21',
  status: 'completed',
  actual_value: 32,
  notes: 'Felt great',
  completed_at: '2026-10-21T01:15:00.000Z',
  created_at: '2026-10-21T01:15:00.000Z',
  updated_at: '2026-10-21T01:15:00.000Z',
};

const sampleFlexibility = {
  id: SAMPLE.flexibilityId,
  habit_id: SAMPLE.habitId,
  user_id: SAMPLE.userId,
  minimum_version: 'Walk for 10 minutes',
  normal_version: 'Run for 30 minutes',
  ideal_version: 'Run for 45 minutes',
  alternative_action: 'Indoor cycling if it rains',
  recovery_rule: 'Run the next morning',
  never_miss_twice: true,
  created_at: '2026-10-21T08:00:00.000Z',
  updated_at: '2026-10-21T08:00:00.000Z',
};

const sampleReminder = {
  id: SAMPLE.reminderId,
  habit_id: SAMPLE.habitId,
  user_id: SAMPLE.userId,
  reminder_time: '06:15:00',
  reminder_type: 'in_app',
  is_enabled: true,
  created_at: '2026-10-21T08:00:00.000Z',
  updated_at: '2026-10-21T08:00:00.000Z',
};

const sampleCounters = {
  expected: 5,
  completed: 3,
  partial: 0,
  skipped: 1,
  missed: 0,
  pending: 1,
  upcoming: 2,
  unscheduledCompletions: 0,
  completionRate: 75,
};

const pagination = (total: number, limit = 50) => ({
  page: 1,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const habitPathVariable = {
  id: { value: '{{habit_id}}', description: 'UUID of the habit' },
};

const timezoneQuery: QueryParam = {
  key: 'timezone',
  value: '{{timezone}}',
  description: 'IANA timezone (e.g. Asia/Kolkata). Defaults to the X-Timezone header, then UTC.',
};

export const buildEndpoint = (def: EndpointDefinition) => {
  const segments = def.path.split('/');
  const queryString = (def.query || [])
    .filter((q) => !q.disabled)
    .map((q) => `${q.key}=${q.value}`)
    .join('&');
  const statusTitle = `${def.response.code} ${def.response.status}`;

  const testScript = [
    `pm.test("Status code is ${statusTitle}", function () {`,
    `    pm.response.to.have.status(${def.response.code});`,
    '});',
  ];
  if (def.saveVariables?.length) {
    testScript.push('var jsonData = pm.response.json();');
    for (const [envKey, jsonPath] of def.saveVariables) {
      testScript.push(
        `if (jsonData && jsonData.${jsonPath.split('.')[0]} && jsonData.${jsonPath}) {`,
        `    pm.environment.set("${envKey}", jsonData.${jsonPath});`,
        '}'
      );
    }
  }

  const header = [...(def.body ? JSON_HEADER : []), TIMEZONE_HEADER];
  const body = def.body
    ? { mode: 'raw', raw: JSON.stringify(def.body, null, 2) }
    : undefined;

  return {
    name: def.name,
    event: [{ listen: 'test', script: { exec: testScript, type: 'text/javascript' } }],
    request: {
      method: def.method,
      header,
      ...(body ? { body } : {}),
      url: {
        raw: `{{base_url}}/${def.path}${queryString ? `?${queryString}` : ''}`,
        host: ['{{base_url}}'],
        path: segments,
        ...(def.query ? { query: def.query } : {}),
        ...(def.pathVariables
          ? {
              variable: Object.entries(def.pathVariables).map(([key, v]) => ({
                key,
                value: v.value,
                description: v.description,
              })),
            }
          : {}),
      },
      description: def.description,
    },
    response: [
      {
        name: statusTitle,
        status: def.response.status,
        code: def.response.code,
        _postman_previewlanguage: 'json',
        header: JSON_HEADER,
        body: JSON.stringify(def.response.body, null, 2),
      },
    ],
  };
};

// ---------------- COMMITMENTS ----------------
const categoryEndpoints: EndpointDefinition[] = [
  {
    name: 'Get Categories',
    method: 'GET',
    path: 'api/habits/categories',
    description: 'Returns the 10 system categories plus the authenticated user\'s custom categories.',
    response: {
      code: 200,
      status: 'OK',
      body: {
        categories: [
          { ...sampleCategory, id: SAMPLE.systemCategoryId, user_id: null, name: 'Fitness', description: 'Exercise, workouts and physical activity', icon: 'dumbbell', color: '#EF4444', is_system: true, sort_order: 1 },
          sampleCategory,
        ],
      },
    },
  },
  {
    name: 'Create Category',
    method: 'POST',
    path: 'api/habits/categories',
    description: 'Creates a custom category. Names must be unique across system categories and the user\'s own categories (409 otherwise).',
    body: { name: 'Side Projects', description: 'Evening and weekend projects', icon: 'code', color: '#0F172A', sortOrder: 0 },
    response: { code: 201, status: 'Created', body: { message: 'Habit category created successfully.', category: sampleCategory } },
    saveVariables: [['category_id', 'category.id']],
  },
  {
    name: 'Update Category',
    method: 'PUT',
    path: 'api/habits/categories/:id',
    pathVariables: { id: { value: '{{category_id}}', description: 'UUID of a custom category' } },
    description: 'Updates a custom category. System categories return 403.',
    body: { name: 'Side Hustles', color: '#1E293B' },
    response: { code: 200, status: 'OK', body: { message: 'Habit category updated successfully.', category: { ...sampleCategory, name: 'Side Hustles', color: '#1E293B' } } },
  },
  {
    name: 'Delete Category',
    method: 'DELETE',
    path: 'api/habits/categories/:id',
    pathVariables: { id: { value: '{{category_id}}', description: 'UUID of a custom category' } },
    description: 'Deletes a custom category. Habits in it are kept with category_id set to null. System categories return 403.',
    response: { code: 200, status: 'OK', body: { message: 'Habit category deleted successfully.' } },
  },
];

const habitEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Habit',
    method: 'POST',
    path: 'api/habits',
    description:
      'Creates a habit. Optional fields not shown: categoryId (a UUID from Get Categories), startDate (YYYY-MM-DD, defaults to today in the user\'s timezone), endDate, status, sortOrder. ' +
      'targetValue is required when trackingType is count, duration or quantity.',
    body: {
      name: 'Morning Run',
      description: 'Easy pace around the park',
      icon: 'running',
      color: '#EF4444',
      habitType: 'positive',
      trackingType: 'duration',
      targetValue: 30,
      targetUnit: 'minutes',
      frequencyType: 'custom',
      preferredTime: '06:30',
      cue: 'After morning coffee',
      difficulty: 'medium',
    },
    response: { code: 201, status: 'Created', body: { message: 'Habit created successfully.', habit: sampleHabit } },
    saveVariables: [['habit_id', 'habit.id']],
  },
  {
    name: 'Get All Habits',
    method: 'GET',
    path: 'api/habits',
    description: 'Lists the authenticated user\'s habits with optional filters and pagination.',
    query: [
      { key: 'status', value: 'active', description: 'active | paused | archived | completed' },
      { key: 'categoryId', value: '{{category_id}}', description: 'Filter by category UUID', disabled: true },
      { key: 'habitType', value: 'positive', description: 'positive | avoid', disabled: true },
      { key: 'frequencyType', value: 'daily', description: 'daily | weekly | custom', disabled: true },
      { key: 'trackingType', value: 'boolean', description: 'boolean | count | duration | quantity', disabled: true },
      { key: 'page', value: '1', description: 'Page number (default 1)' },
      { key: 'limit', value: '50', description: 'Page size, max 100 (default 50)' },
    ],
    response: { code: 200, status: 'OK', body: { data: [{ ...sampleHabit, category_name: 'Fitness' }], pagination: pagination(1) } },
  },
  {
    name: 'Get Habit Details',
    method: 'GET',
    path: 'api/habits/:id',
    pathVariables: habitPathVariable,
    description: 'Returns a habit with its current schedule, schedule history, flexibility settings and reminders.',
    response: {
      code: 200,
      status: 'OK',
      body: {
        habit: {
          ...sampleHabit,
          category_name: 'Fitness',
          current_schedule: sampleSchedule,
          schedules: [sampleSchedule],
          flexibility: sampleFlexibility,
          reminders: [sampleReminder],
        },
      },
    },
  },
  {
    name: 'Update Habit',
    method: 'PUT',
    path: 'api/habits/:id',
    pathVariables: habitPathVariable,
    description: 'Partially updates a habit. Send null to clear nullable fields. Existing logs are preserved.',
    body: { targetValue: 35, cue: 'Right after waking up', endDate: null },
    response: { code: 200, status: 'OK', body: { message: 'Habit updated successfully.', habit: { ...sampleHabit, target_value: 35, cue: 'Right after waking up' } } },
  },
  {
    name: 'Update Habit Status',
    method: 'PATCH',
    path: 'api/habits/:id/status',
    pathVariables: habitPathVariable,
    description: 'Changes habit status (active, paused, archived, completed). Logs are preserved. Archived habits cannot receive new logs.',
    body: { status: 'paused' },
    response: { code: 200, status: 'OK', body: { message: 'Habit status updated successfully.', habit: { ...sampleHabit, status: 'paused' } } },
  },
  {
    name: 'Delete Habit',
    method: 'DELETE',
    path: 'api/habits/:id',
    pathVariables: habitPathVariable,
    description: 'Permanently deletes a habit and its schedules, logs, flexibility settings and reminders. Prefer archiving to keep history.',
    response: { code: 200, status: 'OK', body: { message: 'Habit deleted successfully.' } },
  },
];

const scheduleEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Habit Schedule',
    method: 'POST',
    path: 'api/habits/:id/schedules',
    pathVariables: habitPathVariable,
    description:
      'Creates a schedule. scheduleType: daily (no weekdays/intervalDays), selected_days (weekdays required), interval (intervalDays required, every N days from effectiveFrom). ' +
      'The first schedule defaults effectiveFrom to the habit start date; later ones default to today and automatically close the open-ended schedule they replace. Overlaps return 409.',
    body: { scheduleType: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'] },
    response: { code: 201, status: 'Created', body: { message: 'Habit schedule created successfully.', schedule: sampleSchedule } },
    saveVariables: [['schedule_id', 'schedule.id']],
  },
  {
    name: 'Get Habit Schedule',
    method: 'GET',
    path: 'api/habits/:id/schedules',
    pathVariables: habitPathVariable,
    description: 'Returns the schedule effective today (in the user\'s timezone) and the full schedule history.',
    response: { code: 200, status: 'OK', body: { currentSchedule: sampleSchedule, schedules: [sampleSchedule] } },
  },
  {
    name: 'Update Habit Schedule',
    method: 'PUT',
    path: 'api/habits/:id/schedules/:scheduleId',
    pathVariables: { ...habitPathVariable, scheduleId: { value: '{{schedule_id}}', description: 'UUID of the schedule' } },
    description: 'Updates a schedule. Changing scheduleType resets fields that do not apply to the new type.',
    body: { scheduleType: 'interval', intervalDays: 2 },
    response: { code: 200, status: 'OK', body: { message: 'Habit schedule updated successfully.', schedule: { ...sampleSchedule, schedule_type: 'interval', weekdays: [], interval_days: 2 } } },
  },
  {
    name: 'Delete Habit Schedule',
    method: 'DELETE',
    path: 'api/habits/:id/schedules/:scheduleId',
    pathVariables: { ...habitPathVariable, scheduleId: { value: '{{schedule_id}}', description: 'UUID of the schedule' } },
    description: 'Deletes a schedule. A habit without schedules falls back to its frequencyType.',
    response: { code: 200, status: 'OK', body: { message: 'Habit schedule deleted successfully.' } },
  },
];

const logEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Habit Log',
    method: 'POST',
    path: 'api/habits/:id/logs',
    pathVariables: habitPathVariable,
    description:
      'Logs a habit for one date (one log per habit per date; duplicates return 409 with existingLogId). ' +
      'If status is omitted it is derived: boolean habits = completed; measurable habits compare actualValue to the target (completed / partial / missed). Future dates (in the user\'s timezone) are rejected.',
    body: { logDate: '{{today}}', status: 'completed', actualValue: 32, notes: 'Felt great' },
    response: { code: 201, status: 'Created', body: { message: 'Habit log created successfully.', log: sampleLog } },
    saveVariables: [['habit_log_id', 'log.id']],
  },
  {
    name: 'Get Habit Logs by Habit',
    method: 'GET',
    path: 'api/habits/:id/logs',
    pathVariables: habitPathVariable,
    description: 'Logs for one habit, newest first, with optional date range and status filters.',
    query: [
      { key: 'startDate', value: '2026-10-01', description: 'YYYY-MM-DD (inclusive)', disabled: true },
      { key: 'endDate', value: '{{today}}', description: 'YYYY-MM-DD (inclusive)' },
      { key: 'status', value: 'completed', description: 'completed | skipped | missed | partial', disabled: true },
      { key: 'page', value: '1', description: 'Page number' },
      { key: 'limit', value: '31', description: 'Page size, max 100 (default 31)' },
    ],
    response: { code: 200, status: 'OK', body: { data: [{ ...sampleLog, habit_name: 'Morning Run' }], pagination: pagination(1, 31) } },
  },
  {
    name: 'Update Habit Log',
    method: 'PUT',
    path: 'api/habits/:id/logs/:logId',
    pathVariables: { ...habitPathVariable, logId: { value: '{{habit_log_id}}', description: 'UUID of the log' } },
    description: 'Updates a log (logDate is immutable). completed_at is set/cleared automatically when status changes.',
    body: { status: 'partial', actualValue: 20, notes: 'Cut short by rain' },
    response: { code: 200, status: 'OK', body: { message: 'Habit log updated successfully.', log: { ...sampleLog, status: 'partial', actual_value: 20, notes: 'Cut short by rain', completed_at: null } } },
  },
  {
    name: 'Delete Habit Log',
    method: 'DELETE',
    path: 'api/habits/:id/logs/:logId',
    pathVariables: { ...habitPathVariable, logId: { value: '{{habit_log_id}}', description: 'UUID of the log' } },
    description: 'Deletes a single log.',
    response: { code: 200, status: 'OK', body: { message: 'Habit log deleted successfully.' } },
  },
  {
    name: 'Get All Habit Logs',
    method: 'GET',
    path: 'api/habits/logs',
    description: 'Logs across all of the user\'s habits for a date range (max 366 days). Defaults to the current week (Mon–Sun) in the user\'s timezone.',
    query: [
      { key: 'startDate', value: '2026-10-19', description: 'YYYY-MM-DD (default: start of current week)', disabled: true },
      { key: 'endDate', value: '2026-10-25', description: 'YYYY-MM-DD (default: end of current week, or today when only startDate is given)', disabled: true },
      { key: 'habitId', value: '{{habit_id}}', description: 'Limit to one habit', disabled: true },
      { key: 'status', value: 'completed', description: 'completed | skipped | missed | partial', disabled: true },
      { ...timezoneQuery, disabled: true },
    ],
    response: {
      code: 200,
      status: 'OK',
      body: {
        data: [{ ...sampleLog, habit_name: 'Morning Run' }],
        pagination: pagination(1, 100),
        range: { startDate: '2026-10-19', endDate: '2026-10-25', timezone: 'Asia/Kolkata' },
      },
    },
  },
  {
    name: 'Get Habit Progress',
    method: 'GET',
    path: 'api/habits/progress',
    description:
      'Completion statistics for active habits (or one habit of any status via habitId). Only scheduled days count as expected; non-scheduled days are never missed. ' +
      'Today without a log is "pending"; future scheduled days are "upcoming". completionRate = completed / (expected - skipped). Includes daily, weekly and per-habit breakdowns with current streaks.',
    query: [
      { key: 'period', value: 'week', description: 'day | week | month (default week). Ignored when startDate/endDate are given.' },
      { key: 'date', value: '2026-10-21', description: 'Anchor date for period (default today)', disabled: true },
      { key: 'startDate', value: '2026-10-01', description: 'Custom range start (YYYY-MM-DD)', disabled: true },
      { key: 'endDate', value: '2026-10-31', description: 'Custom range end (YYYY-MM-DD, max 366 days)', disabled: true },
      { key: 'habitId', value: '{{habit_id}}', description: 'Progress for a single habit', disabled: true },
      { ...timezoneQuery, disabled: true },
    ],
    response: {
      code: 200,
      status: 'OK',
      body: {
        progress: {
          timezone: 'Asia/Kolkata',
          today: '2026-10-21',
          period: 'week',
          startDate: '2026-10-19',
          endDate: '2026-10-25',
          summary: sampleCounters,
          daily: [{ date: '2026-10-19', ...sampleCounters, expected: 1, completed: 1, skipped: 0, pending: 0, upcoming: 0, completionRate: 100 }],
          weekly: [{ weekStart: '2026-10-19', weekEnd: '2026-10-25', rangeStart: '2026-10-19', rangeEnd: '2026-10-25', ...sampleCounters }],
          habits: [
            {
              habitId: SAMPLE.habitId,
              name: 'Morning Run',
              habitType: 'positive',
              trackingType: 'duration',
              targetValue: 30,
              targetUnit: 'minutes',
              currentStreak: 3,
              ...sampleCounters,
              days: [{ date: '2026-10-19', scheduled: true, status: 'completed', logId: SAMPLE.logId, actualValue: 32 }],
            },
          ],
        },
      },
    },
  },
];

const flexibilityEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Flexibility Settings',
    method: 'POST',
    path: 'api/habits/:id/flexibility',
    pathVariables: habitPathVariable,
    description: 'Creates flexibility settings for a habit (one per habit; 409 if they already exist).',
    body: {
      minimumVersion: 'Walk for 10 minutes',
      normalVersion: 'Run for 30 minutes',
      idealVersion: 'Run for 45 minutes',
      alternativeAction: 'Indoor cycling if it rains',
      recoveryRule: 'Run the next morning',
      neverMissTwice: true,
    },
    response: { code: 201, status: 'Created', body: { message: 'Flexibility settings created successfully.', flexibility: sampleFlexibility } },
  },
  {
    name: 'Get Flexibility Settings',
    method: 'GET',
    path: 'api/habits/:id/flexibility',
    pathVariables: habitPathVariable,
    description: 'Returns flexibility settings, or null when not configured.',
    response: { code: 200, status: 'OK', body: { flexibility: sampleFlexibility } },
  },
  {
    name: 'Update Flexibility Settings',
    method: 'PUT',
    path: 'api/habits/:id/flexibility',
    pathVariables: habitPathVariable,
    description: 'Partially updates flexibility settings (404 if not created yet).',
    body: { idealVersion: 'Run for 60 minutes', neverMissTwice: false },
    response: { code: 200, status: 'OK', body: { message: 'Flexibility settings updated successfully.', flexibility: { ...sampleFlexibility, ideal_version: 'Run for 60 minutes', never_miss_twice: false } } },
  },
  {
    name: 'Delete Flexibility Settings',
    method: 'DELETE',
    path: 'api/habits/:id/flexibility',
    pathVariables: habitPathVariable,
    description: 'Deletes flexibility settings for a habit.',
    response: { code: 200, status: 'OK', body: { message: 'Flexibility settings deleted successfully.' } },
  },
];

const reminderPathVariables = {
  ...habitPathVariable,
  reminderId: { value: '{{reminder_id}}', description: 'UUID of the reminder' },
};

const reminderEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Reminder',
    method: 'POST',
    path: 'api/habits/:id/reminders',
    pathVariables: habitPathVariable,
    description: 'Stores a reminder configuration. reminderType: in_app (default) | push | email. Delivery is handled separately; no notifications are sent by this API.',
    body: { reminderTime: '06:15', reminderType: 'in_app', isEnabled: true },
    response: { code: 201, status: 'Created', body: { message: 'Habit reminder created successfully.', reminder: sampleReminder } },
    saveVariables: [['reminder_id', 'reminder.id']],
  },
  {
    name: 'Get Reminders',
    method: 'GET',
    path: 'api/habits/:id/reminders',
    pathVariables: habitPathVariable,
    description: 'Lists reminders for a habit ordered by time.',
    response: { code: 200, status: 'OK', body: { reminders: [sampleReminder] } },
  },
  {
    name: 'Update Reminder',
    method: 'PUT',
    path: 'api/habits/:id/reminders/:reminderId',
    pathVariables: reminderPathVariables,
    description: 'Partially updates a reminder.',
    body: { reminderTime: '06:45' },
    response: { code: 200, status: 'OK', body: { message: 'Habit reminder updated successfully.', reminder: { ...sampleReminder, reminder_time: '06:45:00' } } },
  },
  {
    name: 'Delete Reminder',
    method: 'DELETE',
    path: 'api/habits/:id/reminders/:reminderId',
    pathVariables: reminderPathVariables,
    description: 'Deletes a reminder.',
    response: { code: 200, status: 'OK', body: { message: 'Habit reminder deleted successfully.' } },
  },
  {
    name: 'Enable/Disable Reminder',
    method: 'PATCH',
    path: 'api/habits/:id/reminders/:reminderId/toggle',
    pathVariables: reminderPathVariables,
    description: 'Enables or disables a reminder.',
    body: { isEnabled: false },
    response: { code: 200, status: 'OK', body: { message: 'Habit reminder disabled successfully.', reminder: { ...sampleReminder, is_enabled: false } } },
  },
];

// ---------------- DASHBOARD ----------------
const ALL_WIDGETS = [
  'today',
  'habit_progress',
  'weekly_habit_tracker',
  'upcoming_commitments',
  'daily_progress_chart',
  'todays_tasks',
  'task_completion',
  'todays_priorities',
  'todays_intention',
  'money_spent_this_week',
  'income_overview',
  'investment_summary',
  'learning_summary',
];

const samplePreferences = {
  id: SAMPLE.preferencesId,
  user_id: SAMPLE.userId,
  visible_widgets: ['today', 'habit_progress', 'weekly_habit_tracker', 'upcoming_commitments', 'daily_progress_chart'],
  widget_order: ['habit_progress', 'today', ...ALL_WIDGETS.filter((w) => w !== 'habit_progress' && w !== 'today')],
  default_period: 'week',
  updated_at: '2026-10-21T08:00:00.000Z',
  is_default: false,
};

const dashboardEndpoints: EndpointDefinition[] = [
  {
    name: 'Get Dashboard Overview',
    method: 'GET',
    path: 'api/dashboard',
    description:
      'Read-only aggregation of the user\'s visible widgets in their saved order. Habit widgets read habits, habit_schedules, habit_logs and habit_reminders. ' +
      'Widgets whose source module does not exist yet (tasks, priorities, intentions, finance, learning) are returned with available: false and a reason.',
    query: [
      { key: 'period', value: 'week', description: 'day | week | month (default: saved default_period)', disabled: true },
      { key: 'date', value: '2026-10-21', description: 'Anchor date YYYY-MM-DD (default: today in the user\'s timezone)', disabled: true },
      { ...timezoneQuery, disabled: true },
    ],
    response: {
      code: 200,
      status: 'OK',
      body: {
        dashboard: {
          date: '2026-10-21',
          today: '2026-10-21',
          timezone: 'Asia/Kolkata',
          period: 'week',
          startDate: '2026-10-19',
          endDate: '2026-10-25',
          preferences: {
            visible_widgets: samplePreferences.visible_widgets,
            widget_order: samplePreferences.widget_order,
            default_period: 'week',
          },
          widgets: [
            {
              key: 'habit_progress',
              available: true,
              data: {
                date: '2026-10-21',
                activeHabits: 1,
                day: { date: '2026-10-21', ...sampleCounters, expected: 1, completed: 1, skipped: 0, pending: 0, upcoming: 0, completionRate: 100 },
                period: { period: 'week', startDate: '2026-10-19', endDate: '2026-10-25', ...sampleCounters },
                habits: [{ habitId: SAMPLE.habitId, name: 'Morning Run', habitType: 'positive', trackingType: 'duration', targetValue: 30, targetUnit: 'minutes', currentStreak: 3, status: 'completed', actualValue: 32 }],
              },
            },
            { key: 'today', available: true, data: { date: '2026-10-21', weekday: 'wednesday', timezone: 'Asia/Kolkata', isToday: true } },
            {
              key: 'upcoming_commitments',
              available: true,
              data: {
                from: '2026-10-21',
                to: '2026-10-27',
                sources: ['habits'],
                total: 1,
                items: [{ type: 'habit', date: '2026-10-23', habitId: SAMPLE.habitId, name: 'Morning Run', preferredTime: '06:30:00', reminderTimes: ['06:15:00'] }],
              },
            },
            {
              key: 'todays_tasks',
              available: false,
              reason: 'Requires the Tasks module (tasks, task schedules), which is not implemented yet.',
              data: null,
            },
          ],
        },
      },
    },
  },
  {
    name: 'Get Dashboard Preferences',
    method: 'GET',
    path: 'api/dashboard/preferences',
    description: 'Returns saved preferences, or defaults (all widgets visible, default order, period "week", is_default: true) when none are saved.',
    response: {
      code: 200,
      status: 'OK',
      body: {
        preferences: {
          id: null,
          user_id: SAMPLE.userId,
          visible_widgets: ALL_WIDGETS,
          widget_order: ALL_WIDGETS,
          default_period: 'week',
          updated_at: null,
          is_default: true,
        },
      },
    },
  },
  {
    name: 'Update Dashboard Preferences',
    method: 'PUT',
    path: 'api/dashboard/preferences',
    description:
      'Updates any of visibleWidgets, widgetOrder and defaultPeriod (day | week | month). Widgets missing from widgetOrder are appended in default order. Unknown or duplicate widgets return 400.',
    body: {
      visibleWidgets: ['today', 'habit_progress', 'weekly_habit_tracker', 'upcoming_commitments', 'daily_progress_chart'],
      widgetOrder: ['habit_progress', 'today'],
      defaultPeriod: 'week',
    },
    response: { code: 200, status: 'OK', body: { message: 'Dashboard preferences updated successfully.', preferences: samplePreferences } },
  },
];

/**
 * Sets the {{today}} collection variable (YYYY-MM-DD in {{timezone}}) before every request,
 * so date-based example requests work on any day.
 */
export const SET_TODAY_SCRIPT = [
  "var tz = pm.environment.get('timezone') || 'UTC';",
  'var today;',
  'try {',
  "    today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());",
  '} catch (e) {',
  '    today = new Date().toISOString().slice(0, 10);',
  '}',
  "pm.collectionVariables.set('today', today);",
];

const folder = (name: string, description: string, endpoints: EndpointDefinition[]) => ({
  name,
  description,
  item: endpoints.map(buildEndpoint),
});

export const dashboardHabitCollection = {
  info: {
    _postman_id: '3f7c2a91-6d4e-4b8a-9c15-e2d0a7b4f6c3',
    name: 'LifeTracker_Dashboard_Habit_APIs',
    description:
      'Dashboard and Habit Management (Commitments) APIs. Uses the shared LifeTracker_Environment: log in with the LifeTracker_Auth_Profile_APIs collection first so {{access_token}} is set. ' +
      'Every request inherits the collection-level Bearer token. Dates are YYYY-MM-DD; "today" is resolved in the X-Timezone header ({{timezone}}), defaulting to UTC. ' +
      'Create requests save generated IDs (category_id, habit_id, schedule_id, habit_log_id, reminder_id) into the environment. ' +
      'Delete requests are destructive: when using the Collection Runner, run them last (Delete Habit also removes its schedules, logs, flexibility settings and reminders).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: '{{access_token}}',
        type: 'string',
      },
    ],
  },
  event: [
    {
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: SET_TODAY_SCRIPT },
    },
  ],
  variable: [
    { key: 'today', value: '', type: 'string' },
  ],
  item: [
    folder(
      'Dashboard',
      'Dashboard overview (read-only aggregation from other modules) and per-user Dashboard preferences.',
      dashboardEndpoints
    ),
    folder('Habit Categories', 'System categories plus the user\'s custom categories. System categories are read-only.', categoryEndpoints),
    folder('Habits', 'Create, list, view, update, change status of and delete habits.', habitEndpoints),
    folder('Habit Schedules', 'Daily, selected-weekday and every-N-days schedules, with history.', scheduleEndpoints),
    folder('Habit Logs', 'Daily habit logs (one per habit per date) and progress statistics.', logEndpoints),
    folder('Habit Flexibility', 'Minimum/normal/ideal versions and recovery rules (one record per habit).', flexibilityEndpoints),
    folder('Habit Reminders', 'Reminder configuration only; delivery is handled separately.', reminderEndpoints),
  ],
};

export const dashboardHabitEnvironmentValues = [
  { key: 'timezone', value: 'Asia/Kolkata', type: 'default', enabled: true },
  { key: 'category_id', value: '', type: 'default', enabled: true },
  { key: 'habit_id', value: '', type: 'default', enabled: true },
  { key: 'schedule_id', value: '', type: 'default', enabled: true },
  { key: 'habit_log_id', value: '', type: 'default', enabled: true },
  { key: 'reminder_id', value: '', type: 'default', enabled: true },
];
