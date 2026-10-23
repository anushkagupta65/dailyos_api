import fs from 'node:fs';
import path from 'node:path';

/**
 * Standardize Postman Collection & Environment for LifeTracker.
 * - Flattens feature folders (removes nested subfolders)
 * - Organizes into clean feature folders:
 *   Authentication, Profile, Commitments, Expenses, Investments, Income, Dashboard,
 *   Analytics, Settings, Tasks, Priorities, Intentions, Notes, Learning, Reviews,
 *   Notifications, Synchronization, Data Management, Health.
 * - Adds any missing backend API endpoints for complete coverage.
 * - Eliminates duplicate endpoints.
 * - Standardizes all response examples to the new 8-field envelope:
 *   success, message, data, pagination, path, api_timestamp, requestedTime, updated_at
 * - Standardizes error examples (success: false, data: null, pagination: null)
 * - Updates collection-level and request-level test scripts to capture tokens & IDs from data.*
 * - Syncs documentation/ and docs/ directories.
 */

const COLLECTION_FILE = 'LifeTracker.postman_collection.json';
const ENVIRONMENT_FILE = 'LifeTracker_Environment.postman_environment.json';

const targetDirs = [
  path.join(__dirname, '../documentation'),
  path.join(__dirname, '../docs'),
];

export const runStandardization = () => {
  const primaryDocDir = path.join(__dirname, '../documentation');
  const collectionPath = path.join(primaryDocDir, COLLECTION_FILE);
  const environmentPath = path.join(primaryDocDir, ENVIRONMENT_FILE);

  const existingColl = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  const existingEnv = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

  // 1. Flatten all requests from existing collection
  const allExistingRequests: any[] = [];
  function extractRequests(items: any[]) {
    for (const item of items) {
      if (item.item) {
        extractRequests(item.item);
      } else {
        allExistingRequests.push(item);
      }
    }
  }
  extractRequests(existingColl.item);

  console.log(`Extracted ${allExistingRequests.length} requests from existing collection.`);

  // 2. Define target feature folders and endpoint mapping
  // Map helper to normalize method and path
  const reqKey = (method: string, rawUrl: string) => {
    const cleanUrl = rawUrl.replace('{{base_url}}', '').split('?')[0].replace(/\/$/, '') || '/';
    return `${method.toUpperCase()} ${cleanUrl}`;
  };

  const existingMap = new Map<string, any>();
  for (const req of allExistingRequests) {
    const rawUrl = typeof req.request.url === 'string' ? req.request.url : req.request.url.raw || '';
    const key = reqKey(req.request.method, rawUrl);
    // Prefer the first one or one with existing examples
    if (!existingMap.has(key) || (req.response && req.response.length > 0 && (!existingMap.get(key).response || existingMap.get(key).response.length === 0))) {
      existingMap.set(key, req);
    }
  }

  // Helper to format Postman URL object
  const makeUrl = (rawUrl: string) => {
    const [pathPart, queryPart] = rawUrl.split('?');
    const segments = pathPart.replace('{{base_url}}/', '').split('/').filter(Boolean);
    const query = queryPart
      ? queryPart.split('&').map((kv) => {
          const [k, v] = kv.split('=');
          return { key: k, value: v || '' };
        })
      : undefined;

    return {
      raw: rawUrl,
      host: ['{{base_url}}'],
      path: segments,
      query,
    };
  };

  // Helper to construct standard success and error response examples
  const makeStandardResponse = (
    reqName: string,
    reqObj: any,
    statusCode: number,
    statusText: string,
    message: string,
    dataPayload: any,
    paginationPayload: any = null,
    isError = false,
    errors: any[] = []
  ) => {
    const rawUrl = typeof reqObj.url === 'string' ? reqObj.url : reqObj.url.raw || '';
    const cleanPath = rawUrl.replace('{{base_url}}', '').split('?')[0] || '/';

    const envelope: any = {
      success: !isError,
      message,
      data: isError ? null : dataPayload,
      pagination: paginationPayload,
      path: cleanPath,
      api_timestamp: '2026-10-23T10:00:00.000Z',
      requestedTime: '2026-10-23T09:59:59.995Z',
      updated_at: !isError && dataPayload && (dataPayload.updated_at || dataPayload.updatedAt) ? '2026-10-23T10:00:00.000Z' : null,
    };

    if (isError && errors.length > 0) {
      envelope.errors = errors;
    }

    return {
      name: `${statusCode} ${statusText} (${isError ? 'Error' : 'Success'})`,
      originalRequest: {
        method: reqObj.method,
        header: reqObj.header,
        body: reqObj.body,
        url: reqObj.url,
      },
      status: statusText,
      code: statusCode,
      _postman_previewlanguage: 'json',
      header: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
      cookie: [],
      body: JSON.stringify(envelope, null, 2),
    };
  };

  // Helper to build/enrich a request item
  const buildRequestItem = (
    name: string,
    method: string,
    rawUrl: string,
    description: string,
    body: any = null,
    defaultData: any = {},
    isPaginated = false,
    customTests: string[] = []
  ) => {
    const key = reqKey(method, rawUrl);
    const existing = existingMap.get(key);

    const postmanUrl = makeUrl(rawUrl);

    // Build headers
    const headers = [
      {
        key: 'Content-Type',
        value: 'application/json',
        type: 'text',
      },
    ];

    const reqBody = body
      ? {
          mode: 'raw',
          raw: JSON.stringify(body, null, 2),
          options: {
            raw: {
              language: 'json',
            },
          },
        }
      : existing?.request?.body || undefined;

    const requestDef: any = {
      method,
      header: headers,
      body: reqBody,
      url: postmanUrl,
      description: description || existing?.request?.description || '',
    };

    // Public auth endpoints don't need bearer token
    const isPublic = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/google',
      '/api/auth/verify-email',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/refresh-token',
      '/api/health',
    ].some((p) => rawUrl.includes(p));

    if (isPublic) {
      requestDef.auth = {
        type: 'noauth',
      };
    }

    // Default test script
    const expectedStatus = method === 'POST' ? 201 : 200;
    const testLines: string[] = [
      `var json = pm.response.json();`,
      `pm.test("Response envelope structure is valid", function () {`,
      `    pm.expect(json).to.be.an("object");`,
      `    pm.expect(json).to.have.property("success");`,
      `    pm.expect(json).to.have.property("message");`,
      `    pm.expect(json).to.have.property("path");`,
      `    pm.expect(json).to.have.property("api_timestamp");`,
      `    pm.expect(json).to.have.property("requestedTime");`,
      `});`,
      `if (pm.response.code >= 200 && pm.response.code < 300) {`,
      `    pm.test("Status code is ${expectedStatus}", function () {`,
      `        pm.expect(pm.response.code).to.be.oneOf([${expectedStatus === 201 ? '200, 201' : '200, 204'}]);`,
      `    });`,
      `    pm.test("Successful operation contract", function () {`,
      `        pm.expect(json.success).to.be.true;`,
      `    });`,
      `}`,
    ];

    if (customTests.length > 0) {
      testLines.push(...customTests);
    }

    const event = [
      {
        listen: 'test',
        script: {
          exec: testLines,
          type: 'text/javascript',
        },
      },
    ];

    // Standard responses (Success + Error + Pagination if applicable)
    const successStatus = expectedStatus;
    const successText = successStatus === 201 ? 'Created' : 'OK';
    const paginationMetadata = isPaginated
      ? {
          totalItems: 42,
          totalPages: 5,
          currentPage: 1,
          pageSize: 10,
        }
      : null;

    const successExample = makeStandardResponse(
      name,
      requestDef,
      successStatus,
      successText,
      `${name} executed successfully.`,
      defaultData,
      paginationMetadata,
      false
    );

    const errorExample = makeStandardResponse(
      name,
      requestDef,
      400,
      'Bad Request',
      'Validation failed or invalid parameters provided.',
      null,
      null,
      true,
      [{ field: 'parameter', message: 'Invalid or missing field value' }]
    );

    const responses = [successExample, errorExample];

    return {
      name,
      event,
      request: requestDef,
      response: responses,
    };
  };

  // 3. Define the Flat Feature Folders
  const folders: Array<{ name: string; description: string; items: any[] }> = [
    // 1. Authentication
    {
      name: 'Authentication',
      description: 'Authentication and authorization APIs: registration, login, token refresh, sessions, password reset.',
      items: [
        buildRequestItem(
          'Register User',
          'POST',
          '{{base_url}}/api/auth/register',
          'Registers a new user account with email, password, and personal details.',
          { email: 'alex.smith@example.com', password: 'SecurePassword123!', firstName: 'Alex', lastName: 'Smith' },
          { user: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', email: 'alex.smith@example.com', status: 'active', onboardingCompleted: false, createdAt: '2026-10-23T10:00:00.000Z' } },
          false,
          [
            'if (json.data && json.data.user && json.data.user.id) {',
            '    pm.environment.set("user_id", json.data.user.id);',
            '}',
          ]
        ),
        buildRequestItem(
          'Login User',
          'POST',
          '{{base_url}}/api/auth/login',
          'Authenticates a user with email and password, returning JWT access & refresh tokens.',
          { email: 'alex.smith@example.com', password: 'SecurePassword123!' },
          {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', email: 'alex.smith@example.com', firstName: 'Alex', lastName: 'Smith' },
          },
          false,
          [
            'if (json.data && json.data.accessToken) {',
            '    pm.environment.set("access_token", json.data.accessToken);',
            '    pm.environment.set("accessToken", json.data.accessToken);',
            '}',
            'if (json.data && json.data.refreshToken) {',
            '    pm.environment.set("refresh_token", json.data.refreshToken);',
            '    pm.environment.set("refreshToken", json.data.refreshToken);',
            '}',
            'if (json.data && json.data.user && json.data.user.id) {',
            '    pm.environment.set("user_id", json.data.user.id);',
            '}',
          ]
        ),
        buildRequestItem(
          'Google Sign-In',
          'POST',
          '{{base_url}}/api/auth/google',
          'Authenticates or registers a user via Google ID Token (OAuth).',
          { idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...' },
          {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', email: 'alex.google@example.com' },
          }
        ),
        buildRequestItem(
          'Get Current User',
          'GET',
          '{{base_url}}/api/auth/me',
          'Retrieves details for the currently authenticated user session.',
          null,
          { user: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', email: 'alex.smith@example.com', firstName: 'Alex', lastName: 'Smith' } }
        ),
        buildRequestItem(
          'Verify Email',
          'POST',
          '{{base_url}}/api/auth/verify-email',
          'Verifies email address using the token sent upon registration.',
          { token: '82203729a5d328c54ee6821ffbd60a05f5af41e103624653c2fbee396877af20' },
          { verified: true }
        ),
        buildRequestItem(
          'Forgot Password',
          'POST',
          '{{base_url}}/api/auth/forgot-password',
          'Requests a password reset link/token to be sent to user email.',
          { email: 'alex.smith@example.com' },
          { sent: true }
        ),
        buildRequestItem(
          'Reset Password',
          'POST',
          '{{base_url}}/api/auth/reset-password',
          'Resets the account password using the reset token received via email.',
          { token: '78cf8df08978499ba2002ed3e5cf2cf8a9b69b55733de59f6d77def19271796e', newPassword: 'NewSecurePassword123!' },
          { reset: true }
        ),
        buildRequestItem(
          'Update Password',
          'POST',
          '{{base_url}}/api/auth/update-password',
          'Allows an authenticated user to update their current password.',
          { currentPassword: 'SecurePassword123!', newPassword: 'BrandNewPassword456!' },
          { updated: true }
        ),
        buildRequestItem(
          'Refresh Token',
          'POST',
          '{{base_url}}/api/auth/refresh-token',
          'Refreshes an expired access token using the active refresh token.',
          { refreshToken: '{{refresh_token}}' },
          { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...', refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...' },
          false,
          [
            'if (json.data && json.data.accessToken) {',
            '    pm.environment.set("access_token", json.data.accessToken);',
            '    pm.environment.set("accessToken", json.data.accessToken);',
            '}',
          ]
        ),
        buildRequestItem(
          'Logout',
          'POST',
          '{{base_url}}/api/auth/logout',
          'Logs out of the current active session and revokes the refresh token.',
          { refreshToken: '{{refresh_token}}' },
          {}
        ),
        buildRequestItem(
          'Logout All Devices',
          'POST',
          '{{base_url}}/api/auth/logout-all',
          'Revokes all active sessions for the current user across all devices.',
          null,
          { revokedCount: 3 }
        ),
        buildRequestItem(
          'Get Active Sessions',
          'GET',
          '{{base_url}}/api/auth/sessions',
          'Lists all currently active login sessions for the authenticated user.',
          null,
          {
            sessions: [
              { id: '407d59b2-3fc4-477d-bb6f-8551a37c05b8', ipAddress: '127.0.0.1', userAgent: 'PostmanRuntime/7.39.0', createdAt: '2026-10-23T10:00:00.000Z' },
            ],
          }
        ),
        buildRequestItem(
          'Revoke Session',
          'DELETE',
          '{{base_url}}/api/auth/sessions/{{session_id}}',
          'Revokes a specific active session by ID.',
          null,
          { revoked: true }
        ),
      ],
    },

    // 2. Profile
    {
      name: 'Profile',
      description: 'User profile management: personal details, health profile, body measurements, professional, lifestyle, goals, and attachments.',
      items: [
        buildRequestItem(
          'Get Complete Profile',
          'GET',
          '{{base_url}}/api/profiles/complete',
          'Returns user personal, health, professional, lifestyle, and goals profiles in a single aggregated payload.',
          null,
          {
            profile: { first_name: 'Alex', last_name: 'Smith', country: 'India', date_of_birth: '1995-05-15' },
            health: { blood_group: 'O+', height_value: 178, height_unit: 'cm', water_target_ml: 3000 },
            professional: { occupation: 'Software Engineer', industry: 'Technology', years_experience: 5 },
            lifestyle: { sleep_target_hours: 8, stress_level: 'moderate', diet_type: 'omnivore' },
            goals: [{ id: '9a8b7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4', title: 'Run a Half Marathon', category: 'fitness' }],
          }
        ),
        buildRequestItem(
          'Get Personal Profile',
          'GET',
          '{{base_url}}/api/profiles/personal',
          'Retrieves personal bio and contact profile details.',
          null,
          { profile: { first_name: 'Alex', last_name: 'Smith', country: 'India', date_of_birth: '1995-05-15', gender: 'male', phone_number: '+919876543210' } }
        ),
        buildRequestItem(
          'Update Personal Profile',
          'PUT',
          '{{base_url}}/api/profiles/personal',
          'Updates personal details including name, phone number, and location.',
          { firstName: 'Alex', lastName: 'Smith', country: 'India', timezone: 'Asia/Kolkata', bio: 'Productivity enthusiast' },
          { profile: { first_name: 'Alex', last_name: 'Smith', country: 'India', timezone: 'Asia/Kolkata', bio: 'Productivity enthusiast', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Update Profile Photo',
          'POST',
          '{{base_url}}/api/profiles/personal/photo',
          'Updates profile avatar photo via URL.',
          { profilePhotoUrl: 'https://images.example.com/avatars/alex.png' },
          { profilePhotoUrl: 'https://images.example.com/avatars/alex.png' }
        ),
        buildRequestItem(
          'Get Health Profile',
          'GET',
          '{{base_url}}/api/profiles/health',
          'Retrieves user health metrics and hydration targets.',
          null,
          { health: { blood_group: 'O+', height_value: 178, height_unit: 'cm', water_target_ml: 3000 } }
        ),
        buildRequestItem(
          'Update Health Profile',
          'PUT',
          '{{base_url}}/api/profiles/health',
          'Updates health metrics, height, and daily water intake goal.',
          { bloodGroup: 'O+', heightValue: 178, heightUnit: 'cm', waterTargetMl: 3000 },
          { health: { blood_group: 'O+', height_value: 178, height_unit: 'cm', water_target_ml: 3000, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Health Profile',
          'DELETE',
          '{{base_url}}/api/profiles/health',
          'Clears health profile records.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Add Body Measurement',
          'POST',
          '{{base_url}}/api/profiles/measurements',
          'Logs a weight or body measurement record.',
          { recordedDate: '2026-10-23', weightValue: 72.5, weightUnit: 'kg', bodyFatPercentage: 16.2 },
          { measurement: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', recorded_date: '2026-10-23', weight_value: 72.5, bmi: 22.88 } },
          false,
          ['if (json.data && json.data.measurement) pm.environment.set("measurement_id", json.data.measurement.id);']
        ),
        buildRequestItem(
          'Get Body Measurements History',
          'GET',
          '{{base_url}}/api/profiles/measurements?page=1&limit=10',
          'Lists body measurement history with pagination.',
          null,
          { measurements: [{ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', recorded_date: '2026-10-23', weight_value: 72.5, bmi: 22.88 }] },
          true
        ),
        buildRequestItem(
          'Update Body Measurement',
          'PUT',
          '{{base_url}}/api/profiles/measurements/{{measurement_id}}',
          'Updates an existing measurement record.',
          { weightValue: 72.0 },
          { measurement: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', weight_value: 72.0, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Body Measurement',
          'DELETE',
          '{{base_url}}/api/profiles/measurements/{{measurement_id}}',
          'Deletes a specific body measurement entry.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Get Professional Profile',
          'GET',
          '{{base_url}}/api/profiles/professional',
          'Retrieves occupation, company, and industry background.',
          null,
          { professional: { occupation: 'Software Engineer', industry: 'Technology', years_experience: 5 } }
        ),
        buildRequestItem(
          'Update Professional Profile',
          'PUT',
          '{{base_url}}/api/profiles/professional',
          'Updates professional background details.',
          { occupation: 'Lead Engineer', industry: 'Technology', yearsExperience: 6 },
          { professional: { occupation: 'Lead Engineer', industry: 'Technology', years_experience: 6, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Get Lifestyle Profile',
          'GET',
          '{{base_url}}/api/profiles/lifestyle',
          'Retrieves sleep goals, stress levels, and dietary habits.',
          null,
          { lifestyle: { sleep_target_hours: 8, stress_level: 'moderate', diet_type: 'omnivore' } }
        ),
        buildRequestItem(
          'Update Lifestyle Profile',
          'PUT',
          '{{base_url}}/api/profiles/lifestyle',
          'Updates lifestyle preferences.',
          { sleepTargetHours: 8.5, stressLevel: 'low' },
          { lifestyle: { sleep_target_hours: 8.5, stress_level: 'low', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Create Personal Goal',
          'POST',
          '{{base_url}}/api/profiles/goals',
          'Creates a high-level personal development goal.',
          { title: 'Read 24 Books', category: 'personal', targetDate: '2026-12-31', priority: 'high' },
          { goal: { id: '407d59b2-3fc4-477d-bb6f-8551a37c05b8', title: 'Read 24 Books', category: 'personal', status: 'active' } },
          false,
          ['if (json.data && json.data.goal) pm.environment.set("goal_id", json.data.goal.id);']
        ),
        buildRequestItem(
          'Get All Goals',
          'GET',
          '{{base_url}}/api/profiles/goals?page=1&limit=10',
          'Lists personal goals with pagination.',
          null,
          { goals: [{ id: '407d59b2-3fc4-477d-bb6f-8551a37c05b8', title: 'Read 24 Books', category: 'personal', status: 'active' }] },
          true
        ),
        buildRequestItem(
          'Get Personal Goal by ID',
          'GET',
          '{{base_url}}/api/profiles/goals/{{goal_id}}',
          'Retrieves details for a specific personal goal.',
          null,
          { goal: { id: '407d59b2-3fc4-477d-bb6f-8551a37c05b8', title: 'Read 24 Books', category: 'personal', status: 'active' } }
        ),
        buildRequestItem(
          'Update Personal Goal',
          'PUT',
          '{{base_url}}/api/profiles/goals/{{goal_id}}',
          'Updates personal goal details.',
          { progressPercentage: 50 },
          { goal: { id: '407d59b2-3fc4-477d-bb6f-8551a37c05b8', progress_percentage: 50, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Personal Goal',
          'DELETE',
          '{{base_url}}/api/profiles/goals/{{goal_id}}',
          'Removes a personal goal.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Upload Attachment',
          'POST',
          '{{base_url}}/api/attachments',
          'Uploads a file attachment linked to an entity (profile, task, note, etc.).',
          { entityType: 'profile', entityId: '{{user_id}}', fileName: 'medical_report.pdf', fileUrl: 'https://storage.example.com/files/1.pdf', fileSize: 1048576, mimeType: 'application/pdf' },
          { attachment: { id: '5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', file_name: 'medical_report.pdf', file_size: 1048576 } },
          false,
          ['if (json.data && json.data.attachment) pm.environment.set("attachment_id", json.data.attachment.id);']
        ),
        buildRequestItem(
          'List Attachments',
          'GET',
          '{{base_url}}/api/attachments?page=1&limit=10',
          'Lists uploaded attachments with pagination.',
          null,
          { attachments: [{ id: '5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', file_name: 'medical_report.pdf', file_size: 1048576 }] },
          true
        ),
        buildRequestItem(
          'Get Attachment Details',
          'GET',
          '{{base_url}}/api/attachments/{{attachment_id}}',
          'Retrieves metadata for a specific attachment.',
          null,
          { attachment: { id: '5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', file_name: 'medical_report.pdf', file_size: 1048576 } }
        ),
        buildRequestItem(
          'Download Attachment',
          'GET',
          '{{base_url}}/api/attachments/{{attachment_id}}/download',
          'Generates a secure download URL or stream for the attachment.',
          null,
          { downloadUrl: 'https://storage.example.com/download/file.pdf' }
        ),
        buildRequestItem(
          'Get Entity Attachments',
          'GET',
          '{{base_url}}/api/attachments/entity/profile/{{user_id}}',
          'Lists all attachments linked to a particular entity.',
          null,
          { attachments: [{ id: '5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', file_name: 'medical_report.pdf' }] }
        ),
        buildRequestItem(
          'Delete Attachment',
          'DELETE',
          '{{base_url}}/api/attachments/{{attachment_id}}',
          'Deletes an attachment file and metadata.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 3. Commitments
    {
      name: 'Commitments',
      description: 'Habit tracking: categories, habit definitions, flexible schedules, daily completion logs, flexibility rules, reminders, and streaks.',
      items: [
        buildRequestItem(
          'List Habit Categories',
          'GET',
          '{{base_url}}/api/habits/categories',
          'Lists system default categories and user custom categories.',
          null,
          { categories: [{ id: '11111111-2222-3333-4444-555555555555', name: 'Fitness', is_system: true }] },
          false,
          ['if (json.data && json.data.categories && json.data.categories[0]) pm.environment.set("category_id", json.data.categories[0].id);']
        ),
        buildRequestItem(
          'Create Custom Category',
          'POST',
          '{{base_url}}/api/habits/categories',
          'Creates a custom habit category.',
          { name: 'Creative Writing', icon: 'pen', color: '#6366f1' },
          { category: { id: '22222222-3333-4444-5555-666666666666', name: 'Creative Writing', is_system: false } },
          false,
          ['if (json.data && json.data.category) pm.environment.set("category_id", json.data.category.id);']
        ),
        buildRequestItem(
          'Update Custom Category',
          'PUT',
          '{{base_url}}/api/habits/categories/{{category_id}}',
          'Updates a user custom category.',
          { name: 'Fiction Writing', color: '#4f46e5' },
          { category: { id: '22222222-3333-4444-5555-666666666666', name: 'Fiction Writing', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Custom Category',
          'DELETE',
          '{{base_url}}/api/habits/categories/{{category_id}}',
          'Deletes a user custom category, reassigning habits to null category.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Habit',
          'POST',
          '{{base_url}}/api/habits',
          'Creates a new habit with tracking type (boolean, count, duration), category, and target.',
          { name: 'Morning Run', categoryId: '{{category_id}}', trackingType: 'duration', targetValue: 30, targetUnit: 'minutes', preferredTime: '06:30' },
          { habit: { id: '33333333-4444-5555-6666-777777777777', name: 'Morning Run', status: 'active', tracking_type: 'duration', target_value: 30 } },
          false,
          ['if (json.data && json.data.habit) pm.environment.set("habit_id", json.data.habit.id);']
        ),
        buildRequestItem(
          'List Habits',
          'GET',
          '{{base_url}}/api/habits?page=1&limit=10',
          'Lists habits for the current user with pagination and optional filters.',
          null,
          { habits: [{ id: '33333333-4444-5555-6666-777777777777', name: 'Morning Run', status: 'active', tracking_type: 'duration', target_value: 30 }] },
          true
        ),
        buildRequestItem(
          'Get Habit by ID',
          'GET',
          '{{base_url}}/api/habits/{{habit_id}}',
          'Retrieves detailed information for a habit including active schedule, flexibility, and reminders.',
          null,
          { habit: { id: '33333333-4444-5555-6666-777777777777', name: 'Morning Run', status: 'active', schedules: [], reminders: [] } }
        ),
        buildRequestItem(
          'Update Habit',
          'PUT',
          '{{base_url}}/api/habits/{{habit_id}}',
          'Updates habit configuration and targets.',
          { name: 'Morning Jog', targetValue: 40 },
          { habit: { id: '33333333-4444-5555-6666-777777777777', name: 'Morning Jog', target_value: 40, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Update Habit Status',
          'PATCH',
          '{{base_url}}/api/habits/{{habit_id}}/status',
          'Updates status (active, paused, archived).',
          { status: 'paused' },
          { habit: { id: '33333333-4444-5555-6666-777777777777', status: 'paused', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Habit',
          'DELETE',
          '{{base_url}}/api/habits/{{habit_id}}',
          'Deletes a habit and its associated schedules, logs, and reminders.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Schedule',
          'POST',
          '{{base_url}}/api/habits/{{habit_id}}/schedules',
          'Sets or updates the repetition schedule (daily, weekdays, interval).',
          { scheduleType: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'] },
          { schedule: { id: '44444444-5555-6666-7777-888888888888', schedule_type: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'] } },
          false,
          ['if (json.data && json.data.schedule) pm.environment.set("schedule_id", json.data.schedule.id);']
        ),
        buildRequestItem(
          'List Schedules',
          'GET',
          '{{base_url}}/api/habits/{{habit_id}}/schedules',
          'Lists schedule history for a habit.',
          null,
          { schedules: [{ id: '44444444-5555-6666-7777-888888888888', schedule_type: 'selected_days', weekdays: ['monday', 'wednesday', 'friday'] }] }
        ),
        buildRequestItem(
          'Update Schedule',
          'PUT',
          '{{base_url}}/api/habits/{{habit_id}}/schedules/{{schedule_id}}',
          'Modifies an existing schedule.',
          { weekdays: ['monday', 'tuesday', 'thursday'] },
          { schedule: { id: '44444444-5555-6666-7777-888888888888', weekdays: ['monday', 'tuesday', 'thursday'], updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Schedule',
          'DELETE',
          '{{base_url}}/api/habits/{{habit_id}}/schedules/{{schedule_id}}',
          'Deletes a schedule entry.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Habit Log',
          'POST',
          '{{base_url}}/api/habits/{{habit_id}}/logs',
          'Records a daily completion or skip for a habit.',
          { logDate: '{{today}}', status: 'completed', actualValue: 35, notes: 'Great run today' },
          { log: { id: '55555555-6666-7777-8888-999999999999', log_date: '2026-10-23', status: 'completed', actual_value: 35 } },
          false,
          ['if (json.data && json.data.log) pm.environment.set("habit_log_id", json.data.log.id);']
        ),
        buildRequestItem(
          'List Habit Logs for Habit',
          'GET',
          '{{base_url}}/api/habits/{{habit_id}}/logs?page=1&limit=10',
          'Lists logs for a specific habit with pagination and date filters.',
          null,
          { logs: [{ id: '55555555-6666-7777-8888-999999999999', log_date: '2026-10-23', status: 'completed' }] },
          true
        ),
        buildRequestItem(
          'List All Habit Logs',
          'GET',
          '{{base_url}}/api/habits/logs?startDate={{today}}&endDate={{today}}',
          'Lists all logs across habits for a date range.',
          null,
          { logs: [{ id: '55555555-6666-7777-8888-999999999999', habit_id: '33333333-4444-5555-6666-777777777777', status: 'completed' }] }
        ),
        buildRequestItem(
          'Update Habit Log',
          'PUT',
          '{{base_url}}/api/habits/{{habit_id}}/logs/{{habit_log_id}}',
          'Updates an existing log entry.',
          { actualValue: 40, status: 'completed' },
          { log: { id: '55555555-6666-7777-8888-999999999999', actual_value: 40, status: 'completed', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Habit Log',
          'DELETE',
          '{{base_url}}/api/habits/{{habit_id}}/logs/{{habit_log_id}}',
          'Deletes a specific habit log entry.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Get Progress',
          'GET',
          '{{base_url}}/api/habits/progress?period=week',
          'Calculates completion rate, streaks, and adherence across active habits.',
          null,
          {
            progress: {
              summary: { expected: 7, completed: 5, skipped: 1, missed: 1, completionRate: 71.4 },
              habits: [{ habitId: '33333333-4444-5555-6666-777777777777', name: 'Morning Run', currentStreak: 5 }],
            },
          }
        ),
        buildRequestItem(
          'Get Flexibility Settings',
          'GET',
          '{{base_url}}/api/habits/{{habit_id}}/flexibility',
          'Retrieves minimum version and recovery rules for a habit.',
          null,
          { flexibility: { minimum_version: '10 min walk', ideal_version: '45 min run', never_miss_twice: true } }
        ),
        buildRequestItem(
          'Create Flexibility Settings',
          'POST',
          '{{base_url}}/api/habits/{{habit_id}}/flexibility',
          'Configures elasticity and non-negotiables for a habit.',
          { minimumVersion: '10 min walk', idealVersion: '45 min run', neverMissTwice: true },
          { flexibility: { minimum_version: '10 min walk', ideal_version: '45 min run', never_miss_twice: true } }
        ),
        buildRequestItem(
          'Update Flexibility Settings',
          'PUT',
          '{{base_url}}/api/habits/{{habit_id}}/flexibility',
          'Updates habit flexibility rules.',
          { minimumVersion: '15 min walk' },
          { flexibility: { minimum_version: '15 min walk', ideal_version: '45 min run', never_miss_twice: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Flexibility Settings',
          'DELETE',
          '{{base_url}}/api/habits/{{habit_id}}/flexibility',
          'Removes flexibility rules for a habit.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'List Reminders',
          'GET',
          '{{base_url}}/api/habits/{{habit_id}}/reminders',
          'Lists configured notifications and reminders for a habit.',
          null,
          { reminders: [{ id: '66666666-7777-8888-9999-000000000000', reminder_time: '06:15', reminder_type: 'in_app', is_enabled: true }] }
        ),
        buildRequestItem(
          'Create Reminder',
          'POST',
          '{{base_url}}/api/habits/{{habit_id}}/reminders',
          'Adds a notification reminder for a habit.',
          { reminderTime: '06:15', reminderType: 'in_app' },
          { reminder: { id: '66666666-7777-8888-9999-000000000000', reminder_time: '06:15', reminder_type: 'in_app', is_enabled: true } },
          false,
          ['if (json.data && json.data.reminder) pm.environment.set("reminder_id", json.data.reminder.id);']
        ),
        buildRequestItem(
          'Update Reminder',
          'PUT',
          '{{base_url}}/api/habits/{{habit_id}}/reminders/{{reminderId}}',
          'Updates reminder time or channel.',
          { reminderTime: '06:30' },
          { reminder: { id: '66666666-7777-8888-9999-000000000000', reminder_time: '06:30', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Toggle Reminder',
          'PATCH',
          '{{base_url}}/api/habits/{{habit_id}}/reminders/{{reminderId}}/toggle',
          'Enables or disables an existing habit reminder.',
          { isEnabled: false },
          { reminder: { id: '66666666-7777-8888-9999-000000000000', is_enabled: false, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Reminder',
          'DELETE',
          '{{base_url}}/api/habits/{{habit_id}}/reminders/{{reminderId}}',
          'Removes a reminder.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 4. Expenses
    {
      name: 'Expenses',
      description: 'Expense management: accounts, expense categories, transactions, double-entry transfers, budgets, recurring expenses, and emergency funds.',
      items: [
        buildRequestItem(
          'Get Financial Summary',
          'GET',
          '{{base_url}}/api/finance/summary',
          'Retrieves aggregated income, expense, and savings totals for the user.',
          null,
          { summary: { totalIncome: 50000, totalExpenses: 28500, netSavings: 21500, activeAccounts: 4 } }
        ),
        buildRequestItem(
          'Create Account',
          'POST',
          '{{base_url}}/api/finance/accounts',
          'Creates a bank account, credit card, or cash wallet.',
          { name: 'HDFC Savings', accountType: 'bank', currency: 'INR', initialBalance: 25000 },
          { account: { id: '77777777-8888-9999-0000-111111111111', name: 'HDFC Savings', account_type: 'bank', balance: 25000 } },
          false,
          ['if (json.data && json.data.account) pm.environment.set("account_id", json.data.account.id);']
        ),
        buildRequestItem(
          'List Accounts',
          'GET',
          '{{base_url}}/api/finance/accounts',
          'Lists all financial accounts and current balances.',
          null,
          { accounts: [{ id: '77777777-8888-9999-0000-111111111111', name: 'HDFC Savings', account_type: 'bank', balance: 25000 }] }
        ),
        buildRequestItem(
          'Get Account by ID',
          'GET',
          '{{base_url}}/api/finance/accounts/{{account_id}}',
          'Retrieves details for a specific financial account.',
          null,
          { account: { id: '77777777-8888-9999-0000-111111111111', name: 'HDFC Savings', balance: 25000 } }
        ),
        buildRequestItem(
          'Update Account',
          'PUT',
          '{{base_url}}/api/finance/accounts/{{account_id}}',
          'Updates account name or configuration.',
          { name: 'HDFC Salary Account' },
          { account: { id: '77777777-8888-9999-0000-111111111111', name: 'HDFC Salary Account', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Account',
          'DELETE',
          '{{base_url}}/api/finance/accounts/{{account_id}}',
          'Deletes an account.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Reconcile Account Balance',
          'POST',
          '{{base_url}}/api/finance/accounts/{{account_id}}/reconcile',
          'Reconciles account balance against actual statement balance.',
          { actualBalance: 24800, notes: 'Monthly reconciliation adjustment' },
          { account: { id: '77777777-8888-9999-0000-111111111111', balance: 24800, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Create Financial Category',
          'POST',
          '{{base_url}}/api/finance/categories',
          'Creates a customized budget/expense category.',
          { name: 'Groceries & Household', categoryType: 'expense', icon: 'shopping-cart', color: '#10b981' },
          { category: { id: '88888888-9999-0000-1111-222222222222', name: 'Groceries & Household', category_type: 'expense' } },
          false,
          ['if (json.data && json.data.category) pm.environment.set("financial_category_id", json.data.category.id);']
        ),
        buildRequestItem(
          'List Financial Categories',
          'GET',
          '{{base_url}}/api/finance/categories?includeSystem=true',
          'Lists system and custom financial categories.',
          null,
          { categories: [{ id: '88888888-9999-0000-1111-222222222222', name: 'Groceries & Household', category_type: 'expense' }] }
        ),
        buildRequestItem(
          'Get Financial Category by ID',
          'GET',
          '{{base_url}}/api/finance/categories/{{financial_category_id}}',
          'Retrieves details for a financial category.',
          null,
          { category: { id: '88888888-9999-0000-1111-222222222222', name: 'Groceries & Household', category_type: 'expense' } }
        ),
        buildRequestItem(
          'Update Financial Category',
          'PUT',
          '{{base_url}}/api/finance/categories/{{financial_category_id}}',
          'Updates category properties.',
          { name: 'Groceries & Essentials' },
          { category: { id: '88888888-9999-0000-1111-222222222222', name: 'Groceries & Essentials', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Financial Category',
          'DELETE',
          '{{base_url}}/api/finance/categories/{{financial_category_id}}',
          'Deletes a custom category.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Expense Transaction',
          'POST',
          '{{base_url}}/api/finance/transactions',
          'Records an outflow expense transaction.',
          { accountId: '{{account_id}}', categoryId: '{{financial_category_id}}', transactionType: 'expense', amount: 1250, transactionDate: '{{today}}', description: 'Weekly groceries' },
          { transaction: { id: '99999999-0000-1111-2222-333333333333', transaction_type: 'expense', amount: 1250 } },
          false,
          ['if (json.data && json.data.transaction) pm.environment.set("transaction_id", json.data.transaction.id);']
        ),
        buildRequestItem(
          'Create Account Transfer',
          'POST',
          '{{base_url}}/api/finance/transactions/transfer',
          'Executes an atomic double-entry transfer between accounts.',
          { fromAccountId: '{{account_id}}', toAccountId: '{{account_id}}', amount: 5000, transferDate: '{{today}}', notes: 'Emergency fund allocation' },
          { transferGroup: { id: '00000000-1111-2222-3333-444444444444', amount: 5000, transfer_date: '2026-10-23' } }
        ),
        buildRequestItem(
          'List Transactions',
          'GET',
          '{{base_url}}/api/finance/transactions?page=1&limit=20',
          'Lists transactions with pagination and date range filters.',
          null,
          { transactions: [{ id: '99999999-0000-1111-2222-333333333333', transaction_type: 'expense', amount: 1250 }] },
          true
        ),
        buildRequestItem(
          'Get Transaction by ID',
          'GET',
          '{{base_url}}/api/finance/transactions/{{transaction_id}}',
          'Retrieves details for a transaction.',
          null,
          { transaction: { id: '99999999-0000-1111-2222-333333333333', amount: 1250 } }
        ),
        buildRequestItem(
          'Update Transaction',
          'PUT',
          '{{base_url}}/api/finance/transactions/{{transaction_id}}',
          'Updates transaction amount or category.',
          { amount: 1300 },
          { transaction: { id: '99999999-0000-1111-2222-333333333333', amount: 1300, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Transaction',
          'DELETE',
          '{{base_url}}/api/finance/transactions/{{transaction_id}}',
          'Deletes a transaction and reconciles account balances.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Budget',
          'POST',
          '{{base_url}}/api/finance/budgets',
          'Sets spending limit for a category and period.',
          { categoryId: '{{financial_category_id}}', amount: 15000, period: 'monthly', startDate: '2026-10-01', endDate: '2026-10-31' },
          { budget: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amount: 15000, period: 'monthly' } },
          false,
          ['if (json.data && json.data.budget) pm.environment.set("budget_id", json.data.budget.id);']
        ),
        buildRequestItem(
          'List Budgets with Utilization',
          'GET',
          '{{base_url}}/api/finance/budgets?page=1&limit=10',
          'Lists budgets with real-time spending and remaining budget.',
          null,
          { budgets: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amount: 15000, spent: 7800, remaining: 7200, utilizationPercentage: 52 }] },
          true
        ),
        buildRequestItem(
          'Get Budget by ID',
          'GET',
          '{{base_url}}/api/finance/budgets/{{budget_id}}',
          'Retrieves specific budget details.',
          null,
          { budget: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amount: 15000 } }
        ),
        buildRequestItem(
          'Update Budget',
          'PUT',
          '{{base_url}}/api/finance/budgets/{{budget_id}}',
          'Modifies budget amount.',
          { amount: 18000 },
          { budget: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amount: 18000, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Budget',
          'DELETE',
          '{{base_url}}/api/finance/budgets/{{budget_id}}',
          'Deletes a budget.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Recurring Payment',
          'POST',
          '{{base_url}}/api/finance/recurring-payments',
          'Sets up a recurring subscription or recurring utility bill.',
          { name: 'Netflix Premium', accountId: '{{account_id}}', categoryId: '{{financial_category_id}}', amount: 649, frequency: 'monthly', nextDueDate: '2026-11-01' },
          { recurringPayment: { id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', name: 'Netflix Premium', amount: 649 } },
          false,
          ['if (json.data && json.data.recurringPayment) pm.environment.set("recurring_payment_id", json.data.recurringPayment.id);']
        ),
        buildRequestItem(
          'List Recurring Payments',
          'GET',
          '{{base_url}}/api/finance/recurring-payments?page=1&limit=10',
          'Lists all recurring subscriptions and payment schedules.',
          null,
          { recurringPayments: [{ id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', name: 'Netflix Premium', amount: 649, next_due_date: '2026-11-01' }] },
          true
        ),
        buildRequestItem(
          'List Due Recurring Payments',
          'GET',
          '{{base_url}}/api/finance/recurring-payments/due?asOfDate={{today}}',
          'Lists upcoming bills due on or before specified date.',
          null,
          { duePayments: [{ id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', name: 'Netflix Premium', amount: 649 }] }
        ),
        buildRequestItem(
          'Get Recurring Payment by ID',
          'GET',
          '{{base_url}}/api/finance/recurring-payments/{{recurring_payment_id}}',
          'Retrieves details for a recurring payment.',
          null,
          { recurringPayment: { id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', name: 'Netflix Premium', amount: 649 } }
        ),
        buildRequestItem(
          'Update Recurring Payment',
          'PUT',
          '{{base_url}}/api/finance/recurring-payments/{{recurring_payment_id}}',
          'Updates subscription amount or frequency.',
          { amount: 699 },
          { recurringPayment: { id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', amount: 699, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Recurring Payment',
          'DELETE',
          '{{base_url}}/api/finance/recurring-payments/{{recurring_payment_id}}',
          'Deletes a recurring payment configuration.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Record Recurring Occurrence',
          'POST',
          '{{base_url}}/api/finance/recurring-payments/{{recurring_payment_id}}/record',
          'Records payment occurrence and advances next due date.',
          { paidDate: '{{today}}', amount: 649 },
          { recorded: true, nextDueDate: '2026-11-23' }
        ),
        buildRequestItem(
          'Process Due Recurring Payments',
          'POST',
          '{{base_url}}/api/finance/recurring-payments/process-due',
          'Batch auto-processes all overdue payments.',
          { asOfDate: '{{today}}' },
          { processedCount: 2 }
        ),
        buildRequestItem(
          'Create Financial Goal',
          'POST',
          '{{base_url}}/api/finance/goals',
          'Creates a target savings goal (e.g. house downpayment, car, vacation).',
          { title: 'Emergency Fund 6 Months', targetAmount: 300000, targetDate: '2027-04-01' },
          { goal: { id: 'cccccccc-dddd-eeee-ffff-000000000000', title: 'Emergency Fund 6 Months', target_amount: 300000, current_amount: 0 } },
          false,
          ['if (json.data && json.data.goal) pm.environment.set("financial_goal_id", json.data.goal.id);']
        ),
        buildRequestItem(
          'List Financial Goals',
          'GET',
          '{{base_url}}/api/finance/goals?page=1&limit=10',
          'Lists savings goals and current contributions.',
          null,
          { goals: [{ id: 'cccccccc-dddd-eeee-ffff-000000000000', title: 'Emergency Fund 6 Months', target_amount: 300000, current_amount: 50000 }] },
          true
        ),
        buildRequestItem(
          'Get Financial Goal by ID',
          'GET',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}',
          'Retrieves details for a financial goal.',
          null,
          { goal: { id: 'cccccccc-dddd-eeee-ffff-000000000000', title: 'Emergency Fund 6 Months', target_amount: 300000 } }
        ),
        buildRequestItem(
          'Update Financial Goal',
          'PUT',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}',
          'Updates goal targets.',
          { targetAmount: 350000 },
          { goal: { id: 'cccccccc-dddd-eeee-ffff-000000000000', target_amount: 350000, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Financial Goal',
          'DELETE',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}',
          'Deletes a financial goal.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Add Goal Contribution',
          'POST',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}/contributions',
          'Records a deposit or contribution toward a goal.',
          { amount: 15000, contributionDate: '{{today}}', accountId: '{{account_id}}' },
          { contribution: { id: 'dddddddd-eeee-ffff-0000-111111111111', amount: 15000 } },
          false,
          ['if (json.data && json.data.contribution) pm.environment.set("goal_contribution_id", json.data.contribution.id);']
        ),
        buildRequestItem(
          'List Goal Contributions',
          'GET',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}/contributions',
          'Lists contribution records for a goal.',
          null,
          { contributions: [{ id: 'dddddddd-eeee-ffff-0000-111111111111', amount: 15000, contribution_date: '2026-10-23' }] }
        ),
        buildRequestItem(
          'Delete Goal Contribution',
          'DELETE',
          '{{base_url}}/api/finance/goals/{{financial_goal_id}}/contributions/{{goal_contribution_id}}',
          'Deletes a contribution record.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Get Emergency Fund Progress',
          'GET',
          '{{base_url}}/api/finance/emergency-fund',
          'Calculates emergency fund coverage against monthly average expenses.',
          null,
          { emergencyFund: { targetMonths: 6, targetAmount: 180000, currentSavings: 120000, monthsCovered: 4.0 } }
        ),
        buildRequestItem(
          'Update Emergency Fund',
          'PUT',
          '{{base_url}}/api/finance/emergency-fund',
          'Updates target months of emergency savings.',
          { targetMonths: 8 },
          { emergencyFund: { target_months: 8, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Create Liability',
          'POST',
          '{{base_url}}/api/finance/liabilities',
          'Records a loan, mortgage, or credit liability.',
          { name: 'Home Loan', totalAmount: 2500000, outstandingBalance: 2100000, interestRate: 8.5, monthlyPayment: 26000 },
          { liability: { id: 'eeeeeeee-ffff-0000-1111-222222222222', name: 'Home Loan', outstanding_balance: 2100000 } },
          false,
          ['if (json.data && json.data.liability) pm.environment.set("liability_id", json.data.liability.id);']
        ),
        buildRequestItem(
          'List Liabilities',
          'GET',
          '{{base_url}}/api/finance/liabilities?page=1&limit=10',
          'Lists active debts and liabilities.',
          null,
          { liabilities: [{ id: 'eeeeeeee-ffff-0000-1111-222222222222', name: 'Home Loan', outstanding_balance: 2100000 }] },
          true
        ),
        buildRequestItem(
          'Get Liability by ID',
          'GET',
          '{{base_url}}/api/finance/liabilities/{{liability_id}}',
          'Retrieves liability details.',
          null,
          { liability: { id: 'eeeeeeee-ffff-0000-1111-222222222222', name: 'Home Loan', outstanding_balance: 2100000 } }
        ),
        buildRequestItem(
          'Update Liability',
          'PUT',
          '{{base_url}}/api/finance/liabilities/{{liability_id}}',
          'Updates liability balance or payment details.',
          { outstandingBalance: 2050000 },
          { liability: { id: 'eeeeeeee-ffff-0000-1111-222222222222', outstanding_balance: 2050000, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Liability',
          'DELETE',
          '{{base_url}}/api/finance/liabilities/{{liability_id}}',
          'Deletes a liability record.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 5. Investments
    {
      name: 'Investments',
      description: 'Investment tracking: stock & mutual fund holdings, buy/sell transactions, valuations, and net worth historical snapshots.',
      items: [
        buildRequestItem(
          'Create Investment Holding',
          'POST',
          '{{base_url}}/api/finance/investments/holdings',
          'Adds an asset holding (stock, mutual fund, crypto, gold, real estate).',
          { assetType: 'stock', symbol: 'INFY', name: 'Infosys Ltd', quantity: 50, averageBuyPrice: 1420.0, currentPrice: 1510.0 },
          { holding: { id: 'ffffffff-0000-1111-2222-333333333333', symbol: 'INFY', quantity: 50, totalValue: 75500 } },
          false,
          ['if (json.data && json.data.holding) pm.environment.set("holding_id", json.data.holding.id);']
        ),
        buildRequestItem(
          'List Investment Holdings',
          'GET',
          '{{base_url}}/api/finance/investments/holdings',
          'Lists all user investment holdings with gain/loss calculations.',
          null,
          { holdings: [{ id: 'ffffffff-0000-1111-2222-333333333333', symbol: 'INFY', quantity: 50, totalValue: 75500, unrealizedGain: 4500 }] }
        ),
        buildRequestItem(
          'Get Holding by ID',
          'GET',
          '{{base_url}}/api/finance/investments/holdings/{{holding_id}}',
          'Retrieves details for a specific holding.',
          null,
          { holding: { id: 'ffffffff-0000-1111-2222-333333333333', symbol: 'INFY', quantity: 50, current_price: 1510.0 } }
        ),
        buildRequestItem(
          'Update Holding',
          'PUT',
          '{{base_url}}/api/finance/investments/holdings/{{holding_id}}',
          'Updates current price or holding notes.',
          { currentPrice: 1540.0 },
          { holding: { id: 'ffffffff-0000-1111-2222-333333333333', current_price: 1540.0, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Holding',
          'DELETE',
          '{{base_url}}/api/finance/investments/holdings/{{holding_id}}',
          'Deletes an investment holding.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Record Investment Transaction',
          'POST',
          '{{base_url}}/api/finance/investments/holdings/{{holding_id}}/transactions',
          'Records a buy or sell transaction against a holding.',
          { transactionType: 'buy', quantity: 10, pricePerUnit: 1450.0, transactionDate: '{{today}}', fees: 25 },
          { transaction: { id: '12345678-abcd-ef01-2345-6789abcdef01', transaction_type: 'buy', quantity: 10 } },
          false,
          ['if (json.data && json.data.transaction) pm.environment.set("investment_transaction_id", json.data.transaction.id);']
        ),
        buildRequestItem(
          'List Investment Transactions',
          'GET',
          '{{base_url}}/api/finance/investments/transactions?page=1&limit=20',
          'Lists investment buy/sell transaction ledger.',
          null,
          { transactions: [{ id: '12345678-abcd-ef01-2345-6789abcdef01', transaction_type: 'buy', quantity: 10 }] },
          true
        ),
        buildRequestItem(
          'Delete Investment Transaction',
          'DELETE',
          '{{base_url}}/api/finance/investments/transactions/{{investment_transaction_id}}',
          'Deletes an investment transaction.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Calculate Net Worth',
          'GET',
          '{{base_url}}/api/finance/net-worth',
          'Calculates real-time net worth: assets (cash + investments) minus liabilities.',
          null,
          { netWorth: { totalAssets: 1450000, totalLiabilities: 450000, netWorth: 1000000, breakdown: { cash: 250000, investments: 1200000, debts: 450000 } } }
        ),
        buildRequestItem(
          'Take Net Worth Snapshot',
          'POST',
          '{{base_url}}/api/finance/net-worth/snapshot',
          'Saves a point-in-time net worth record for historical charting.',
          { snapshotDate: '{{today}}', notes: 'Monthly net worth milestone' },
          { snapshot: { id: '23456789-bcde-f012-3456-789abcdef012', net_worth: 1000000, snapshot_date: '2026-10-23' } }
        ),
        buildRequestItem(
          'Get Net Worth History',
          'GET',
          '{{base_url}}/api/finance/net-worth/history?period=year',
          'Returns historical net worth snapshots for trend analysis.',
          null,
          { history: [{ snapshot_date: '2026-10-23', net_worth: 1000000 }] }
        ),
      ],
    },

    // 6. Income
    {
      name: 'Income',
      description: 'Income and earnings: salary contracts, regular wage history, and inflow transactions.',
      items: [
        buildRequestItem(
          'Create Salary Record',
          'POST',
          '{{base_url}}/api/finance/salary',
          'Registers monthly or annual compensation details.',
          { employerName: 'Tech Innovations Pvt Ltd', jobTitle: 'Senior Software Engineer', baseSalary: 120000, currency: 'INR', payFrequency: 'monthly', effectiveFrom: '2026-01-01', isActive: true },
          { salary: { id: '3456789a-cdef-0123-4567-89abcdef0123', employer_name: 'Tech Innovations Pvt Ltd', base_salary: 120000, is_active: true } },
          false,
          ['if (json.data && json.data.salary) pm.environment.set("salary_id", json.data.salary.id);']
        ),
        buildRequestItem(
          'Get Current Salary',
          'GET',
          '{{base_url}}/api/finance/salary/current',
          'Retrieves currently active salary contract.',
          null,
          { salary: { id: '3456789a-cdef-0123-4567-89abcdef0123', employer_name: 'Tech Innovations Pvt Ltd', base_salary: 120000, is_active: true } }
        ),
        buildRequestItem(
          'List Salary History',
          'GET',
          '{{base_url}}/api/finance/salary',
          'Lists historical salary increments and contracts.',
          null,
          { salaries: [{ id: '3456789a-cdef-0123-4567-89abcdef0123', employer_name: 'Tech Innovations Pvt Ltd', base_salary: 120000 }] }
        ),
        buildRequestItem(
          'Get Salary Record by ID',
          'GET',
          '{{base_url}}/api/finance/salary/{{salary_id}}',
          'Retrieves details for a salary record.',
          null,
          { salary: { id: '3456789a-cdef-0123-4567-89abcdef0123', employer_name: 'Tech Innovations Pvt Ltd', base_salary: 120000 } }
        ),
        buildRequestItem(
          'Update Salary Record',
          'PUT',
          '{{base_url}}/api/finance/salary/{{salary_id}}',
          'Updates salary terms.',
          { baseSalary: 135000 },
          { salary: { id: '3456789a-cdef-0123-4567-89abcdef0123', base_salary: 135000, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Salary Record',
          'DELETE',
          '{{base_url}}/api/finance/salary/{{salary_id}}',
          'Deletes a salary record.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Income Transaction',
          'POST',
          '{{base_url}}/api/finance/transactions',
          'Records incoming cash inflow (salary, dividend, freelance, bonus).',
          { accountId: '{{account_id}}', categoryId: '{{financial_category_id}}', transactionType: 'income', amount: 120000, transactionDate: '{{today}}', description: 'October 2026 Monthly Salary' },
          { transaction: { id: '456789ab-cdef-0123-4567-89abcdef0124', transaction_type: 'income', amount: 120000 } }
        ),
      ],
    },

    // 7. Dashboard
    {
      name: 'Dashboard',
      description: 'Daily dashboard: aggregated modules, widget ordering, and personalized user dashboard preferences.',
      items: [
        buildRequestItem(
          'Get Dashboard Overview',
          'GET',
          '{{base_url}}/api/dashboard?period=week&timezone={{timezone}}',
          'Aggregates habits progress, todays tasks, upcoming commitments, and finances into user-configured widgets.',
          null,
          {
            dashboard: {
              date: '2026-10-23',
              period: 'week',
              widgets: [
                { key: 'today', available: true, data: { date: '2026-10-23', greeting: 'Good Morning' } },
                { key: 'habit_progress', available: true, data: { activeHabits: 5, completionRate: 80 } },
                { key: 'todays_tasks', available: true, data: { openTasks: 3, completedTasks: 2 } },
              ],
            },
          }
        ),
        buildRequestItem(
          'Get Dashboard Preferences',
          'GET',
          '{{base_url}}/api/dashboard/preferences',
          'Returns visible widgets, widget ordering, and default period.',
          null,
          {
            preferences: {
              visible_widgets: ['today', 'habit_progress', 'weekly_habit_tracker', 'todays_tasks'],
              widget_order: ['today', 'habit_progress', 'weekly_habit_tracker', 'todays_tasks'],
              default_period: 'week',
            },
          }
        ),
        buildRequestItem(
          'Update Dashboard Preferences',
          'PUT',
          '{{base_url}}/api/dashboard/preferences',
          'Customizes widget layout, visibility, and default period.',
          { visibleWidgets: ['today', 'habit_progress', 'todays_tasks'], defaultPeriod: 'day' },
          {
            preferences: {
              visible_widgets: ['today', 'habit_progress', 'todays_tasks'],
              default_period: 'day',
              updated_at: '2026-10-23T10:00:00.000Z',
            },
          }
        ),
      ],
    },

    // 8. Analytics
    {
      name: 'Analytics',
      description: 'Analytics, performance reports, and cross-module insights: habits, tasks, finance, learning, reviews, and pre-computed snapshots.',
      items: [
        buildRequestItem(
          'Get Dashboard Analytics',
          'GET',
          '{{base_url}}/api/insights/dashboard?period={{period}}',
          'High-level productivity, health, and financial scorecards.',
          null,
          { analytics: { habitAdherence: 82.5, taskCompletionRate: 75.0, financialSavingsRate: 42.0 } }
        ),
        buildRequestItem(
          'Get Habit Analytics',
          'GET',
          '{{base_url}}/api/insights/habits?period={{period}}',
          'Detailed completion trends, streaks, and adherence heatmaps.',
          null,
          { habitInsights: { topPerforming: ['Morning Run', 'Meditation'], needsAttention: ['Reading'] } }
        ),
        buildRequestItem(
          'Get Task & Productivity Analytics',
          'GET',
          '{{base_url}}/api/insights/tasks?period={{period}}',
          'Velocity, overdue task frequencies, and completion rates by priority.',
          null,
          { taskInsights: { completedCount: 24, overdueCount: 2, avgCompletionTimeDays: 1.2 } }
        ),
        buildRequestItem(
          'Get Review & Performance Analytics',
          'GET',
          '{{base_url}}/api/insights/reviews?period={{period}}',
          'Self-rating averages and recurring reflection insights.',
          null,
          { reviewInsights: { avgEnergyRating: 4.2, avgFocusRating: 3.8 } }
        ),
        buildRequestItem(
          'Get Financial Analytics',
          'GET',
          '{{base_url}}/api/insights/finance?period={{period}}',
          'Top spending categories, cash-flow trends, and budget variances.',
          null,
          { financialInsights: { totalOutflow: 32000, topCategory: 'Dining Out', budgetUtilization: 68 } }
        ),
        buildRequestItem(
          'Get Learning Analytics',
          'GET',
          '{{base_url}}/api/insights/learning?period={{period}}',
          'Active learning retention and spaced-repetition accuracy scores.',
          null,
          { learningInsights: { totalReviewed: 18, retentionRate: 88.5 } }
        ),
        buildRequestItem(
          'Get Performance Report',
          'GET',
          '{{base_url}}/api/insights/reports?period={{period}}',
          'Aggregated report with actionable improvements across all areas.',
          null,
          { report: { overallScore: 84, recommendations: ['Schedule workout earlier in morning'] } }
        ),
        buildRequestItem(
          'Get Analytics Preferences',
          'GET',
          '{{base_url}}/api/insights/preferences',
          'Retrieves user insights customization preferences.',
          null,
          { preferences: { weeklyDigestEnabled: true, defaultPeriod: 'month' } }
        ),
        buildRequestItem(
          'Update Analytics Preferences',
          'PUT',
          '{{base_url}}/api/insights/preferences',
          'Updates insights notification & calculation settings.',
          { weeklyDigestEnabled: false },
          { preferences: { weeklyDigestEnabled: false, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Generate Analytics Snapshot',
          'POST',
          '{{base_url}}/api/insights/snapshots',
          'Computes and caches an analytics snapshot for quick dashboard retrieval.',
          { snapshotType: 'monthly', periodDate: '{{today}}' },
          { snapshot: { id: '56789abc-def0-1234-5678-9abcdef01235', period_date: '2026-10-23', overall_score: 85 } },
          false,
          ['if (json.data && json.data.snapshot) pm.environment.set("snapshot_id", json.data.snapshot.id);']
        ),
        buildRequestItem(
          'List Analytics Snapshots',
          'GET',
          '{{base_url}}/api/insights/snapshots?page=1&limit=10',
          'Lists historical insight snapshots.',
          null,
          { snapshots: [{ id: '56789abc-def0-1234-5678-9abcdef01235', period_date: '2026-10-23', overall_score: 85 }] },
          true
        ),
        buildRequestItem(
          'Get Analytics Snapshot by ID',
          'GET',
          '{{base_url}}/api/insights/snapshots/{{snapshot_id}}',
          'Retrieves a cached analytics snapshot.',
          null,
          { snapshot: { id: '56789abc-def0-1234-5678-9abcdef01235', overall_score: 85 } }
        ),
      ],
    },

    // 9. Settings
    {
      name: 'Settings',
      description: 'System-wide preferences, privacy controls, and multi-channel notification configurations.',
      items: [
        buildRequestItem(
          'Get User Preferences',
          'GET',
          '{{base_url}}/api/settings/preferences',
          'Retrieves user theme, locale, start-of-week, and currency settings.',
          null,
          { preferences: { theme: 'dark', currency: 'INR', startOfWeek: 1, timezone: 'Asia/Kolkata' } }
        ),
        buildRequestItem(
          'Create Default Preferences',
          'POST',
          '{{base_url}}/api/settings/preferences',
          'Initializes user preferences.',
          { theme: 'system', currency: 'INR', startOfWeek: 1 },
          { preferences: { theme: 'system', currency: 'INR', startOfWeek: 1 } }
        ),
        buildRequestItem(
          'Update User Preferences',
          'PUT',
          '{{base_url}}/api/settings/preferences',
          'Updates user theme and default settings.',
          { theme: 'dark', currency: 'INR', startOfWeek: 1 },
          { preferences: { theme: 'dark', currency: 'INR', startOfWeek: 1, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Partially Update User Preferences',
          'PATCH',
          '{{base_url}}/api/settings/preferences',
          'Updates individual preference fields.',
          { theme: 'light' },
          { preferences: { theme: 'light', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Get Privacy Settings',
          'GET',
          '{{base_url}}/api/settings/privacy',
          'Retrieves profile visibility and data telemetry settings.',
          null,
          { privacy: { analyticsConsent: true, shareActivityWithFriends: false } }
        ),
        buildRequestItem(
          'Update Privacy Settings',
          'PUT',
          '{{base_url}}/api/settings/privacy',
          'Updates privacy flags.',
          { analyticsConsent: true, shareActivityWithFriends: false },
          { privacy: { analyticsConsent: true, shareActivityWithFriends: false, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Partially Update Privacy Settings',
          'PATCH',
          '{{base_url}}/api/settings/privacy',
          'Partially updates privacy flags.',
          { analyticsConsent: false },
          { privacy: { analyticsConsent: false, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Get Notification Preferences',
          'GET',
          '{{base_url}}/api/settings/notifications',
          'Retrieves notification delivery channels (email, in-app, push).',
          null,
          { notifications: { emailEnabled: true, pushEnabled: true, habitReminders: true, dailyDigest: true } }
        ),
        buildRequestItem(
          'Update Notification Preferences',
          'PUT',
          '{{base_url}}/api/settings/notifications',
          'Updates notification channels and frequencies.',
          { emailEnabled: true, pushEnabled: false, habitReminders: true, dailyDigest: true },
          { notifications: { emailEnabled: true, pushEnabled: false, habitReminders: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Partially Update Notification Preferences',
          'PATCH',
          '{{base_url}}/api/settings/notifications',
          'Partially updates notification channels.',
          { pushEnabled: true },
          { notifications: { pushEnabled: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
      ],
    },

    // 10. Tasks
    {
      name: 'Tasks',
      description: 'Task management: prioritized tasks, subtask hierarchies, completion history, and recurring task generation.',
      items: [
        buildRequestItem(
          'Create Task',
          'POST',
          '{{base_url}}/api/tasks',
          'Creates a scheduled or inbox task with priority and optional subtasks.',
          { title: 'Prepare Q4 Product Roadmap', priority: 'high', scheduledDate: '{{today}}', estimatedMinutes: 90, subtasks: ['Analyze metrics', 'Draft slides'] },
          { task: { id: '6789abcd-ef01-2345-6789-abcdef012356', title: 'Prepare Q4 Product Roadmap', status: 'planned', priority: 'high' } },
          false,
          ['if (json.data && json.data.task) pm.environment.set("task_id", json.data.task.id);']
        ),
        buildRequestItem(
          'List Tasks',
          'GET',
          '{{base_url}}/api/tasks?page=1&limit=10',
          'Lists tasks with pagination and status, date, or category filters.',
          null,
          { tasks: [{ id: '6789abcd-ef01-2345-6789-abcdef012356', title: 'Prepare Q4 Product Roadmap', status: 'planned', priority: 'high' }] },
          true
        ),
        buildRequestItem(
          'Get Task by ID',
          'GET',
          '{{base_url}}/api/tasks/{{task_id}}',
          'Retrieves task details including subtasks and status timeline.',
          null,
          { task: { id: '6789abcd-ef01-2345-6789-abcdef012356', title: 'Prepare Q4 Product Roadmap', status: 'planned', subtasks: [] } }
        ),
        buildRequestItem(
          'Update Task',
          'PUT',
          '{{base_url}}/api/tasks/{{task_id}}',
          'Updates task title, scheduled date, or priority.',
          { title: 'Finalize Q4 Product Roadmap', priority: 'urgent' },
          { task: { id: '6789abcd-ef01-2345-6789-abcdef012356', title: 'Finalize Q4 Product Roadmap', priority: 'urgent', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Update Task Status',
          'PATCH',
          '{{base_url}}/api/tasks/{{task_id}}/status',
          'Changes task status (planned, active, completed, cancelled) and records history.',
          { status: 'completed' },
          { task: { id: '6789abcd-ef01-2345-6789-abcdef012356', status: 'completed', completed_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Task',
          'DELETE',
          '{{base_url}}/api/tasks/{{task_id}}',
          'Deletes a task and all associated subtasks.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Subtask',
          'POST',
          '{{base_url}}/api/tasks/{{task_id}}/subtasks',
          'Adds a checklist item or subtask.',
          { title: 'Review competitive landscape' },
          { subtask: { id: '789abcdef0-1234-5678-9abc-def012356789', title: 'Review competitive landscape', is_completed: false } },
          false,
          ['if (json.data && json.data.subtask) pm.environment.set("subtask_id", json.data.subtask.id);']
        ),
        buildRequestItem(
          'Update Subtask',
          'PUT',
          '{{base_url}}/api/tasks/{{task_id}}/subtasks/{{subtask_id}}',
          'Updates subtask completion or title.',
          { isCompleted: true },
          { subtask: { id: '789abcdef0-1234-5678-9abc-def012356789', is_completed: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Subtask',
          'DELETE',
          '{{base_url}}/api/tasks/{{task_id}}/subtasks/{{subtask_id}}',
          'Removes a subtask.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Get Task Status History',
          'GET',
          '{{base_url}}/api/tasks/{{task_id}}/history',
          'Returns audit trail of status transitions for the task.',
          null,
          { history: [{ from_status: 'planned', to_status: 'completed', changed_at: '2026-10-23T10:00:00.000Z' }] }
        ),
        buildRequestItem(
          'Create Recurrence Template',
          'POST',
          '{{base_url}}/api/tasks/recurrences',
          'Configures automated recurring task rule (daily, weekly, monthly).',
          { title: 'Weekly Team Sync Preparation', recurrencePattern: 'weekly', daysOfWeek: ['monday'] },
          { recurrence: { id: '89abcdef01-2345-6789-abcd-ef012356789a', title: 'Weekly Team Sync Preparation', pattern: 'weekly' } },
          false,
          ['if (json.data && json.data.recurrence) pm.environment.set("recurrence_id", json.data.recurrence.id);']
        ),
        buildRequestItem(
          'List Recurrence Templates',
          'GET',
          '{{base_url}}/api/tasks/recurrences',
          'Lists recurring task templates.',
          null,
          { recurrences: [{ id: '89abcdef01-2345-6789-abcd-ef012356789a', title: 'Weekly Team Sync Preparation' }] }
        ),
        buildRequestItem(
          'Get Recurrence Template',
          'GET',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}',
          'Retrieves details for a recurrence template.',
          null,
          { recurrence: { id: '89abcdef01-2345-6789-abcd-ef012356789a', title: 'Weekly Team Sync Preparation' } }
        ),
        buildRequestItem(
          'Update Recurrence Template',
          'PUT',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}',
          'Updates recurring task rules.',
          { title: 'Weekly Standup Notes' },
          { recurrence: { id: '89abcdef01-2345-6789-abcd-ef012356789a', title: 'Weekly Standup Notes', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Pause Recurrence Template',
          'PATCH',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}/pause',
          'Temporarily pauses task recurrence generation.',
          null,
          { paused: true }
        ),
        buildRequestItem(
          'Resume Recurrence Template',
          'PATCH',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}/resume',
          'Resumes active task recurrence.',
          null,
          { resumed: true }
        ),
        buildRequestItem(
          'Delete Recurrence Template',
          'DELETE',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}',
          'Deletes a recurrence template.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Generate Recurrence Occurrence',
          'POST',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}/generate',
          'Manually triggers instantiation of a task from template.',
          null,
          { task: { id: '9abcdef012-3456-789a-bcde-f012356789ab', title: 'Weekly Standup Notes' } }
        ),
        buildRequestItem(
          'Get Recurrence History',
          'GET',
          '{{base_url}}/api/tasks/recurrences/{{recurrence_id}}/history',
          'Lists tasks instantiated by this recurring template.',
          null,
          { history: [{ generated_at: '2026-10-23T10:00:00.000Z', task_id: '9abcdef012-3456-789a-bcde-f012356789ab' }] }
        ),
      ],
    },

    // 11. Priorities
    {
      name: 'Priorities',
      description: 'Daily Top 3 Priorities: maximum 3 daily priorities per user, ordered serialization, completion toggle, and reordering.',
      items: [
        buildRequestItem(
          'Create Daily Priority',
          'POST',
          '{{base_url}}/api/priorities',
          'Creates a priority item for the date (enforces maximum 3 per day limit).',
          { title: 'Ship feature release', priorityDate: '{{today}}' },
          { priority: { id: 'abcdef0123-4567-89ab-cdef-012356789abc', title: 'Ship feature release', priority_order: 1, priority_date: '2026-10-23' } },
          false,
          ['if (json.data && json.data.priority) pm.environment.set("priority_id", json.data.priority.id);']
        ),
        buildRequestItem(
          'List Daily Priorities',
          'GET',
          '{{base_url}}/api/priorities?date={{today}}',
          'Lists ordered daily priorities for the specified date.',
          null,
          { priorities: [{ id: 'abcdef0123-4567-89ab-cdef-012356789abc', title: 'Ship feature release', priority_order: 1, is_completed: false }] }
        ),
        buildRequestItem(
          'Get Priority by ID',
          'GET',
          '{{base_url}}/api/priorities/{{priority_id}}',
          'Retrieves details for a specific priority item.',
          null,
          { priority: { id: 'abcdef0123-4567-89ab-cdef-012356789abc', title: 'Ship feature release', priority_order: 1 } }
        ),
        buildRequestItem(
          'Update Priority',
          'PUT',
          '{{base_url}}/api/priorities/{{priority_id}}',
          'Updates title or description for a priority item.',
          { title: 'Deploy production release' },
          { priority: { id: 'abcdef0123-4567-89ab-cdef-012356789abc', title: 'Deploy production release', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Toggle Priority Completion',
          'PATCH',
          '{{base_url}}/api/priorities/{{priority_id}}/completion',
          'Toggles completed_at timestamp on a daily priority.',
          { isCompleted: true },
          { priority: { id: 'abcdef0123-4567-89ab-cdef-012356789abc', is_completed: true, completed_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Reorder Daily Priorities',
          'PATCH',
          '{{base_url}}/api/priorities/reorder',
          'Reorders the 1-3 priorities for a specific day.',
          { priorityDate: '{{today}}', priorityIds: ['{{priority_id}}'] },
          { priorities: [{ id: 'abcdef0123-4567-89ab-cdef-012356789abc', priority_order: 1 }] }
        ),
        buildRequestItem(
          'Delete Priority',
          'DELETE',
          '{{base_url}}/api/priorities/{{priority_id}}',
          'Deletes a priority and re-compacts ordering 1..N.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 12. Intentions
    {
      name: 'Intentions',
      description: 'Daily Mindful Intention: single focus statement per calendar date.',
      items: [
        buildRequestItem(
          'Create Daily Intention',
          'POST',
          '{{base_url}}/api/intentions',
          'Sets daily intention statement (1 per day limit).',
          { intention: 'Practice patient, active listening in all discussions', intentionDate: '{{today}}' },
          { intention: { id: 'bcdef01234-5678-9abc-def0-12356789abcd', intention: 'Practice patient, active listening in all discussions', intention_date: '2026-10-23' } },
          false,
          ['if (json.data && json.data.intention) pm.environment.set("intention_id", json.data.intention.id);']
        ),
        buildRequestItem(
          'List Daily Intentions',
          'GET',
          '{{base_url}}/api/intentions?startDate={{today}}&endDate={{today}}',
          'Lists intentions for a date range.',
          null,
          { intentions: [{ id: 'bcdef01234-5678-9abc-def0-12356789abcd', intention: 'Practice patient, active listening in all discussions', intention_date: '2026-10-23' }] }
        ),
        buildRequestItem(
          'Get Daily Intention by ID',
          'GET',
          '{{base_url}}/api/intentions/{{intention_id}}',
          'Retrieves intention details.',
          null,
          { intention: { id: 'bcdef01234-5678-9abc-def0-12356789abcd', intention: 'Practice patient, active listening in all discussions' } }
        ),
        buildRequestItem(
          'Update Daily Intention',
          'PUT',
          '{{base_url}}/api/intentions/{{intention_id}}',
          'Modifies intention statement.',
          { intention: 'Practice empathy and calm focus' },
          { intention: { id: 'bcdef01234-5678-9abc-def0-12356789abcd', intention: 'Practice empathy and calm focus', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Daily Intention',
          'DELETE',
          '{{base_url}}/api/intentions/{{intention_id}}',
          'Deletes an intention.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 13. Notes
    {
      name: 'Notes',
      description: 'Notes and knowledge: categories, full-text search, tagging, pinning, and archiving.',
      items: [
        buildRequestItem(
          'Create Note Category',
          'POST',
          '{{base_url}}/api/notes/categories',
          'Creates a category for grouping notes.',
          { name: 'System Architecture', color: '#3b82f6' },
          { category: { id: 'cdef012345-6789-abcd-ef01-2356789abcde', name: 'System Architecture' } },
          false,
          ['if (json.data && json.data.category) pm.environment.set("note_category_id", json.data.category.id);']
        ),
        buildRequestItem(
          'List Note Categories',
          'GET',
          '{{base_url}}/api/notes/categories',
          'Lists note categories.',
          null,
          { categories: [{ id: 'cdef012345-6789-abcd-ef01-2356789abcde', name: 'System Architecture' }] }
        ),
        buildRequestItem(
          'Update Note Category',
          'PUT',
          '{{base_url}}/api/notes/categories/{{note_category_id}}',
          'Updates category name.',
          { name: 'Backend Engineering' },
          { category: { id: 'cdef012345-6789-abcd-ef01-2356789abcde', name: 'Backend Engineering', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Note Category',
          'DELETE',
          '{{base_url}}/api/notes/categories/{{note_category_id}}',
          'Deletes a category, keeping notes intact.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Create Note',
          'POST',
          '{{base_url}}/api/notes',
          'Creates a rich markdown note with category and tags.',
          { title: 'PostgreSQL Indexing Best Practices', content: '# Indexes\n- Use B-Tree for equality and range...', categoryId: '{{note_category_id}}', tags: ['database', 'postgres', 'performance'] },
          { note: { id: 'def0123456-789a-bcde-f012-356789abcdef', title: 'PostgreSQL Indexing Best Practices', tags: ['database', 'postgres', 'performance'] } },
          false,
          ['if (json.data && json.data.note) pm.environment.set("note_id", json.data.note.id);']
        ),
        buildRequestItem(
          'List Notes',
          'GET',
          '{{base_url}}/api/notes?page=1&limit=10',
          'Lists notes with pagination and optional filters.',
          null,
          { notes: [{ id: 'def0123456-789a-bcde-f012-356789abcdef', title: 'PostgreSQL Indexing Best Practices', is_pinned: false }] },
          true
        ),
        buildRequestItem(
          'Search Notes',
          'GET',
          '{{base_url}}/api/notes/search?q=postgres&page=1&limit=10',
          'Full-text search matching across note title, content, and tags.',
          null,
          { notes: [{ id: 'def0123456-789a-bcde-f012-356789abcdef', title: 'PostgreSQL Indexing Best Practices' }] },
          true
        ),
        buildRequestItem(
          'Get Note by ID',
          'GET',
          '{{base_url}}/api/notes/{{note_id}}',
          'Retrieves note content, category, and tags.',
          null,
          { note: { id: 'def0123456-789a-bcde-f012-356789abcdef', title: 'PostgreSQL Indexing Best Practices', content: '# Indexes...' } }
        ),
        buildRequestItem(
          'Update Note',
          'PUT',
          '{{base_url}}/api/notes/{{note_id}}',
          'Updates note title, markdown content, or category.',
          { title: 'PostgreSQL Performance & Indexing' },
          { note: { id: 'def0123456-789a-bcde-f012-356789abcdef', title: 'PostgreSQL Performance & Indexing', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Toggle Pin Note',
          'PATCH',
          '{{base_url}}/api/notes/{{note_id}}/pin',
          'Pins or unpins note to the top of list.',
          { isPinned: true },
          { note: { id: 'def0123456-789a-bcde-f012-356789abcdef', is_pinned: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Toggle Archive Note',
          'PATCH',
          '{{base_url}}/api/notes/{{note_id}}/archive',
          'Archives or unarchives a note.',
          { isArchived: true },
          { note: { id: 'def0123456-789a-bcde-f012-356789abcdef', is_archived: true, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Replace Note Tags',
          'PUT',
          '{{base_url}}/api/notes/{{note_id}}/tags',
          'Replaces tags for a note with de-duplication.',
          { tags: ['database', 'optimization', 'sql'] },
          { tags: ['database', 'optimization', 'sql'] }
        ),
        buildRequestItem(
          'Delete Note',
          'DELETE',
          '{{base_url}}/api/notes/{{note_id}}',
          'Deletes a note and associated tag links.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 14. Learning
    {
      name: 'Learning',
      description: 'Continuous learning & spaced repetition: learning entries, topic reviews, understanding levels, and upcoming due reviews.',
      items: [
        buildRequestItem(
          'Create Learning Entry',
          'POST',
          '{{base_url}}/api/learning',
          'Logs a new topic or skill learned with source and key takeaways.',
          { title: 'Designing Data-Intensive Applications: Ch 5 Replication', category: 'technology', source: 'Book', keyTakeaways: 'Leader-follower replication, synchronicity trade-offs', nextReviewDate: '{{today}}' },
          { entry: { id: 'ef01234567-89ab-cdef-0123-56789abcdef0', title: 'Designing Data-Intensive Applications: Ch 5 Replication', review_count: 0 } },
          false,
          ['if (json.data && json.data.entry) pm.environment.set("learning_id", json.data.entry.id);']
        ),
        buildRequestItem(
          'List Learning Entries',
          'GET',
          '{{base_url}}/api/learning?page=1&limit=10',
          'Lists learning ledger with pagination and sorting.',
          null,
          { entries: [{ id: 'ef01234567-89ab-cdef-0123-56789abcdef0', title: 'Designing Data-Intensive Applications: Ch 5 Replication' }] },
          true
        ),
        buildRequestItem(
          'Search Learning Entries',
          'GET',
          '{{base_url}}/api/learning/search?q=replication&page=1&limit=10',
          'Searches learning topics by title, source, or notes.',
          null,
          { entries: [{ id: 'ef01234567-89ab-cdef-0123-56789abcdef0', title: 'Designing Data-Intensive Applications: Ch 5 Replication' }] },
          true
        ),
        buildRequestItem(
          'List Upcoming Reviews',
          'GET',
          '{{base_url}}/api/learning/upcoming-reviews?asOfDate={{today}}',
          'Returns learning topics due for spaced-repetition review.',
          null,
          { upcomingReviews: [{ id: 'ef01234567-89ab-cdef-0123-56789abcdef0', title: 'Designing Data-Intensive Applications: Ch 5 Replication', next_review_date: '2026-10-23' }] }
        ),
        buildRequestItem(
          'Get Learning Entry by ID',
          'GET',
          '{{base_url}}/api/learning/{{learning_id}}',
          'Retrieves detailed learning entry and review history.',
          null,
          { entry: { id: 'ef01234567-89ab-cdef-0123-56789abcdef0', title: 'Designing Data-Intensive Applications: Ch 5 Replication', reviews: [] } }
        ),
        buildRequestItem(
          'Update Learning Entry',
          'PUT',
          '{{base_url}}/api/learning/{{learning_id}}',
          'Updates entry summary or next review date.',
          { keyTakeaways: 'Leader-follower replication, quorum reads/writes' },
          { entry: { id: 'ef01234567-89ab-cdef-0123-56789abcdef0', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Learning Entry',
          'DELETE',
          '{{base_url}}/api/learning/{{learning_id}}',
          'Removes a learning entry and its review logs.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Record Learning Review',
          'POST',
          '{{base_url}}/api/learning/{{learning_id}}/reviews',
          'Logs a review session with understanding score (1-5) and schedules next review.',
          { understandingScore: 4, reviewDate: '{{today}}', notes: 'Felt confident explaining multi-leader replication', nextReviewDate: '2026-10-30' },
          { review: { id: 'f012345678-9abc-def0-1234-56789abcdef0', understanding_score: 4, review_date: '2026-10-23' } },
          false,
          ['if (json.data && json.data.review) pm.environment.set("learning_review_id", json.data.review.id);']
        ),
        buildRequestItem(
          'List Learning Reviews',
          'GET',
          '{{base_url}}/api/learning/{{learning_id}}/reviews',
          'Lists history of spaced-repetition sessions for this topic.',
          null,
          { reviews: [{ id: 'f012345678-9abc-def0-1234-56789abcdef0', understanding_score: 4, review_date: '2026-10-23' }] }
        ),
        buildRequestItem(
          'Update Learning Review',
          'PUT',
          '{{base_url}}/api/learning/{{learning_id}}/reviews/{{learning_review_id}}',
          'Updates review session score or notes.',
          { understandingScore: 5 },
          { review: { id: 'f012345678-9abc-def0-1234-56789abcdef0', understanding_score: 5, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Learning Review',
          'DELETE',
          '{{base_url}}/api/learning/{{learning_id}}/reviews/{{learning_review_id}}',
          'Deletes a review record.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 15. Reviews
    {
      name: 'Reviews',
      description: 'Periodic reflections (daily, weekly, monthly), qualitative self-ratings, actionable follow-ups, and automated performance summaries.',
      items: [
        buildRequestItem(
          'Create Review',
          'POST',
          '{{base_url}}/api/reviews',
          'Creates a periodic reflection review (daily, weekly, monthly).',
          { reviewType: 'weekly', reviewDate: '{{today}}', notes: 'Productive week with solid habit consistency', energyScore: 4, productivityScore: 4 },
          { review: { id: '0123456789-abcd-ef01-2345-6789abcdef01', review_type: 'weekly', review_date: '2026-10-23', status: 'draft' } },
          false,
          ['if (json.data && json.data.review) pm.environment.set("review_id", json.data.review.id);']
        ),
        buildRequestItem(
          'List Reviews',
          'GET',
          '{{base_url}}/api/reviews?page=1&limit=10',
          'Lists reflection reviews with pagination.',
          null,
          { reviews: [{ id: '0123456789-abcd-ef01-2345-6789abcdef01', review_type: 'weekly', status: 'completed' }] },
          true
        ),
        buildRequestItem(
          'Generate Review Summary',
          'GET',
          '{{base_url}}/api/reviews/summary?type=weekly&date={{today}}',
          'Auto-generates aggregated review summary from habit logs and task completions.',
          null,
          { summary: { completedHabitsCount: 28, completedTasksCount: 15, keyHighlights: ['Morning Run streak active'] } }
        ),
        buildRequestItem(
          'Get Review by ID',
          'GET',
          '{{base_url}}/api/reviews/{{review_id}}',
          'Retrieves detailed review record including ratings and action items.',
          null,
          { review: { id: '0123456789-abcd-ef01-2345-6789abcdef01', review_type: 'weekly', status: 'draft' } }
        ),
        buildRequestItem(
          'Update Review',
          'PUT',
          '{{base_url}}/api/reviews/{{review_id}}',
          'Updates review reflections and notes.',
          { notes: 'Solid week, will focus more on sleep consistency next week.' },
          { review: { id: '0123456789-abcd-ef01-2345-6789abcdef01', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Complete Review',
          'PATCH',
          '{{base_url}}/api/reviews/{{review_id}}/complete',
          'Marks a review as finalized and complete.',
          null,
          { review: { id: '0123456789-abcd-ef01-2345-6789abcdef01', status: 'completed', completed_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Review',
          'DELETE',
          '{{base_url}}/api/reviews/{{review_id}}',
          'Deletes a review record.',
          null,
          { deleted: true }
        ),
        buildRequestItem(
          'Get Review Ratings',
          'GET',
          '{{base_url}}/api/reviews/{{review_id}}/ratings',
          'Retrieves habit and task ratings linked to this review.',
          null,
          { ratings: [{ habit_id: '{{habit_id}}', rating: 5, notes: 'Consistent execution' }] }
        ),
        buildRequestItem(
          'Add Habit Ratings',
          'POST',
          '{{base_url}}/api/reviews/{{review_id}}/ratings/habits',
          'Attaches habit performance ratings to a review.',
          { habitId: '{{habit_id}}', rating: 5, notes: 'Never missed a session' },
          { rating: { habit_id: '{{habit_id}}', rating: 5 } }
        ),
        buildRequestItem(
          'Add Task Ratings',
          'POST',
          '{{base_url}}/api/reviews/{{review_id}}/ratings/tasks',
          'Attaches task execution satisfaction ratings to a review.',
          { taskId: '{{task_id}}', rating: 4, notes: 'Completed ahead of schedule' },
          { rating: { task_id: '{{task_id}}', rating: 4 } }
        ),
        buildRequestItem(
          'Create Review Action',
          'POST',
          '{{base_url}}/api/reviews/{{review_id}}/actions',
          'Creates a follow-up action item stemming from reflection.',
          { actionText: 'Implement night routine cutoff at 10 PM', dueDate: '2026-10-30' },
          { action: { id: '123456789a-bcde-f012-3456-789abcdef012', action_text: 'Implement night routine cutoff at 10 PM', status: 'open' } },
          false,
          ['if (json.data && json.data.action) pm.environment.set("review_action_id", json.data.action.id);']
        ),
        buildRequestItem(
          'List Open Review Actions',
          'GET',
          '{{base_url}}/api/reviews/actions/open',
          'Lists all pending reflection action items.',
          null,
          { actions: [{ id: '123456789a-bcde-f012-3456-789abcdef012', action_text: 'Implement night routine cutoff at 10 PM', status: 'open' }] }
        ),
        buildRequestItem(
          'Update Review Action Status',
          'PATCH',
          '{{base_url}}/api/reviews/actions/{{review_action_id}}/status',
          'Marks an action item as completed or in-progress.',
          { status: 'completed' },
          { action: { id: '123456789a-bcde-f012-3456-789abcdef012', status: 'completed', updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
      ],
    },

    // 16. Notifications
    {
      name: 'Notifications',
      description: 'In-app and push notifications: notification feeds, unread badges, automated reminder generators, and channel preferences.',
      items: [
        buildRequestItem(
          'Create Notification',
          'POST',
          '{{base_url}}/api/notifications',
          'Dispatches an in-app or push notification.',
          { title: 'Habit Reminder', message: 'Time for your Morning Run!', notificationType: 'reminder' },
          { notification: { id: '23456789ab-cdef-0123-4567-89abcdef0123', title: 'Habit Reminder', is_read: false } },
          false,
          ['if (json.data && json.data.notification) pm.environment.set("notification_id", json.data.notification.id);']
        ),
        buildRequestItem(
          'List Notifications',
          'GET',
          '{{base_url}}/api/notifications?page=1&limit=10',
          'Lists user notifications with pagination.',
          null,
          { notifications: [{ id: '23456789ab-cdef-0123-4567-89abcdef0123', title: 'Habit Reminder', is_read: false }] },
          true
        ),
        buildRequestItem(
          'Get Unread Notifications Count',
          'GET',
          '{{base_url}}/api/notifications/unread-count',
          'Returns badge count of unread notifications.',
          null,
          { unreadCount: 3 }
        ),
        buildRequestItem(
          'Get Notification by ID',
          'GET',
          '{{base_url}}/api/notifications/{{notification_id}}',
          'Retrieves notification details.',
          null,
          { notification: { id: '23456789ab-cdef-0123-4567-89abcdef0123', title: 'Habit Reminder', is_read: false } }
        ),
        buildRequestItem(
          'Mark Notification as Read',
          'PATCH',
          '{{base_url}}/api/notifications/{{notification_id}}/read',
          'Marks a single notification as read.',
          null,
          { notification: { id: '23456789ab-cdef-0123-4567-89abcdef0123', is_read: true } }
        ),
        buildRequestItem(
          'Mark All Notifications Read',
          'POST',
          '{{base_url}}/api/notifications/mark-all-read',
          'Marks all active notifications as read.',
          null,
          { updatedCount: 3 }
        ),
        buildRequestItem(
          'Generate Due Reminders',
          'POST',
          '{{base_url}}/api/notifications/reminders/generate',
          'Triggers batch generation of due reminders (habits, tasks, bills).',
          null,
          { generatedCount: 4 }
        ),
        buildRequestItem(
          'Get Notification Channel Preferences',
          'GET',
          '{{base_url}}/api/notifications/preferences',
          'Retrieves notification delivery preferences.',
          null,
          { preferences: { email: true, inApp: true, push: true } }
        ),
        buildRequestItem(
          'Update Notification Channel Preferences',
          'PUT',
          '{{base_url}}/api/notifications/preferences',
          'Updates notification channels.',
          { email: true, inApp: true, push: false },
          { preferences: { email: true, inApp: true, push: false, updated_at: '2026-10-23T10:00:00.000Z' } }
        ),
        buildRequestItem(
          'Delete Read Notifications',
          'DELETE',
          '{{base_url}}/api/notifications/read',
          'Clears all read notifications from inbox.',
          null,
          { deletedCount: 5 }
        ),
        buildRequestItem(
          'Delete Notification by ID',
          'DELETE',
          '{{base_url}}/api/notifications/{{notification_id}}',
          'Deletes a specific notification.',
          null,
          { deleted: true }
        ),
      ],
    },

    // 17. Synchronization
    {
      name: 'Synchronization',
      description: 'Offline-first client synchronization: device registration, sync status checking, incremental change pulls, and conflict-resolved pushes.',
      items: [
        buildRequestItem(
          'Register Device',
          'POST',
          '{{base_url}}/api/sync/devices',
          'Registers a mobile or desktop client device for sync tracking.',
          { deviceName: 'MacBook Pro 16', deviceType: 'desktop', clientVersion: '1.0.0' },
          { device: { id: '3456789abc-def0-1234-5678-9abcdef01234', device_name: 'MacBook Pro 16', last_synced_at: '2026-10-23T10:00:00.000Z' } },
          false,
          ['if (json.data && json.data.device) pm.environment.set("device_id", json.data.device.id);']
        ),
        buildRequestItem(
          'List Devices',
          'GET',
          '{{base_url}}/api/sync/devices',
          'Lists all registered user devices and their last sync timestamps.',
          null,
          { devices: [{ id: '3456789abc-def0-1234-5678-9abcdef01234', device_name: 'MacBook Pro 16' }] }
        ),
        buildRequestItem(
          'Get Device Details',
          'GET',
          '{{base_url}}/api/sync/devices/{{device_id}}',
          'Retrieves metadata for a registered device.',
          null,
          { device: { id: '3456789abc-def0-1234-5678-9abcdef01234', device_name: 'MacBook Pro 16' } }
        ),
        buildRequestItem(
          'Get Sync Status',
          'GET',
          '{{base_url}}/api/sync/status?deviceId={{device_id}}',
          'Checks server change sequence number and pending sync records.',
          null,
          { syncStatus: { currentServerSeq: 142, lastDeviceSyncedSeq: 135, hasPendingChanges: true } }
        ),
        buildRequestItem(
          'Pull Incremental Sync',
          'POST',
          '{{base_url}}/api/sync/pull',
          'Pulls all changes made since the device last synced sequence number.',
          { deviceId: '{{device_id}}', lastSyncedSeq: 135, limit: 100 },
          { changes: [{ table: 'habits', action: 'update', data: { id: '33333333-4444-5555-6666-777777777777' } }], serverSeq: 142 }
        ),
        buildRequestItem(
          'Push Offline Changes',
          'POST',
          '{{base_url}}/api/sync/push',
          'Pushes local offline changes with client timestamps for server reconciliation.',
          { deviceId: '{{device_id}}', mutations: [{ table: 'habit_logs', action: 'insert', payload: { log_date: '2026-10-23', status: 'completed' } }] },
          { appliedCount: 1, conflicts: [] }
        ),
        buildRequestItem(
          'Unregister Device',
          'DELETE',
          '{{base_url}}/api/sync/devices/{{device_id}}',
          'Unregisters a device and revokes its sync credentials.',
          null,
          { unregistered: true }
        ),
      ],
    },

    // 18. Data Management
    {
      name: 'Data Management',
      description: 'Data portability & backups: complete or modular JSON/CSV exports, export file downloads, and backup restore imports.',
      items: [
        buildRequestItem(
          'Request Data Export',
          'POST',
          '{{base_url}}/api/data/exports',
          'Initiates an asynchronous export of user data (all modules or filtered scope).',
          { format: 'json', scope: 'all' },
          { export: { id: '456789abcd-ef01-2345-6789-abcdef012345', status: 'processing', format: 'json' } },
          false,
          ['if (json.data && json.data.export) pm.environment.set("export_id", json.data.export.id);']
        ),
        buildRequestItem(
          'List Data Exports',
          'GET',
          '{{base_url}}/api/data/exports?page=1&limit=10',
          'Lists data export jobs and statuses.',
          null,
          { exports: [{ id: '456789abcd-ef01-2345-6789-abcdef012345', status: 'completed', file_size: 204800 }] },
          true
        ),
        buildRequestItem(
          'Get Export Status',
          'GET',
          '{{base_url}}/api/data/exports/{{export_id}}',
          'Checks status and download expiration for an export job.',
          null,
          { export: { id: '456789abcd-ef01-2345-6789-abcdef012345', status: 'completed', download_url: '{{base_url}}/api/data/exports/{{export_id}}/download' } }
        ),
        buildRequestItem(
          'Download Export File',
          'GET',
          '{{base_url}}/api/data/exports/{{export_id}}/download',
          'Downloads generated export file.',
          null,
          { downloadUrl: 'https://storage.example.com/exports/user-export.json' }
        ),
        buildRequestItem(
          'Request Data Import',
          'POST',
          '{{base_url}}/api/data/imports',
          'Uploads and initiates restore from a valid LifeTracker backup file.',
          { importData: { habits: [], tasks: [], notes: [] }, mode: 'merge' },
          { import: { id: '56789abcde-f012-3456-789a-bcdef0123456', status: 'processing' } },
          false,
          ['if (json.data && json.data.import) pm.environment.set("import_id", json.data.import.id);']
        ),
        buildRequestItem(
          'List Data Imports',
          'GET',
          '{{base_url}}/api/data/imports?page=1&limit=10',
          'Lists historical data import jobs.',
          null,
          { imports: [{ id: '56789abcde-f012-3456-789a-bcdef0123456', status: 'completed', records_imported: 150 }] },
          true
        ),
        buildRequestItem(
          'Get Import Status',
          'GET',
          '{{base_url}}/api/data/imports/{{import_id}}',
          'Checks progress of a data import job.',
          null,
          { import: { id: '56789abcde-f012-3456-789a-bcdef0123456', status: 'completed', records_imported: 150 } }
        ),
      ],
    },

    // 19. Health
    {
      name: 'Health',
      description: 'API service liveness and diagnostic probe.',
      items: [
        buildRequestItem(
          'API Health Check',
          'GET',
          '{{base_url}}/api/health',
          'Verifies backend service liveness, uptime, environment, and version.',
          null,
          { status: 'ok', service: 'dailyos-api', environment: 'development', version: '1.0.0' }
        ),
      ],
    },
  ];

  // 4. Construct Consolidated Collection
  const updatedCollection = {
    info: {
      _postman_id: existingColl.info._postman_id || '9b8a7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4',
      name: 'LifeTracker',
      description:
        'Standardized API collection for LifeTracker backend (Habits, Expenses, Tasks, Analytics, Health, Reviews, Learning, Sync). Every endpoint strictly returns the centralized 8-field envelope.',
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
        script: {
          type: 'text/javascript',
          exec: [
            "// Pre-request: Calculate today's date in user timezone",
            "var tz = pm.environment.get('timezone') || 'Asia/Kolkata';",
            "var today;",
            "try {",
            "    today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());",
            "} catch (e) {",
            "    today = new Date().toISOString().slice(0, 10);",
            "}",
            "pm.environment.set('today', today);",
            "pm.collectionVariables.set('today', today);",
          ],
        },
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "// Collection-level Test: Centralized Standardized Response Envelope Verification",
            "var contentType = pm.response.headers.get('content-type');",
            "if (contentType && contentType.includes('application/json')) {",
            "    var json = pm.response.json();",
            "",
            "    pm.test('Centralized Envelope: Success & Status Match', function () {",
            "        pm.expect(json).to.be.an('object');",
            "        pm.expect(json).to.have.property('success');",
            "        pm.expect(json.success).to.be.a('boolean');",
            "        if (pm.response.code >= 200 && pm.response.code < 300) {",
            "            pm.expect(json.success).to.be.true;",
            "        } else if (pm.response.code >= 400) {",
            "            pm.expect(json.success).to.be.false;",
            "            pm.expect(json.data, 'data must be null on error').to.be.null;",
            "        }",
            "    });",
            "",
            "    pm.test('Centralized Envelope: Metadata & Timestamps Present', function () {",
            "        pm.expect(json).to.have.property('message').that.is.a('string');",
            "        pm.expect(json).to.have.property('path').that.is.a('string');",
            "        pm.expect(json).to.have.property('api_timestamp').that.is.a('string');",
            "        pm.expect(json).to.have.property('requestedTime').that.is.a('string');",
            "        pm.expect(json).to.have.property('updated_at');",
            "        pm.expect(json).to.have.property('pagination');",
            "    });",
            "",
            "    if (json.pagination !== null && json.pagination !== undefined) {",
            "        pm.test('Centralized Envelope: Pagination Metadata Structure', function () {",
            "            pm.expect(json.pagination).to.be.an('object');",
            "            pm.expect(json.pagination).to.have.property('totalItems').that.is.a('number');",
            "            pm.expect(json.pagination).to.have.property('totalPages').that.is.a('number');",
            "            pm.expect(json.pagination).to.have.property('currentPage').that.is.a('number');",
            "            pm.expect(json.pagination).to.have.property('pageSize').that.is.a('number');",
            "        });",
            "    }",
            "",
            "    // Automatic Token & ID Capture from json.data",
            "    if (json.data && typeof json.data === 'object') {",
            "        var d = json.data;",
            "        var accessToken = d.accessToken || d.access_token;",
            "        if (accessToken) {",
            "            pm.environment.set('access_token', accessToken);",
            "            pm.environment.set('accessToken', accessToken);",
            "        }",
            "        var refreshToken = d.refreshToken || d.refresh_token;",
            "        if (refreshToken) {",
            "            pm.environment.set('refresh_token', refreshToken);",
            "            pm.environment.set('refreshToken', refreshToken);",
            "        }",
            "        if (d.user && d.user.id) pm.environment.set('user_id', d.user.id);",
            "        if (d.category && d.category.id) pm.environment.set('category_id', d.category.id);",
            "        if (d.habit && d.habit.id) pm.environment.set('habit_id', d.habit.id);",
            "        if (d.schedule && d.schedule.id) pm.environment.set('schedule_id', d.schedule.id);",
            "        if (d.log && d.log.id) pm.environment.set('habit_log_id', d.log.id);",
            "        if (d.reminder && d.reminder.id) pm.environment.set('reminder_id', d.reminder.id);",
            "        if (d.task && d.task.id) pm.environment.set('task_id', d.task.id);",
            "        if (d.subtask && d.subtask.id) pm.environment.set('subtask_id', d.subtask.id);",
            "        if (d.recurrence && d.recurrence.id) pm.environment.set('recurrence_id', d.recurrence.id);",
            "        if (d.priority && d.priority.id) pm.environment.set('priority_id', d.priority.id);",
            "        if (d.intention && d.intention.id) pm.environment.set('intention_id', d.intention.id);",
            "        if (d.note && d.note.id) pm.environment.set('note_id', d.note.id);",
            "        if (d.noteCategory && d.noteCategory.id) pm.environment.set('note_category_id', d.noteCategory.id);",
            "        if (d.learning && d.learning.id) pm.environment.set('learning_id', d.learning.id);",
            "        if (d.review && d.review.id) pm.environment.set('review_id', d.review.id);",
            "        if (d.account && d.account.id) pm.environment.set('account_id', d.account.id);",
            "        if (d.holding && d.holding.id) pm.environment.set('holding_id', d.holding.id);",
            "        if (d.budget && d.budget.id) pm.environment.set('budget_id', d.budget.id);",
            "        if (d.financialGoal && d.financialGoal.id) pm.environment.set('financial_goal_id', d.financialGoal.id);",
            "        if (d.goal && d.goal.id) pm.environment.set('goal_id', d.goal.id);",
            "        if (d.liability && d.liability.id) pm.environment.set('liability_id', d.liability.id);",
            "        if (d.notification && d.notification.id) pm.environment.set('notification_id', d.notification.id);",
            "        if (d.device && d.device.id) pm.environment.set('device_id', d.device.id);",
            "    }",
            "}",
          ],
        },
      },
    ],
    variable: [
      {
        key: 'today',
        value: '2026-10-23',
        type: 'string',
      },
    ],
    item: folders.map((f: any) => ({
      name: f.name,
      description: f.description,
      item: f.items || f.item,
    })),
  };

  // 5. Update Environment File
  const envVars = [
    { key: 'base_url', value: 'http://localhost:5001', type: 'default', enabled: true },
    { key: 'baseUrl', value: 'http://localhost:5001', type: 'default', enabled: true },
    { key: 'access_token', value: '', type: 'secret', enabled: true },
    { key: 'accessToken', value: '', type: 'secret', enabled: true },
    { key: 'refresh_token', value: '', type: 'secret', enabled: true },
    { key: 'refreshToken', value: '', type: 'secret', enabled: true },
    { key: 'user_id', value: '', type: 'default', enabled: true },
    { key: 'session_id', value: '', type: 'default', enabled: true },
    { key: 'measurement_id', value: '', type: 'default', enabled: true },
    { key: 'goal_id', value: '', type: 'default', enabled: true },
    { key: 'financial_goal_id', value: '', type: 'default', enabled: true },
    { key: 'goal_contribution_id', value: '', type: 'default', enabled: true },
    { key: 'category_id', value: '', type: 'default', enabled: true },
    { key: 'habit_id', value: '', type: 'default', enabled: true },
    { key: 'schedule_id', value: '', type: 'default', enabled: true },
    { key: 'habit_log_id', value: '', type: 'default', enabled: true },
    { key: 'reminder_id', value: '', type: 'default', enabled: true },
    { key: 'task_id', value: '', type: 'default', enabled: true },
    { key: 'subtask_id', value: '', type: 'default', enabled: true },
    { key: 'recurrence_id', value: '', type: 'default', enabled: true },
    { key: 'priority_id', value: '', type: 'default', enabled: true },
    { key: 'intention_id', value: '', type: 'default', enabled: true },
    { key: 'note_id', value: '', type: 'default', enabled: true },
    { key: 'note_category_id', value: '', type: 'default', enabled: true },
    { key: 'learning_id', value: '', type: 'default', enabled: true },
    { key: 'learning_review_id', value: '', type: 'default', enabled: true },
    { key: 'review_id', value: '', type: 'default', enabled: true },
    { key: 'review_action_id', value: '', type: 'default', enabled: true },
    { key: 'account_id', value: '', type: 'default', enabled: true },
    { key: 'financial_category_id', value: '', type: 'default', enabled: true },
    { key: 'transaction_id', value: '', type: 'default', enabled: true },
    { key: 'transfer_group_id', value: '', type: 'default', enabled: true },
    { key: 'salary_id', value: '', type: 'default', enabled: true },
    { key: 'holding_id', value: '', type: 'default', enabled: true },
    { key: 'investment_transaction_id', value: '', type: 'default', enabled: true },
    { key: 'recurring_payment_id', value: '', type: 'default', enabled: true },
    { key: 'budget_id', value: '', type: 'default', enabled: true },
    { key: 'liability_id', value: '', type: 'default', enabled: true },
    { key: 'snapshot_id', value: '', type: 'default', enabled: true },
    { key: 'export_id', value: '', type: 'default', enabled: true },
    { key: 'import_id', value: '', type: 'default', enabled: true },
    { key: 'attachment_id', value: '', type: 'default', enabled: true },
    { key: 'notification_id', value: '', type: 'default', enabled: true },
    { key: 'device_id', value: '', type: 'default', enabled: true },
    { key: 'timezone', value: 'Asia/Kolkata', type: 'default', enabled: true },
    { key: 'today', value: '2026-10-23', type: 'default', enabled: true },
    { key: 'period', value: 'week', type: 'default', enabled: true },
  ];

  const updatedEnvironment = {
    id: existingEnv.id || 'e1d2c3b4-a5f6-47a8-b9c0-9d8e7f6a5b4c',
    name: 'LifeTracker',
    values: envVars,
    _postman_variable_scope: 'environment',
  };

  // 6. Write and Sync to documentation/ and docs/
  let totalRequestsCount = 0;
  folders.forEach((f) => {
    totalRequestsCount += f.items.length;
    console.log(`Folder "${f.name}": ${f.items.length} requests (flat, 0 subfolders)`);
  });

  console.log(`\nTotal Folders: ${folders.length}`);
  console.log(`Total Requests: ${totalRequestsCount}`);
  console.log(`Total Environment Variables: ${envVars.length}`);

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, COLLECTION_FILE), JSON.stringify(updatedCollection, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dir, ENVIRONMENT_FILE), JSON.stringify(updatedEnvironment, null, 2), 'utf-8');
    console.log(`Synchronized standardized files to: ${dir}`);
  }
};

if (require.main === module) {
  runStandardization();
}
