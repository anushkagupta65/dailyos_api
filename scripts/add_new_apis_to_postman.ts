import fs from 'node:fs';
import path from 'node:path';
import { validateAndSyncPostman } from './generate_postman';

const authHeader = {
  key: 'Authorization',
  value: 'Bearer {{access_token}}',
  type: 'text',
};

const jsonHeaders = [
  authHeader,
  {
    key: 'Content-Type',
    value: 'application/json',
    type: 'text',
  },
];

const makeRequest = (
  name: string,
  method: string,
  pathSegments: string[],
  body: any = null,
  testScript: string[] = [],
  queryParams: Array<{ key: string; value: string; description?: string }> = []
) => {
  const rawUrl = `{{base_url}}/${pathSegments.join('/')}${
    queryParams.length > 0 ? '?' + queryParams.map((q) => `${q.key}=${q.value}`).join('&') : ''
  }`;

  const req: any = {
    name,
    event: [
      {
        listen: 'test',
        script: {
          exec: testScript.length > 0 ? testScript : [
            'pm.test("Status code is successful", function () {',
            '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
            '});',
          ],
          type: 'text/javascript',
        },
      },
    ],
    request: {
      method,
      header: body ? jsonHeaders : [authHeader],
      url: {
        raw: rawUrl,
        host: ['{{base_url}}'],
        path: pathSegments,
        query: queryParams.length > 0 ? queryParams : undefined,
      },
    },
    response: [],
  };

  if (body) {
    req.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  return req;
};

export const updatePostmanCollection = () => {
  const collectionPath = path.join(__dirname, '../documentation/LifeTracker.postman_collection.json');
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

  // 1. Tasks -> Recurring Tasks
  const tasksFolder = collection.item.find((i: any) => i.name === 'Tasks');
  if (tasksFolder) {
    // Avoid duplicate addition if run multiple times
    tasksFolder.item = tasksFolder.item.filter((sub: any) => sub.name !== 'Recurring Tasks');

    const recurringTasksFolder = {
      name: 'Recurring Tasks',
      item: [
        makeRequest(
          'Create Task Recurrence',
          'POST',
          ['api', 'tasks', 'recurrences'],
          {
            taskId: '{{task_id}}',
            frequency: 'weekly',
            weekdays: ['monday', 'wednesday', 'friday'],
            intervalValue: 1,
            startDate: '{{today}}',
            endDate: null,
            isActive: true,
          },
          [
            'pm.test("Status code is 201 Created", function () {',
            '    pm.response.to.have.status(201);',
            '});',
            'var jsonData = pm.response.json();',
            'if (jsonData && jsonData.recurrence && jsonData.recurrence.id) {',
            '    pm.environment.set("recurrence_id", jsonData.recurrence.id);',
            '}',
          ]
        ),
        makeRequest('List Task Recurrences', 'GET', ['api', 'tasks', 'recurrences'], null, [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ], [{ key: 'page', value: '1' }, { key: 'limit', value: '10' }]),
        makeRequest(
          'Get Task Recurrence by Recurrence ID',
          'GET',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Get Task Recurrence by Task ID',
          'GET',
          ['api', 'tasks', '{{task_id}}', 'recurrence'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Update Task Recurrence',
          'PUT',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}'],
          {
            frequency: 'weekly',
            weekdays: ['monday', 'friday'],
            intervalValue: 2,
          },
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Pause Task Recurrence',
          'PATCH',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}', 'pause'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Resume Task Recurrence',
          'PATCH',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}', 'resume'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Generate Task Occurrence',
          'POST',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}', 'generate'],
          null,
          [
            'pm.test("Status code is 201 Created", function () {',
            '    pm.response.to.have.status(201);',
            '});',
          ]
        ),
        makeRequest(
          'Get Recurrence History',
          'GET',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}', 'history'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Delete Task Recurrence',
          'DELETE',
          ['api', 'tasks', 'recurrences', '{{recurrence_id}}'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
      ],
    };
    tasksFolder.item.push(recurringTasksFolder);
  }

  // 2. Profile -> Attachments
  const profileFolder = collection.item.find((i: any) => i.name === 'Profile');
  if (profileFolder) {
    profileFolder.item = profileFolder.item.filter((sub: any) => sub.name !== 'Attachments');

    const attachmentsFolder = {
      name: 'Attachments',
      item: [
        makeRequest(
          'Upload Profile Attachment',
          'POST',
          ['api', 'profile', 'attachment'],
          {
            entityType: 'profile',
            entityId: '{{user_id}}',
            fileName: 'avatar.png',
            mimeType: 'image/png',
            fileData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          },
          [
            'pm.test("Status code is 201 Created", function () {',
            '    pm.response.to.have.status(201);',
            '});',
            'var jsonData = pm.response.json();',
            'if (jsonData && jsonData.attachment && jsonData.attachment.id) {',
            '    pm.environment.set("attachment_id", jsonData.attachment.id);',
            '}',
          ]
        ),
        makeRequest(
          'Get Profile Attachments',
          'GET',
          ['api', 'profile', 'attachments'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Upload Generic Entity Attachment',
          'POST',
          ['api', 'attachments'],
          {
            entityType: 'task',
            entityId: '{{task_id}}',
            fileName: 'task-doc.pdf',
            mimeType: 'application/pdf',
            fileData: 'JVBERi0xLjQKJcTl8uXrCg==',
          },
          [
            'pm.test("Status code is 201 Created", function () {',
            '    pm.response.to.have.status(201);',
            '});',
          ]
        ),
        makeRequest(
          'List Attachments',
          'GET',
          ['api', 'attachments'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ],
          [{ key: 'page', value: '1' }, { key: 'limit', value: '10' }]
        ),
        makeRequest(
          'Get Attachments by Entity',
          'GET',
          ['api', 'attachments', 'entity', 'task', '{{task_id}}'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Get Attachment Metadata',
          'GET',
          ['api', 'attachments', '{{attachment_id}}'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Download Attachment File',
          'GET',
          ['api', 'attachments', '{{attachment_id}}', 'download'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Delete Attachment',
          'DELETE',
          ['api', 'attachments', '{{attachment_id}}'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
      ],
    };
    profileFolder.item.push(attachmentsFolder);
  }

  // 3. Top-level Notifications Folder
  collection.item = collection.item.filter((i: any) => i.name !== 'Notifications');
  const notificationsFolder = {
    name: 'Notifications',
    item: [
      makeRequest(
        'Create Notification',
        'POST',
        ['api', 'notifications'],
        {
          title: 'Daily Review Reminder',
          message: 'It is time to reflect on your day and complete your review.',
          notificationType: 'review_reminder',
          referenceType: 'review',
          referenceId: null,
        },
        [
          'pm.test("Status code is 201 Created", function () {',
          '    pm.response.to.have.status(201);',
          '});',
          'var jsonData = pm.response.json();',
          'if (jsonData && jsonData.notification && jsonData.notification.id) {',
          '    pm.environment.set("notification_id", jsonData.notification.id);',
          '}',
        ]
      ),
      makeRequest(
        'List Notifications',
        'GET',
        ['api', 'notifications'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ],
        [{ key: 'page', value: '1' }, { key: 'limit', value: '10' }]
      ),
      makeRequest(
        'Get Unread Notifications Count',
        'GET',
        ['api', 'notifications', 'unread-count'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Get Notification by ID',
        'GET',
        ['api', 'notifications', '{{notification_id}}'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Mark Notification as Read',
        'PATCH',
        ['api', 'notifications', '{{notification_id}}', 'read'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Mark All Notifications as Read',
        'POST',
        ['api', 'notifications', 'mark-all-read'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Generate Reminders (Habits, Tasks, Payments)',
        'POST',
        ['api', 'notifications', 'reminders', 'generate'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Get Notification Preferences',
        'GET',
        ['api', 'notifications', 'preferences'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Update Notification Preferences',
        'PUT',
        ['api', 'notifications', 'preferences'],
        {
          inAppEnabled: true,
          pushEnabled: true,
          emailEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          reminderPreferences: {
            habits: true,
            tasks: true,
            recurring_payments: true,
            reviews: true,
          },
        },
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Delete Read Notifications',
        'DELETE',
        ['api', 'notifications', 'read'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
      makeRequest(
        'Delete Notification by ID',
        'DELETE',
        ['api', 'notifications', '{{notification_id}}'],
        null,
        [
          'pm.test("Status code is 200 OK", function () {',
          '    pm.response.to.have.status(200);',
          '});',
        ]
      ),
    ],
  };
  collection.item.push(notificationsFolder);

  // 4. Settings -> Notification Preferences
  const settingsFolder = collection.item.find((i: any) => i.name === 'Settings');
  if (settingsFolder) {
    settingsFolder.item = settingsFolder.item.filter((sub: any) => sub.name !== 'Notification Preferences');

    const notifPrefsSettings = {
      name: 'Notification Preferences',
      item: [
        makeRequest(
          'Get Notification Preferences (Settings)',
          'GET',
          ['api', 'settings', 'notifications'],
          null,
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
        makeRequest(
          'Update Notification Preferences (Settings)',
          'PUT',
          ['api', 'settings', 'notifications'],
          {
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: false,
            quietHoursStart: '23:00',
            quietHoursEnd: '06:30',
          },
          [
            'pm.test("Status code is 200 OK", function () {',
            '    pm.response.to.have.status(200);',
            '});',
          ]
        ),
      ],
    };
    settingsFolder.item.push(notifPrefsSettings);
  }

  // 5. Top-level Synchronization Folder -> Devices and Sync State
  collection.item = collection.item.filter((i: any) => i.name !== 'Synchronization');
  const syncFolder = {
    name: 'Synchronization',
    item: [
      {
        name: 'Devices and Sync State',
        item: [
          makeRequest(
            'Register Device',
            'POST',
            ['api', 'sync', 'devices'],
            {
              deviceName: 'Ayush Macbook Pro',
              platform: 'macos',
              registrationInfo: {
                browser: 'Chrome 130',
                clientVersion: '1.0.0',
              },
            },
            [
              'pm.test("Status code is 201 Created", function () {',
              '    pm.response.to.have.status(201);',
              '});',
              'var jsonData = pm.response.json();',
              'if (jsonData && jsonData.device && jsonData.device.id) {',
              '    pm.environment.set("device_id", jsonData.device.id);',
              '}',
            ]
          ),
          makeRequest(
            'List Registered Devices',
            'GET',
            ['api', 'sync', 'devices'],
            null,
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ]
          ),
          makeRequest(
            'Get Device Details',
            'GET',
            ['api', 'sync', 'devices', '{{device_id}}'],
            null,
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ]
          ),
          makeRequest(
            'Get Sync Status',
            'GET',
            ['api', 'sync', 'status'],
            null,
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ],
            [{ key: 'deviceId', value: '{{device_id}}' }]
          ),
          makeRequest(
            'Pull Incremental Sync',
            'POST',
            ['api', 'sync', 'pull'],
            {
              deviceId: '{{device_id}}',
              lastServerVersion: 0,
            },
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ]
          ),
          makeRequest(
            'Push Offline Changes',
            'POST',
            ['api', 'sync', 'push'],
            {
              deviceId: '{{device_id}}',
              changes: [
                {
                  entityType: 'tasks',
                  action: 'create',
                  clientId: 'offline-task-001',
                  clientUpdatedAt: '2026-10-22T10:00:00.000Z',
                  data: {
                    title: 'Synchronized Offline Task',
                    priority: 'high',
                    status: 'planned',
                    scheduledDate: '{{today}}',
                  },
                },
              ],
            },
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ]
          ),
          makeRequest(
            'Unregister Device',
            'DELETE',
            ['api', 'sync', 'devices', '{{device_id}}'],
            null,
            [
              'pm.test("Status code is 200 OK", function () {',
              '    pm.response.to.have.status(200);',
              '});',
            ]
          ),
        ],
      },
    ],
  };
  collection.item.push(syncFolder);

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log('Postman collection successfully updated.');

  // Validate and sync across documentation/ and docs/
  validateAndSyncPostman();
};

if (require.main === module) {
  updatePostmanCollection();
}
