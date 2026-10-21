import fs from 'node:fs';
import path from 'node:path';

const generatePostmanFiles = () => {
  const collection = {
    info: {
      _postman_id: 'a9b2c3d4-e5f6-47a8-b9c0-1d2e3f4a5b6c',
      name: 'Authentication & Profile APIs',
      description: 'Complete API Collection for DailyOS Authentication and User Profile Management modules.',
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
    item: [
      {
        name: 'Authentication',
        description: 'Authentication module endpoints: register, login, Google sign-in, refresh token, logout, email verification, password management, and active session management.',
        item: [
          {
            name: 'Register User',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 201 Created", function () {',
                    '    pm.response.to.have.status(201);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.user && jsonData.user.id) {',
                    '    pm.environment.set("user_id", jsonData.user.id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    email: 'alex.smith@example.com',
                    password: 'SecurePassword123!',
                    firstName: 'Alex',
                    lastName: 'Smith',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/register',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'register'],
              },
              description: 'Register a new user using email and password. Normalizes email and hashes password with Argon2id.',
            },
            response: [
              {
                name: '201 Created',
                originalRequest: {
                  method: 'POST',
                  header: [{ key: 'Content-Type', value: 'application/json' }],
                  body: {
                    mode: 'raw',
                    raw: '{\n  "email": "alex.smith@example.com",\n  "password": "SecurePassword123!",\n  "firstName": "Alex",\n  "lastName": "Smith"\n}',
                  },
                  url: {
                    raw: '{{base_url}}/api/auth/register',
                    host: ['{{base_url}}'],
                    path: ['api', 'auth', 'register'],
                  },
                },
                status: 'Created',
                code: 201,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    message: 'Registration successful. Please verify your email address.',
                    user: {
                      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      email: 'alex.smith@example.com',
                      status: 'active',
                      onboardingCompleted: false,
                      createdAt: '2026-10-19T12:00:00.000Z',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Login User',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.accessToken) {',
                    '    pm.environment.set("access_token", jsonData.accessToken);',
                    '}',
                    'if (jsonData.refreshToken) {',
                    '    pm.environment.set("refresh_token", jsonData.refreshToken);',
                    '}',
                    'if (jsonData.user && jsonData.user.id) {',
                    '    pm.environment.set("user_id", jsonData.user.id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'X-Device-Name', value: 'MacBook Pro Chrome', disabled: true },
                { key: 'X-Device-Type', value: 'desktop', disabled: true },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    email: 'alex.smith@example.com',
                    password: 'SecurePassword123!',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/login',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'login'],
              },
              description: 'Authenticate user with email and password. Returns access token and rotating refresh token, and sets secure HTTP-only refresh cookie.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: '3b98e1a7b82c4f6990d0ef04c867201b17b2e3...',
                    user: {
                      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      email: 'alex.smith@example.com',
                      status: 'active',
                      onboardingCompleted: false,
                      emailVerifiedAt: null,
                      displayName: 'Alex Smith',
                      profilePhotoUrl: null,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Google Sign-In',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.accessToken) {',
                    '    pm.environment.set("access_token", jsonData.accessToken);',
                    '}',
                    'if (jsonData.refreshToken) {',
                    '    pm.environment.set("refresh_token", jsonData.refreshToken);',
                    '}',
                    'if (jsonData.user && jsonData.user.id) {',
                    '    pm.environment.set("user_id", jsonData.user.id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/google',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'google'],
              },
              description: 'Authenticates user via verified Google ID token. Finds or creates the user and auth account securely.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: '9f8e7d6c5b4a3210...',
                    user: {
                      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      email: 'alex.smith@gmail.com',
                      status: 'active',
                      onboardingCompleted: false,
                      emailVerifiedAt: '2026-10-19T12:00:00.000Z',
                      displayName: 'Alex Smith',
                      profilePhotoUrl: 'https://lh3.googleusercontent.com/a/photo.jpg',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Refresh Token',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.accessToken) {',
                    '    pm.environment.set("access_token", jsonData.accessToken);',
                    '}',
                    'if (jsonData.refreshToken) {',
                    '    pm.environment.set("refresh_token", jsonData.refreshToken);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    refreshToken: '{{refresh_token}}',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/refresh-token',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'refresh-token'],
              },
              description: 'Validates existing refresh token, rotates tokens, revokes the previous session, and returns new credentials.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'c4d5e6f7a8b90123...',
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Logout',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    refreshToken: '{{refresh_token}}',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/logout',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'logout'],
              },
              description: 'Revokes the current session and clears HTTP-only refresh cookies without affecting other devices.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Logged out successfully.' }, null, 2),
              },
            ],
          },
          {
            name: 'Logout From All Devices',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              url: {
                raw: '{{base_url}}/api/auth/logout-all',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'logout-all'],
              },
              description: 'Revokes all active sessions across all devices for the authenticated user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'All active sessions have been revoked successfully.' }, null, 2),
              },
            ],
          },
          {
            name: 'Verify Email',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    token: 'd41d8cd98f00b204e9800998ecf8427e',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/verify-email',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'verify-email'],
              },
              description: 'Verifies email address using the single-use verification token sent to user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Email verified successfully. You may now log in.' }, null, 2),
              },
            ],
          },
          {
            name: 'Forgot Password',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    email: 'alex.smith@example.com',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/forgot-password',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'forgot-password'],
              },
              description: 'Requests a password reset link. Returns an identical success message even if the email does not exist to prevent account enumeration.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    message: 'If an account with that email exists, a password reset link has been sent.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Reset Password',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              auth: { type: 'noauth' },
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    token: 'reset_token_hex_string',
                    newPassword: 'BrandNewSecurePassword456!',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/reset-password',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'reset-password'],
              },
              description: 'Validates reset token, updates password with Argon2id, and revokes all active sessions.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    message: 'Password has been reset successfully. Please log in with your new password.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Current User',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'pm.test("User object returned", function () {',
                    '    pm.expect(jsonData.id).to.not.be.empty;',
                    '    pm.expect(jsonData.email).to.not.be.empty;',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/auth/me',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'me'],
              },
              description: 'Returns basic account and profile info for the currently authenticated user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    email: 'alex.smith@example.com',
                    emailVerifiedAt: '2026-10-19T12:00:00.000Z',
                    status: 'active',
                    onboardingCompleted: false,
                    createdAt: '2026-10-19T12:00:00.000Z',
                    profile: {
                      firstName: 'Alex',
                      lastName: 'Smith',
                      displayName: 'Alex Smith',
                      profilePhotoUrl: null,
                      country: 'United States',
                      preferredLanguage: 'en',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Password',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    currentPassword: 'SecurePassword123!',
                    newPassword: 'BrandNewSecurePassword456!',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/auth/update-password',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'update-password'],
              },
              description: 'Allows an authenticated user to update their password after verifying their current password.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Password updated successfully.' }, null, 2),
              },
            ],
          },
          {
            name: 'Get Active Sessions',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.sessions && jsonData.sessions.length > 0) {',
                    '    pm.environment.set("session_id", jsonData.sessions[0].id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/auth/sessions',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'sessions'],
              },
              description: 'Returns all active login sessions and device details for the authenticated user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    sessions: [
                      {
                        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
                        deviceName: 'MacBook Pro Chrome',
                        deviceType: 'desktop',
                        lastIp: '127.0.0.1',
                        createdAt: '2026-10-19T12:00:00.000Z',
                        expiresAt: '2026-10-26T12:00:00.000Z',
                        isCurrent: true,
                      },
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Revoke Specific Session',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'DELETE',
              url: {
                raw: '{{base_url}}/api/auth/sessions/:id',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'sessions', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{session_id}}',
                    description: 'The UUID of the session to revoke',
                  },
                ],
              },
              description: 'Revokes a specific active session belonging to the user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Session revoked successfully.' }, null, 2),
              },
            ],
          },
        ],
      },
      {
        name: 'Profile',
        description: 'Profile module endpoints: personal profile, health profile, body measurements, professional profile, lifestyle profile, personal goals, and complete unified profile.',
        item: [
          {
            name: 'Get Complete Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'pm.test("Contains unified sections", function () {',
                    '    pm.expect(jsonData.userId).to.not.be.empty;',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/complete',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'complete'],
              },
              description: 'Retrieves the complete user profile combining personal information, dynamically computed age, health, latest body measurement, professional details, lifestyle details, and personal goals.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    email: 'alex.smith@example.com',
                    emailVerifiedAt: '2026-10-19T12:00:00.000Z',
                    status: 'active',
                    onboardingCompleted: false,
                    personal: {
                      id: 'uuid',
                      first_name: 'Alex',
                      last_name: 'Smith',
                      display_name: 'Alex Smith',
                      date_of_birth: '1995-06-15',
                      age: 31,
                      gender: 'female',
                      country: 'United States',
                      city: 'San Francisco',
                      preferred_language: 'en',
                    },
                    health: {
                      height_value: '175.00',
                      height_unit: 'cm',
                      current_weight: '70.00',
                      weight_unit: 'kg',
                      activity_level: 'moderately_active',
                    },
                    latestMeasurement: {
                      weight: '70.00',
                      height: '175.00',
                      bmi: '22.86',
                      recorded_at: '2026-10-19T12:00:00.000Z',
                    },
                    professional: {
                      occupation: 'Software Architect',
                      employment_status: 'Full-time',
                      company_name: 'Tech Corp',
                    },
                    lifestyle: {
                      work_mode: 'hybrid',
                      dietary_preference: 'Mediterranean',
                    },
                    goals: [],
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Personal Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/personal',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'personal'],
              },
              description: 'Retrieves personal profile information. Calculates age dynamically from date_of_birth without permanent storage.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    profile: {
                      id: 'uuid',
                      user_id: 'uuid',
                      first_name: 'Alex',
                      last_name: 'Smith',
                      display_name: 'Alex Smith',
                      profile_photo_url: 'https://images.example.com/avatar.png',
                      date_of_birth: '1995-06-15',
                      gender: 'female',
                      pronouns: 'she/her',
                      phone_number: '+15551234567',
                      country_code: '+1',
                      country: 'United States',
                      state: 'California',
                      city: 'San Francisco',
                      bio: 'Full-stack software engineer & avid reader.',
                      preferred_language: 'en',
                      created_at: '2026-10-19T12:00:00.000Z',
                      updated_at: '2026-10-19T12:00:00.000Z',
                      age: 31,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Personal Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    firstName: 'Alex',
                    lastName: 'Smith',
                    displayName: 'Alex S.',
                    dateOfBirth: '1995-06-15',
                    gender: 'female',
                    pronouns: 'she/her',
                    phoneNumber: '+15551234567',
                    countryCode: '+1',
                    country: 'United States',
                    state: 'California',
                    city: 'San Francisco',
                    bio: 'Full-stack software engineer & marathon runner.',
                    preferredLanguage: 'en',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/personal',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'personal'],
              },
              description: 'Creates or updates personal profile fields independently.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    profile: {
                      id: 'uuid',
                      user_id: 'uuid',
                      first_name: 'Alex',
                      last_name: 'Smith',
                      display_name: 'Alex S.',
                      date_of_birth: '1995-06-15',
                      age: 31,
                      gender: 'female',
                      country: 'United States',
                      city: 'San Francisco',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Profile Photo',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    profilePhotoUrl: 'https://images.example.com/avatar.png',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/personal/photo',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'personal', 'photo'],
              },
              description: 'Updates profile photo URL for the authenticated user.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    message: 'Profile photo updated successfully.',
                    profilePhotoUrl: 'https://images.example.com/avatar.png',
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Health Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/health',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'health'],
              },
              description: 'Retrieves optional health and wellness profile information.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    health: {
                      id: 'uuid',
                      user_id: 'uuid',
                      height_value: '175.00',
                      height_unit: 'cm',
                      current_weight: '70.00',
                      weight_unit: 'kg',
                      blood_group: 'O+',
                      activity_level: 'moderately_active',
                      fitness_level: 'intermediate',
                      dietary_preference: 'Mediterranean',
                      food_allergies: ['peanuts'],
                      sleep_target_hours: '8.00',
                      water_target_ml: 2500,
                      daily_step_target: 10000,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Health Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    heightValue: 175.0,
                    heightUnit: 'cm',
                    currentWeight: 70.0,
                    weightUnit: 'kg',
                    bloodGroup: 'O+',
                    activityLevel: 'moderately_active',
                    fitnessLevel: 'intermediate',
                    dietaryPreference: 'Mediterranean',
                    foodAllergies: ['peanuts', 'shellfish'],
                    sleepTargetHours: 8.0,
                    averageSleepHours: 7.5,
                    waterTargetMl: 2500,
                    exerciseFrequency: '4 times weekly',
                    healthNotes: 'None',
                    fitnessObjectives: ['Cardio health', 'Muscle tone'],
                    preferredWorkoutTypes: ['Running', 'Weightlifting'],
                    dailyStepTarget: 10000,
                    wakeUpTime: '06:30',
                    sleepTime: '22:30',
                    dietaryRestrictions: ['Low refined sugar'],
                    wellnessPreferences: ['Daily hydration tracking'],
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/health',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'health'],
              },
              description: 'Creates or updates user health profile and wellness goals.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    health: {
                      id: 'uuid',
                      user_id: 'uuid',
                      height_value: '175.00',
                      height_unit: 'cm',
                      current_weight: '70.00',
                      weight_unit: 'kg',
                      blood_group: 'O+',
                      activity_level: 'moderately_active',
                      fitness_level: 'intermediate',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Delete Health Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'DELETE',
              url: {
                raw: '{{base_url}}/api/profiles/health',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'health'],
              },
              description: 'Deletes health profile upon user request.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Health profile deleted successfully.' }, null, 2),
              },
            ],
          },
          {
            name: 'Add Body Measurement',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 201 Created", function () {',
                    '    pm.response.to.have.status(201);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.measurement && jsonData.measurement.id) {',
                    '    pm.environment.set("measurement_id", jsonData.measurement.id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    weight: 70.0,
                    height: 175.0,
                    waist: 78.0,
                    chest: 96.0,
                    hips: 94.0,
                    bodyFatPercentage: 18.5,
                    recordedAt: '2026-10-19T07:30:00.000Z',
                    notes: 'Morning measurement before breakfast',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/measurements',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'measurements'],
              },
              description: 'Adds a historical body measurement record. Automatically calculates BMI from weight and height without overwriting past entries.',
            },
            response: [
              {
                name: '201 Created',
                status: 'Created',
                code: 201,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    measurement: {
                      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      weight: '70.00',
                      height: '175.00',
                      bmi: '22.86',
                      waist: '78.00',
                      chest: '96.00',
                      hips: '94.00',
                      body_fat_percentage: '18.50',
                      recorded_at: '2026-10-19T07:30:00.000Z',
                      notes: 'Morning measurement before breakfast',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Body Measurements History',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.data && jsonData.data.length > 0) {',
                    '    pm.environment.set("measurement_id", jsonData.data[0].id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/measurements?page=1&limit=10',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'measurements'],
                query: [
                  { key: 'page', value: '1', description: 'Page number (default: 1)' },
                  { key: 'limit', value: '10', description: 'Records per page (default: 10)' },
                ],
              },
              description: 'Retrieves chronological body measurement history with pagination.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    data: [
                      {
                        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                        weight: '70.00',
                        height: '175.00',
                        bmi: '22.86',
                        recorded_at: '2026-10-19T07:30:00.000Z',
                      },
                    ],
                    pagination: {
                      page: 1,
                      limit: 10,
                      total: 1,
                      totalPages: 1,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Body Measurement',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    weight: 71.0,
                    waist: 77.5,
                    notes: 'Post-workout adjustment',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/measurements/:id',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'measurements', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{measurement_id}}',
                    description: 'UUID of the body measurement record',
                  },
                ],
              },
              description: 'Updates a specific historical measurement record. Re-calculates BMI if weight/height changes.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    measurement: {
                      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                      weight: '71.00',
                      bmi: '23.18',
                      waist: '77.50',
                      notes: 'Post-workout adjustment',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Delete Body Measurement',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'DELETE',
              url: {
                raw: '{{base_url}}/api/profiles/measurements/:id',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'measurements', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{measurement_id}}',
                    description: 'UUID of the measurement to delete',
                  },
                ],
              },
              description: 'Deletes a specific body measurement record.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Measurement record deleted successfully.' }, null, 2),
              },
            ],
          },
          {
            name: 'Get Professional Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/professional',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'professional'],
              },
              description: 'Retrieves career and education profile.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    professional: {
                      id: 'uuid',
                      user_id: 'uuid',
                      occupation: 'Senior Software Engineer',
                      employment_status: 'Full-time',
                      company_name: 'Tech Innovations Inc',
                      industry: 'Information Technology',
                      experience_years: '6.5',
                      education_level: "Master's Degree",
                      highest_qualification: 'M.S. in Computer Science',
                      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
                      career_goal: 'Become Principal Architect',
                      work_start_time: '09:00:00',
                      work_end_time: '17:30:00',
                      work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Professional Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    occupation: 'Senior Software Engineer',
                    employmentStatus: 'Full-time',
                    companyName: 'Tech Innovations Inc',
                    industry: 'Information Technology',
                    experienceYears: 6.5,
                    educationLevel: "Master's Degree",
                    highestQualification: 'M.S. in Computer Science',
                    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
                    careerGoal: 'Become Principal Architect',
                    workStartTime: '09:00',
                    workEndTime: '17:30',
                    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/professional',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'professional'],
              },
              description: 'Creates or updates career and education details.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    professional: {
                      occupation: 'Senior Software Engineer',
                      company_name: 'Tech Innovations Inc',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Lifestyle Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/lifestyle',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'lifestyle'],
              },
              description: 'Retrieves lifestyle and daily routine profile.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    lifestyle: {
                      id: 'uuid',
                      user_id: 'uuid',
                      wake_up_time: '06:30:00',
                      sleep_time: '22:30:00',
                      work_mode: 'hybrid',
                      exercise_days: ['Monday', 'Wednesday', 'Friday'],
                      preferred_exercise: ['Running', 'Gym'],
                      dietary_preference: 'Mediterranean',
                      smoking_status: 'non-smoker',
                      alcohol_preference: 'occasional',
                      hobbies: ['Photography', 'Hiking', 'Chess'],
                      personal_interests: ['AI', 'Philosophy', 'Space'],
                      lifestyle_notes: 'Consistent circadian rhythm target',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Lifestyle Profile',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    wakeUpTime: '06:30',
                    sleepTime: '22:30',
                    workMode: 'hybrid',
                    exerciseDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
                    preferredExercise: ['Running', 'Weightlifting', 'Yoga'],
                    dietaryPreference: 'Mediterranean',
                    smokingStatus: 'non-smoker',
                    alcoholPreference: 'occasional',
                    hobbies: ['Photography', 'Hiking', 'Chess'],
                    personalInterests: ['AI', 'Philosophy', 'Science'],
                    lifestyleNotes: 'Consistent circadian rhythm target',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/lifestyle',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'lifestyle'],
              },
              description: 'Creates or updates daily routine, hobbies, and lifestyle information.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    lifestyle: {
                      work_mode: 'hybrid',
                      dietary_preference: 'Mediterranean',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Create Personal Goal',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 201 Created", function () {',
                    '    pm.response.to.have.status(201);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.goal && jsonData.goal.id) {',
                    '    pm.environment.set("goal_id", jsonData.goal.id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    title: 'Pass AWS Solutions Architect Professional Exam',
                    description: 'Study 10 hours weekly and complete practice exams',
                    category: 'career',
                    priority: 'high',
                    targetDate: '2026-12-31',
                    status: 'active',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/goals',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals'],
              },
              description: 'Creates a new personal goal with category (personal, career, health, learning, relationships, lifestyle, other) and priority (low, medium, high).',
            },
            response: [
              {
                name: '201 Created',
                status: 'Created',
                code: 201,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    goal: {
                      id: '8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
                      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      title: 'Pass AWS Solutions Architect Professional Exam',
                      description: 'Study 10 hours weekly and complete practice exams',
                      category: 'career',
                      priority: 'high',
                      target_date: '2026-12-31',
                      status: 'active',
                      created_at: '2026-10-19T12:00:00.000Z',
                      updated_at: '2026-10-19T12:00:00.000Z',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get All Goals',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'var jsonData = pm.response.json();',
                    'if (jsonData.data && jsonData.data.length > 0) {',
                    '    pm.environment.set("goal_id", jsonData.data[0].id);',
                    '}',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/goals?category=career&priority=high&status=active&page=1&limit=10',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals'],
                query: [
                  { key: 'category', value: 'career', description: 'Filter by category (personal, career, health, learning, relationships, lifestyle, other)' },
                  { key: 'priority', value: 'high', description: 'Filter by priority (low, medium, high)' },
                  { key: 'status', value: 'active', description: 'Filter by status (active, completed, paused, cancelled)' },
                  { key: 'page', value: '1', description: 'Page number' },
                  { key: 'limit', value: '10', description: 'Items per page' },
                ],
              },
              description: 'Lists all personal goals belonging to authenticated user with optional filtering by category, priority, status, and pagination.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    data: [
                      {
                        id: '8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
                        title: 'Pass AWS Solutions Architect Professional Exam',
                        category: 'career',
                        priority: 'high',
                        status: 'active',
                      },
                    ],
                    pagination: {
                      page: 1,
                      limit: 10,
                      total: 1,
                      totalPages: 1,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Get Goal By ID',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/profiles/goals/:id',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{goal_id}}',
                    description: 'UUID of the goal',
                  },
                ],
              },
              description: 'Retrieves a single personal goal by ID.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    goal: {
                      id: '8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
                      title: 'Pass AWS Solutions Architect Professional Exam',
                      category: 'career',
                      priority: 'high',
                      status: 'active',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Goal',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PUT',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    title: 'Pass AWS Solutions Architect (Target: 90%+ score)',
                    priority: 'medium',
                    targetDate: '2026-11-30',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/goals/:id',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{goal_id}}',
                    description: 'UUID of the goal to update',
                  },
                ],
              },
              description: 'Updates details of an existing goal.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    goal: {
                      id: '8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
                      title: 'Pass AWS Solutions Architect (Target: 90%+ score)',
                      priority: 'medium',
                      target_date: '2026-11-30',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Update Goal Status',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'PATCH',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    status: 'completed',
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: '{{base_url}}/api/profiles/goals/:id/status',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals', ':id', 'status'],
                variable: [
                  {
                    key: 'id',
                    value: '{{goal_id}}',
                    description: 'UUID of the goal',
                  },
                ],
              },
              description: 'Quick status update for a goal (active, completed, paused, cancelled).',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify(
                  {
                    goal: {
                      id: '8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d',
                      status: 'completed',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          },
          {
            name: 'Delete Goal',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200 OK", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'DELETE',
              url: {
                raw: '{{base_url}}/api/profiles/goals/:id',
                host: ['{{base_url}}'],
                path: ['api', 'profiles', 'goals', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: '{{goal_id}}',
                    description: 'UUID of the goal to delete',
                  },
                ],
              },
              description: 'Deletes a personal goal permanently.',
            },
            response: [
              {
                name: '200 OK',
                status: 'OK',
                code: 200,
                _postman_previewlanguage: 'json',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: JSON.stringify({ message: 'Goal deleted successfully.' }, null, 2),
              },
            ],
          },
        ],
      },
    ],
  };

  const environment = {
    id: 'e1d2c3b4-a5f6-47a8-b9c0-9d8e7f6a5b4c',
    name: 'DailyOS Local Environment',
    values: [
      {
        key: 'base_url',
        value: 'http://localhost:5001',
        type: 'default',
        enabled: true,
      },
      {
        key: 'access_token',
        value: '',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'refresh_token',
        value: '',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'user_id',
        value: '',
        type: 'default',
        enabled: true,
      },
      {
        key: 'session_id',
        value: '',
        type: 'default',
        enabled: true,
      },
      {
        key: 'measurement_id',
        value: '',
        type: 'default',
        enabled: true,
      },
      {
        key: 'goal_id',
        value: '',
        type: 'default',
        enabled: true,
      },
    ],
    _postman_variable_scope: 'environment',
  };

  // Directories to write
  const targetDirs = [
    path.join(__dirname, '../documentation'),
    path.join(__dirname, '../docs'),
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const collectionPath = path.join(dir, 'Authentication_Profile_APIs.postman_collection.json');
    const envPath = path.join(dir, 'Authentication_Profile_Environment.postman_environment.json');

    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf-8');
    fs.writeFileSync(envPath, JSON.stringify(environment, null, 2), 'utf-8');
    console.log(`Saved Postman files to: ${dir}`);
  }
};

generatePostmanFiles();
