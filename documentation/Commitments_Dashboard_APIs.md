# Commitments & Dashboard APIs

Request/response examples for every endpoint are in the `LifeTracker_Dashboard_Habit_APIs` Postman collection, which uses the shared `LifeTracker_Environment`. This page covers the rules behind them.

All endpoints require `Authorization: Bearer <token>` (or the `access_token` cookie). The user is always taken from the token. A `user_id` sent in a request body is ignored, and another user's record returns `404`.

## Timezone

Users have no stored timezone yet, so "today", default date ranges and future-date checks use the timezone sent with each request:

1. `?timezone=<IANA name>` (validated; an invalid value returns `400`)
2. `X-Timezone: <IANA name>` header
3. `UTC` if neither is sent

Dates are `YYYY-MM-DD`. Weeks run Monday to Sunday.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/habits/categories` | System + own categories |
| POST | `/api/habits/categories` | Create custom category |
| PUT | `/api/habits/categories/:id` | Update custom category (system → 403) |
| DELETE | `/api/habits/categories/:id` | Delete custom category (habits keep, `category_id` → null) |
| POST | `/api/habits` | Create habit |
| GET | `/api/habits` | List (filters: `categoryId`, `status`, `habitType`, `frequencyType`, `trackingType`, `page`, `limit`) |
| GET | `/api/habits/:id` | Habit + current schedule, schedule history, flexibility, reminders |
| PUT | `/api/habits/:id` | Partial update (`null` clears nullable fields) |
| PATCH | `/api/habits/:id/status` | `active` / `paused` / `archived` / `completed` |
| DELETE | `/api/habits/:id` | Delete habit and all child records |
| POST | `/api/habits/:id/schedules` | Create schedule |
| GET | `/api/habits/:id/schedules` | `currentSchedule` + history |
| PUT | `/api/habits/:id/schedules/:scheduleId` | Update schedule |
| DELETE | `/api/habits/:id/schedules/:scheduleId` | Delete schedule |
| POST | `/api/habits/:id/logs` | Log one date |
| GET | `/api/habits/:id/logs` | Logs for one habit (`startDate`, `endDate`, `status`, paging) |
| PUT | `/api/habits/:id/logs/:logId` | Update log |
| DELETE | `/api/habits/:id/logs/:logId` | Delete log |
| GET | `/api/habits/logs` | Logs across habits (`startDate`, `endDate`, `habitId`, `status`, paging) |
| GET | `/api/habits/progress` | Statistics (`period`, `date`, `startDate`, `endDate`, `habitId`) |
| POST/GET/PUT/DELETE | `/api/habits/:id/flexibility` | One flexibility record per habit |
| POST/GET | `/api/habits/:id/reminders` | Create / list reminders |
| PUT/DELETE | `/api/habits/:id/reminders/:reminderId` | Update / delete reminder |
| PATCH | `/api/habits/:id/reminders/:reminderId/toggle` | `{ "isEnabled": boolean }` |
| GET | `/api/dashboard` | Overview (`date`, `period`, `timezone`) |
| GET | `/api/dashboard/preferences` | Saved preferences or defaults |
| PUT | `/api/dashboard/preferences` | `visibleWidgets`, `widgetOrder`, `defaultPeriod` |

## Habit rules

- Measurable habits (`count`, `duration`, `quantity`) require `targetValue`.
- Editing, pausing or archiving a habit keeps its logs. Archived habits can't get new logs (`409`). Deleting a habit removes its logs.

## Schedules

| `scheduleType` | Required | Scheduled on |
|---|---|---|
| `daily` | — | every day |
| `selected_days` | `weekdays` (e.g. `["monday","wednesday"]`) | those weekdays |
| `interval` | `intervalDays` ≥ 1 | every N days counted from `effectiveFrom` |

- A habit can have several schedules over time, but their date ranges can't overlap. Past days are always checked against the schedule that was in effect on that day.
- The first schedule starts on the habit's start date by default. A later schedule starts today by default and ends the open-ended schedule it replaces the day before. Any other overlap returns `409`.
- A habit with no schedules uses its `frequencyType`: `daily` and `custom` mean every day; `weekly` means the weekday of `startDate`.

## Logs

- One log per habit per date. Creating a second one returns `409`, with `errors[0].existingLogId` pointing at the existing log. To change it, use `PUT`.
- If `status` is omitted: boolean habits are logged as `completed`. Measurable habits compare `actualValue` to the target: at or above the target is `completed`, above 0 is `partial`, and 0 is `missed`.
- `completed_at` is set automatically when a log becomes `completed` and cleared when it moves to any other status.
- Future dates (in the request's timezone) and dates outside the habit's start and end dates are rejected.

## Progress

Each day of each habit gets one status: `completed`, `partial`, `skipped`, `missed` (a past scheduled day with no log), `pending` (today, not logged yet), `upcoming` (a future scheduled day) or `not_scheduled`.

- `expected` counts scheduled days up to today. Days that aren't scheduled are never counted as missed. A completed log on such a day counts toward `unscheduledCompletions`.
- `completionRate` = `completed / (expected − skipped) × 100`. It is `null` when there is nothing to measure.
- `currentStreak` counts the scheduled days completed in a row, going back from today. A pending today or a skipped day doesn't break it.
- Without `habitId`, progress covers **active** habits only. With `habitId`, it covers that one habit whatever its status.
- The response includes a `summary`, a `daily` series, a `weekly` series and per-habit `days`. The maximum range is 366 days.

## Dashboard

The Dashboard only reads data from other modules. It keeps no copies.

| Widget | Status | Source |
|---|---|---|
| `today` | available | request timezone |
| `habit_progress` | available | habits, habit_schedules, habit_logs |
| `weekly_habit_tracker` | available | habits, habit_schedules, habit_logs |
| `daily_progress_chart` | available (habits only) | habit_logs |
| `upcoming_commitments` | available (habits only, next 7 days) | habit_schedules, habit_reminders |
| `todays_tasks`, `task_completion` | pending | Tasks module |
| `todays_priorities`, `todays_intention` | pending | Daily planning module |
| `money_spent_this_week`, `income_overview`, `investment_summary` | pending | Finance module |
| `learning_summary` | pending | Learning module |

Widgets come back as an array, in the user's `widget_order`, filtered to `visible_widgets`. A pending widget looks like `{ key, available: false, reason, data: null }`. To enable one, add a provider in `src/modules/dashboard/dashboard.service.ts` and remove its entry from `PENDING_WIDGET_SOURCES` in `dashboard.widgets.ts`.

Preferences default to all widgets visible, the default order and `default_period: "week"` (shown with `is_default: true`). A row is saved on the first `PUT`. Widgets left out of `widgetOrder` are added at the end.

## Reminders

This API only stores reminder settings. `reminderType` defaults to `in_app`; `push` and `email` are accepted but nothing sends notifications yet.
