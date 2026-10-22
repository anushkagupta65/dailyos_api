/**
 * Postman collection for the Tasks, Daily Priorities, Daily Intentions, Notes and Learning modules.
 * Imported by generate_postman.ts, which writes LifeTracker_Tasks_Notes_Learning_APIs.postman_collection.json.
 */
import { buildEndpoint, EndpointDefinition, QueryParam, SET_TODAY_SCRIPT } from './postman_dashboard_habit';

const USER_ID = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const TS = '2026-10-21T08:00:00.000Z';
const pagination = (total: number, limit: number) => ({ page: 1, limit, total, totalPages: Math.ceil(total / limit) });

const idVar = (envKey: string, description: string) => ({ value: `{{${envKey}}}`, description });
const taskVars = { id: idVar('task_id', 'UUID of the task') };
const priorityVars = { id: idVar('priority_id', 'UUID of the priority') };
const intentionVars = { id: idVar('intention_id', 'UUID of the intention') };
const noteVars = { id: idVar('note_id', 'UUID of the note') };
const noteCategoryVars = { id: idVar('note_category_id', 'UUID of the note category') };
const learningVars = { id: idVar('learning_id', 'UUID of the learning entry') };

const paging = (limit: number): QueryParam[] => [
  { key: 'page', value: '1', description: 'Page number (default 1)' },
  { key: 'limit', value: String(limit), description: `Page size, max 100 (default ${limit})` },
];

// ---------------- SAMPLES ----------------
const sampleTask = {
  id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
  user_id: USER_ID,
  title: 'Prepare quarterly report',
  description: 'Numbers and summary',
  category: 'Work',
  priority: 'high',
  status: 'planned',
  scheduled_date: '2026-10-21',
  due_date: '2026-10-23',
  start_time: '09:00:00',
  end_time: '10:30:00',
  estimated_minutes: 90,
  actual_minutes: null,
  completed_at: null,
  source: 'manual',
  created_at: TS,
  updated_at: TS,
};
const sampleSubtask = {
  id: 'bb22cc33-dd44-4e55-8f66-0077889900aa',
  task_id: sampleTask.id,
  user_id: USER_ID,
  title: 'Collect numbers',
  is_completed: false,
  sort_order: 0,
  completed_at: null,
  created_at: TS,
  updated_at: TS,
};
const samplePriority = {
  id: 'cc33dd44-ee55-4f66-8077-8899aabbccdd',
  user_id: USER_ID,
  priority_date: '2026-10-21',
  title: 'Ship the onboarding flow',
  description: 'Behind a feature flag',
  priority_order: 1,
  is_completed: false,
  completed_at: null,
  created_at: TS,
  updated_at: TS,
};
const sampleIntention = {
  id: 'dd44ee55-ff66-4077-8188-99aabbccddee',
  user_id: USER_ID,
  intention_date: '2026-10-21',
  content: 'Be present and finish what I start',
  created_at: TS,
  updated_at: TS,
};
const sampleCategory = {
  id: 'ee55ff66-0077-4188-8299-aabbccddeeff',
  user_id: USER_ID,
  name: 'Mindset',
  color: '#8B5CF6',
  created_at: TS,
  updated_at: TS,
};
const sampleNote = {
  id: 'ff660077-1188-4299-83aa-bbccddeeff00',
  user_id: USER_ID,
  category_id: sampleCategory.id,
  title: 'Evening reflection',
  content: 'Felt calm after the walk',
  note_type: 'reflection',
  source: null,
  occurred_at: '2026-10-20T18:30:00.000Z',
  is_pinned: false,
  archived_at: null,
  created_at: TS,
  updated_at: TS,
  category_name: 'Mindset',
  category_color: '#8B5CF6',
  tags: ['focus', 'gratitude'],
};
const sampleLearning = {
  id: '00778899-aabb-4ccd-8dee-ff0011223344',
  user_id: USER_ID,
  title: 'Spaced repetition',
  content: 'Reviewing at increasing intervals improves retention',
  key_takeaway: 'Review after 1, 3 and 7 days',
  category: 'Memory',
  source: 'Make It Stick',
  learned_at: '2026-10-21',
  review_date: '2026-10-24',
  created_at: TS,
  updated_at: TS,
};
const sampleReview = {
  id: '11223344-5566-4778-899a-abbccddeeff0',
  user_id: USER_ID,
  learning_id: sampleLearning.id,
  reviewed_at: TS,
  reflection: 'Recalled the key intervals without notes',
  understanding_level: 4,
  created_at: TS,
  updated_at: TS,
};
const sampleHistory = [
  { id: '22334455-6677-4889-9aab-bccddeeff001', task_id: sampleTask.id, user_id: USER_ID, previous_status: null, new_status: 'planned', changed_at: TS, note: 'Task created' },
  { id: '33445566-7788-499a-8bbc-cddeeff00112', task_id: sampleTask.id, user_id: USER_ID, previous_status: 'planned', new_status: 'completed', changed_at: '2026-10-21T11:00:00.000Z', note: 'Sent to manager' },
];

// ---------------- TASKS ----------------
const taskEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Task',
    method: 'POST',
    path: 'api/tasks',
    description: 'Creates a task, optionally with subtasks. Status defaults to "planned" when scheduledDate is set, otherwise "inbox". A creation entry is written to the status history.',
    body: {
      title: 'Prepare quarterly report',
      description: 'Numbers and summary',
      category: 'Work',
      priority: 'high',
      scheduledDate: '{{today}}',
      startTime: '09:00',
      endTime: '10:30',
      estimatedMinutes: 90,
      subtasks: [{ title: 'Collect numbers' }, { title: 'Write summary' }],
    },
    response: { code: 201, status: 'Created', body: { message: 'Task created successfully.', task: { ...sampleTask, subtasks: [sampleSubtask] } } },
    saveVariables: [['task_id', 'task.id']],
  },
  {
    name: 'Get All Tasks',
    method: 'GET',
    path: 'api/tasks',
    description: 'Lists the user\'s tasks with filters, pagination and sorting. startDate/endDate apply to dateField (scheduledDate by default).',
    query: [
      { key: 'status', value: 'planned', description: 'inbox | planned | active | completed | cancelled', disabled: true },
      { key: 'priority', value: 'high', description: 'low | medium | high | urgent', disabled: true },
      { key: 'category', value: 'Work', description: 'Case-insensitive category match', disabled: true },
      { key: 'scheduledDate', value: '{{today}}', description: 'YYYY-MM-DD', disabled: true },
      { key: 'dueDate', value: '{{today}}', description: 'YYYY-MM-DD', disabled: true },
      { key: 'startDate', value: '{{today}}', description: 'Range start (YYYY-MM-DD)', disabled: true },
      { key: 'endDate', value: '{{today}}', description: 'Range end (YYYY-MM-DD)', disabled: true },
      { key: 'dateField', value: 'scheduledDate', description: 'scheduledDate | dueDate (field used by startDate/endDate)', disabled: true },
      { key: 'search', value: 'report', description: 'Search in task title', disabled: true },
      { key: 'sortBy', value: 'createdAt', description: 'createdAt | updatedAt | scheduledDate | dueDate | priority | title' },
      { key: 'sortOrder', value: 'desc', description: 'asc | desc' },
      ...paging(10),
    ],
    response: { code: 200, status: 'OK', body: { data: [sampleTask], pagination: pagination(1, 10) } },
  },
  {
    name: 'Get Task Details',
    method: 'GET',
    path: 'api/tasks/:id',
    pathVariables: taskVars,
    description: 'Returns a task with its subtasks and a subtask summary.',
    response: { code: 200, status: 'OK', body: { task: { ...sampleTask, subtasks: [sampleSubtask], subtask_summary: { total: 1, completed: 0 } } } },
  },
  {
    name: 'Update Task',
    method: 'PUT',
    path: 'api/tasks/:id',
    pathVariables: taskVars,
    description: 'Partially updates a task (null clears nullable fields). A status change here also updates completed_at and the status history.',
    body: { priority: 'urgent', dueDate: '{{today}}', actualMinutes: 75 },
    response: { code: 200, status: 'OK', body: { message: 'Task updated successfully.', task: { ...sampleTask, priority: 'urgent', due_date: '2026-10-21', actual_minutes: 75 } } },
  },
  {
    name: 'Update Task Status',
    method: 'PATCH',
    path: 'api/tasks/:id/status',
    pathVariables: taskVars,
    description: 'Changes status and records history. completed_at is set when completed and cleared when reopened. An unchanged status writes no history.',
    body: { status: 'completed', note: 'Sent to manager' },
    response: { code: 200, status: 'OK', body: { message: 'Task status updated successfully.', task: { ...sampleTask, status: 'completed', completed_at: '2026-10-21T11:00:00.000Z' } } },
  },
  {
    name: 'Get Task Status History',
    method: 'GET',
    path: 'api/tasks/:id/history',
    pathVariables: taskVars,
    description: 'Status changes for a task, oldest first.',
    response: { code: 200, status: 'OK', body: { history: sampleHistory } },
  },
  {
    name: 'Add Subtask',
    method: 'POST',
    path: 'api/tasks/:id/subtasks',
    pathVariables: taskVars,
    description: 'Adds a subtask. sortOrder defaults to the end of the list.',
    body: { title: 'Proofread' },
    response: { code: 201, status: 'Created', body: { message: 'Subtask created successfully.', subtask: { ...sampleSubtask, title: 'Proofread', sort_order: 2 } } },
    saveVariables: [['subtask_id', 'subtask.id']],
  },
  {
    name: 'Update Subtask',
    method: 'PUT',
    path: 'api/tasks/:id/subtasks/:subtaskId',
    pathVariables: { ...taskVars, subtaskId: idVar('subtask_id', 'UUID of the subtask') },
    description: 'Updates a subtask. completed_at follows isCompleted.',
    body: { isCompleted: true },
    response: { code: 200, status: 'OK', body: { message: 'Subtask updated successfully.', subtask: { ...sampleSubtask, is_completed: true, completed_at: TS } } },
  },
  {
    name: 'Delete Subtask',
    method: 'DELETE',
    path: 'api/tasks/:id/subtasks/:subtaskId',
    pathVariables: { ...taskVars, subtaskId: idVar('subtask_id', 'UUID of the subtask') },
    description: 'Deletes a subtask.',
    response: { code: 200, status: 'OK', body: { message: 'Subtask deleted successfully.' } },
  },
  {
    name: 'Delete Task',
    method: 'DELETE',
    path: 'api/tasks/:id',
    pathVariables: taskVars,
    description: 'Deletes a task with its subtasks and status history.',
    response: { code: 200, status: 'OK', body: { message: 'Task deleted successfully.' } },
  },
];

// ---------------- PRIORITIES ----------------
const priorityEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Priority',
    method: 'POST',
    path: 'api/priorities',
    description: 'Adds a priority at the end of the day\'s list (max 3 per day; a 4th returns 409). priorityDate defaults to today in the user\'s timezone.',
    body: { priorityDate: '{{today}}', title: 'Ship the onboarding flow', description: 'Behind a feature flag' },
    response: { code: 201, status: 'Created', body: { message: 'Priority created successfully.', priority: samplePriority } },
    saveVariables: [['priority_id', 'priority.id']],
  },
  {
    name: 'Get Priorities',
    method: 'GET',
    path: 'api/priorities',
    description: 'Priorities newest date first, ordered within each day.',
    query: [
      { key: 'date', value: '{{today}}', description: 'Single date (YYYY-MM-DD)' },
      { key: 'startDate', value: '{{today}}', description: 'Range start', disabled: true },
      { key: 'endDate', value: '{{today}}', description: 'Range end', disabled: true },
      { key: 'isCompleted', value: 'false', description: 'true | false', disabled: true },
      ...paging(30),
    ],
    response: { code: 200, status: 'OK', body: { data: [samplePriority], pagination: pagination(1, 30) } },
  },
  {
    name: 'Get Priority Details',
    method: 'GET',
    path: 'api/priorities/:id',
    pathVariables: priorityVars,
    description: 'Returns one priority.',
    response: { code: 200, status: 'OK', body: { priority: samplePriority } },
  },
  {
    name: 'Update Priority',
    method: 'PUT',
    path: 'api/priorities/:id',
    pathVariables: priorityVars,
    description: 'Updates title/description. The date cannot be changed, so earlier days stay intact.',
    body: { title: 'Ship the onboarding flow (v2)' },
    response: { code: 200, status: 'OK', body: { message: 'Priority updated successfully.', priority: { ...samplePriority, title: 'Ship the onboarding flow (v2)' } } },
  },
  {
    name: 'Update Priority Completion',
    method: 'PATCH',
    path: 'api/priorities/:id/completion',
    pathVariables: priorityVars,
    description: 'Marks a priority completed or incomplete; completed_at follows.',
    body: { isCompleted: true },
    response: { code: 200, status: 'OK', body: { message: 'Priority marked as completed.', priority: { ...samplePriority, is_completed: true, completed_at: TS } } },
  },
  {
    name: 'Reorder Priorities',
    method: 'PATCH',
    path: 'api/priorities/reorder',
    description: 'Sets the order for one date. priorityIds must list exactly that date\'s priorities, in the new order.',
    body: { priorityDate: '{{today}}', priorityIds: ['{{priority_id}}'] },
    response: { code: 200, status: 'OK', body: { message: 'Priorities reordered successfully.', priorities: [samplePriority] } },
  },
  {
    name: 'Delete Priority',
    method: 'DELETE',
    path: 'api/priorities/:id',
    pathVariables: priorityVars,
    description: 'Deletes a priority and closes the gap in that day\'s order.',
    response: { code: 200, status: 'OK', body: { message: 'Priority deleted successfully.' } },
  },
];

// ---------------- INTENTIONS ----------------
const intentionEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Intention',
    method: 'POST',
    path: 'api/intentions',
    description: 'One intention per user per day; a second one for the same date returns 409 with existingIntentionId. intentionDate defaults to today in the user\'s timezone.',
    body: { intentionDate: '{{today}}', content: 'Be present and finish what I start' },
    response: { code: 201, status: 'Created', body: { message: 'Intention created successfully.', intention: sampleIntention } },
    saveVariables: [['intention_id', 'intention.id']],
  },
  {
    name: 'Get Intentions',
    method: 'GET',
    path: 'api/intentions',
    description: 'Intentions newest first.',
    query: [
      { key: 'date', value: '{{today}}', description: 'Single date (YYYY-MM-DD)', disabled: true },
      { key: 'startDate', value: '{{today}}', description: 'Range start', disabled: true },
      { key: 'endDate', value: '{{today}}', description: 'Range end', disabled: true },
      ...paging(30),
    ],
    response: { code: 200, status: 'OK', body: { data: [sampleIntention], pagination: pagination(1, 30) } },
  },
  {
    name: 'Get Intention Details',
    method: 'GET',
    path: 'api/intentions/:id',
    pathVariables: intentionVars,
    description: 'Returns one intention.',
    response: { code: 200, status: 'OK', body: { intention: sampleIntention } },
  },
  {
    name: 'Update Intention',
    method: 'PUT',
    path: 'api/intentions/:id',
    pathVariables: intentionVars,
    description: 'Updates the content of that date\'s existing intention.',
    body: { content: 'Be kind and patient' },
    response: { code: 200, status: 'OK', body: { message: 'Intention updated successfully.', intention: { ...sampleIntention, content: 'Be kind and patient' } } },
  },
  {
    name: 'Delete Intention',
    method: 'DELETE',
    path: 'api/intentions/:id',
    pathVariables: intentionVars,
    description: 'Deletes an intention.',
    response: { code: 200, status: 'OK', body: { message: 'Intention deleted successfully.' } },
  },
];

// ---------------- NOTES ----------------
const noteFilters: QueryParam[] = [
  { key: 'noteType', value: 'reflection', description: 'learning | reflection | observation | idea | journal | general', disabled: true },
  { key: 'categoryId', value: '{{note_category_id}}', description: 'Filter by category', disabled: true },
  { key: 'tag', value: 'focus', description: 'Filter by tag (case-insensitive)', disabled: true },
  { key: 'isPinned', value: 'true', description: 'true | false', disabled: true },
  { key: 'archived', value: 'false', description: 'false (default) | true | all' },
  { key: 'sortBy', value: 'createdAt', description: 'createdAt | updatedAt | occurredAt | title (pinned notes always first)' },
  { key: 'sortOrder', value: 'desc', description: 'asc | desc' },
  ...paging(20),
];

const noteEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Note',
    method: 'POST',
    path: 'api/notes',
    description: 'Creates a note. Tags are stored lowercase without duplicates. categoryId (optional) must be one of the user\'s note categories.',
    body: {
      title: 'Evening reflection',
      content: 'Felt calm after the walk',
      noteType: 'reflection',
      occurredAt: '2026-10-20T18:30:00.000Z',
      tags: ['Focus', 'gratitude'],
    },
    response: { code: 201, status: 'Created', body: { message: 'Note created successfully.', note: sampleNote } },
    saveVariables: [['note_id', 'note.id']],
  },
  {
    name: 'Get All Notes',
    method: 'GET',
    path: 'api/notes',
    description: 'Lists notes with filters. Archived notes are excluded unless archived=true or archived=all.',
    query: noteFilters,
    response: { code: 200, status: 'OK', body: { data: [sampleNote], pagination: pagination(1, 20) } },
  },
  {
    name: 'Search Notes',
    method: 'GET',
    path: 'api/notes/search',
    description: 'Searches title, content and tags (case-insensitive). Accepts the same filters, pagination and sorting as Get All Notes.',
    query: [{ key: 'q', value: 'reflection', description: 'Search text (required)' }, ...noteFilters],
    response: { code: 200, status: 'OK', body: { data: [sampleNote], pagination: pagination(1, 20) } },
  },
  {
    name: 'Get Note Details',
    method: 'GET',
    path: 'api/notes/:id',
    pathVariables: noteVars,
    description: 'Returns a note with its category and tags (archived notes included).',
    response: { code: 200, status: 'OK', body: { note: sampleNote } },
  },
  {
    name: 'Update Note',
    method: 'PUT',
    path: 'api/notes/:id',
    pathVariables: noteVars,
    description: 'Partially updates a note. Sending tags replaces all of the note\'s tags.',
    body: { title: 'Evening reflection (edited)', categoryId: '{{note_category_id}}' },
    response: { code: 200, status: 'OK', body: { message: 'Note updated successfully.', note: { ...sampleNote, title: 'Evening reflection (edited)' } } },
  },
  {
    name: 'Pin/Unpin Note',
    method: 'PATCH',
    path: 'api/notes/:id/pin',
    pathVariables: noteVars,
    description: 'Pins or unpins a note.',
    body: { isPinned: true },
    response: { code: 200, status: 'OK', body: { message: 'Note pinned successfully.', note: { ...sampleNote, is_pinned: true } } },
  },
  {
    name: 'Archive Note',
    method: 'PATCH',
    path: 'api/notes/:id/archive',
    pathVariables: noteVars,
    description: 'Archives a note (archived defaults to true); send { "archived": false } to unarchive. Archived notes stay stored.',
    body: { archived: true },
    response: { code: 200, status: 'OK', body: { message: 'Note archived successfully.', note: { ...sampleNote, archived_at: TS } } },
  },
  {
    name: 'Set Note Tags',
    method: 'PUT',
    path: 'api/notes/:id/tags',
    pathVariables: noteVars,
    description: 'Replaces the note\'s tags (mode "replace", default) or adds to them (mode "add"). Duplicates are ignored.',
    body: { tags: ['calm', 'focus'], mode: 'add' },
    response: { code: 200, status: 'OK', body: { message: 'Note tags updated successfully.', note: { ...sampleNote, tags: ['calm', 'focus', 'gratitude'] } } },
  },
  {
    name: 'Delete Note',
    method: 'DELETE',
    path: 'api/notes/:id',
    pathVariables: noteVars,
    description: 'Deletes a note and its tags.',
    response: { code: 200, status: 'OK', body: { message: 'Note deleted successfully.' } },
  },
];

const noteCategoryEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Note Category',
    method: 'POST',
    path: 'api/notes/categories',
    description: 'Creates a note category (names are unique per user, case-insensitive).',
    body: { name: 'Mindset', color: '#8B5CF6' },
    response: { code: 201, status: 'Created', body: { message: 'Note category created successfully.', category: sampleCategory } },
    saveVariables: [['note_category_id', 'category.id']],
  },
  {
    name: 'Get Note Categories',
    method: 'GET',
    path: 'api/notes/categories',
    description: 'Lists the user\'s note categories.',
    response: { code: 200, status: 'OK', body: { categories: [sampleCategory] } },
  },
  {
    name: 'Update Note Category',
    method: 'PUT',
    path: 'api/notes/categories/:id',
    pathVariables: noteCategoryVars,
    description: 'Updates a note category.',
    body: { color: '#6D28D9' },
    response: { code: 200, status: 'OK', body: { message: 'Note category updated successfully.', category: { ...sampleCategory, color: '#6D28D9' } } },
  },
  {
    name: 'Delete Note Category',
    method: 'DELETE',
    path: 'api/notes/categories/:id',
    pathVariables: noteCategoryVars,
    description: 'Deletes a category. Its notes are kept with category_id set to null.',
    response: { code: 200, status: 'OK', body: { message: 'Note category deleted successfully.' } },
  },
];

// ---------------- LEARNING ----------------
const learningFilters: QueryParam[] = [
  { key: 'category', value: 'Memory', description: 'Case-insensitive category match', disabled: true },
  { key: 'learnedFrom', value: '{{today}}', description: 'learned_at >= (YYYY-MM-DD)', disabled: true },
  { key: 'learnedTo', value: '{{today}}', description: 'learned_at <=', disabled: true },
  { key: 'reviewFrom', value: '{{today}}', description: 'review_date >=', disabled: true },
  { key: 'reviewTo', value: '{{today}}', description: 'review_date <=', disabled: true },
  { key: 'sortBy', value: 'learnedAt', description: 'learnedAt | reviewDate | createdAt | updatedAt | title' },
  { key: 'sortOrder', value: 'desc', description: 'asc | desc' },
  ...paging(20),
];

const learningEndpoints: EndpointDefinition[] = [
  {
    name: 'Create Learning Entry',
    method: 'POST',
    path: 'api/learning',
    description: 'Creates a learning entry. learnedAt defaults to today in the user\'s timezone; reviewDate must be on or after learnedAt.',
    body: {
      title: 'Spaced repetition',
      content: 'Reviewing at increasing intervals improves retention',
      keyTakeaway: 'Review after 1, 3 and 7 days',
      category: 'Memory',
      source: 'Make It Stick',
      learnedAt: '{{today}}',
    },
    response: { code: 201, status: 'Created', body: { message: 'Learning entry created successfully.', learning: sampleLearning } },
    saveVariables: [['learning_id', 'learning.id']],
  },
  {
    name: 'Get All Learning Entries',
    method: 'GET',
    path: 'api/learning',
    description: 'Lists learning entries with filters, pagination and sorting.',
    query: learningFilters,
    response: { code: 200, status: 'OK', body: { data: [sampleLearning], pagination: pagination(1, 20) } },
  },
  {
    name: 'Search Learning Entries',
    method: 'GET',
    path: 'api/learning/search',
    description: 'Searches title, content, category and source (case-insensitive). Accepts the same filters as Get All Learning Entries.',
    query: [{ key: 'q', value: 'repetition', description: 'Search text (required)' }, ...learningFilters],
    response: { code: 200, status: 'OK', body: { data: [sampleLearning], pagination: pagination(1, 20) } },
  },
  {
    name: 'Get Upcoming Reviews',
    method: 'GET',
    path: 'api/learning/upcoming-reviews',
    description: 'Entries due for review. Default window: overdue entries plus today .. today + days. With startDate/endDate, only that range.',
    query: [
      { key: 'days', value: '7', description: 'Days ahead when endDate is not given (default 7)' },
      { key: 'includeOverdue', value: 'true', description: 'true (default) | false', disabled: true },
      { key: 'startDate', value: '{{today}}', description: 'Range start (YYYY-MM-DD)', disabled: true },
      { key: 'endDate', value: '{{today}}', description: 'Range end (YYYY-MM-DD)', disabled: true },
      ...paging(20),
    ],
    response: {
      code: 200,
      status: 'OK',
      body: {
        data: [{ ...sampleLearning, is_overdue: false, days_until_review: 3 }],
        pagination: pagination(1, 20),
        range: { startDate: null, endDate: '2026-10-28', today: '2026-10-21', timezone: 'Asia/Kolkata' },
      },
    },
  },
  {
    name: 'Get Learning Entry Details',
    method: 'GET',
    path: 'api/learning/:id',
    pathVariables: learningVars,
    description: 'Returns an entry with its review status and full review history.',
    response: {
      code: 200,
      status: 'OK',
      body: { learning: { ...sampleLearning, is_overdue: false, days_until_review: 3, review_count: 1, last_reviewed_at: TS, reviews: [sampleReview] } },
    },
  },
  {
    name: 'Update Learning Entry',
    method: 'PUT',
    path: 'api/learning/:id',
    pathVariables: learningVars,
    description: 'Partially updates a learning entry (null clears nullable fields).',
    body: { keyTakeaway: 'Review after 1, 3, 7 and 14 days', reviewDate: '{{today}}' },
    response: { code: 200, status: 'OK', body: { message: 'Learning entry updated successfully.', learning: { ...sampleLearning, key_takeaway: 'Review after 1, 3, 7 and 14 days', review_date: '2026-10-21' } } },
  },
  {
    name: 'Delete Learning Entry',
    method: 'DELETE',
    path: 'api/learning/:id',
    pathVariables: learningVars,
    description: 'Deletes a learning entry and its reviews.',
    response: { code: 200, status: 'OK', body: { message: 'Learning entry deleted successfully.' } },
  },
];

const reviewVars = { ...learningVars, reviewId: idVar('learning_review_id', 'UUID of the review') };

const reviewEndpoints: EndpointDefinition[] = [
  {
    name: 'Add Learning Review',
    method: 'POST',
    path: 'api/learning/:id/reviews',
    pathVariables: learningVars,
    description: 'Adds a review (earlier reviews are never overwritten). understandingLevel is 1-5. nextReviewDate (optional) updates the entry\'s review_date in the same transaction.',
    body: { reflection: 'Recalled the key intervals without notes', understandingLevel: 4, nextReviewDate: null },
    response: { code: 201, status: 'Created', body: { message: 'Learning review added successfully.', review: sampleReview, learning: { ...sampleLearning, review_date: null } } },
    saveVariables: [['learning_review_id', 'review.id']],
  },
  {
    name: 'Get Learning Reviews',
    method: 'GET',
    path: 'api/learning/:id/reviews',
    pathVariables: learningVars,
    description: 'Review history for an entry, newest first.',
    response: { code: 200, status: 'OK', body: { reviews: [sampleReview] } },
  },
  {
    name: 'Update Learning Review',
    method: 'PUT',
    path: 'api/learning/:id/reviews/:reviewId',
    pathVariables: reviewVars,
    description: 'Updates a review.',
    body: { understandingLevel: 5 },
    response: { code: 200, status: 'OK', body: { message: 'Learning review updated successfully.', review: { ...sampleReview, understanding_level: 5 } } },
  },
  {
    name: 'Delete Learning Review',
    method: 'DELETE',
    path: 'api/learning/:id/reviews/:reviewId',
    pathVariables: reviewVars,
    description: 'Deletes a review.',
    response: { code: 200, status: 'OK', body: { message: 'Learning review deleted successfully.' } },
  },
];

const folder = (name: string, description: string, endpoints: EndpointDefinition[]) => ({
  name,
  description,
  item: endpoints.map(buildEndpoint),
});

export const tasksNotesLearningCollection = {
  info: {
    _postman_id: '7d1e9b42-3a6c-4f85-9e20-b4c8a1f5d3e7',
    name: 'LifeTracker_Tasks_Notes_Learning_APIs',
    description:
      'Tasks, Daily Priorities, Daily Intentions, Notes and Learning APIs. Uses the shared LifeTracker_Environment: log in with the LifeTracker_Auth_Profile_APIs collection first so {{access_token}} is set. ' +
      'Every request inherits the collection-level Bearer token. Dates are YYYY-MM-DD; "today" is resolved in the X-Timezone header ({{timezone}}), defaulting to UTC. ' +
      'Create requests save generated IDs into the environment. Delete requests are destructive: run them last in the Collection Runner.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
  },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: SET_TODAY_SCRIPT } }],
  variable: [{ key: 'today', value: '', type: 'string' }],
  item: [
    folder('Tasks', 'Tasks, subtasks and task status history.', taskEndpoints),
    folder('Daily Priorities', 'Up to three ordered priorities per day.', priorityEndpoints),
    folder('Daily Intentions', 'One primary intention per day.', intentionEndpoints),
    folder('Notes', 'Notes, tags, pinning, archiving and search.', noteEndpoints),
    folder('Note Categories', 'User-defined note categories.', noteCategoryEndpoints),
    folder('Learning', 'Learning entries, search and upcoming reviews.', learningEndpoints),
    folder('Learning Reviews', 'Append-only review history for learning entries.', reviewEndpoints),
  ],
};

export const tasksNotesLearningEnvironmentValues = [
  'task_id',
  'subtask_id',
  'priority_id',
  'intention_id',
  'note_id',
  'note_category_id',
  'learning_id',
  'learning_review_id',
].map((key) => ({ key, value: '', type: 'default', enabled: true }));
