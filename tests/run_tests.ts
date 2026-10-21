import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { newDb, DataType } from 'pg-mem';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import app from '../src/app';
import { setTestPool } from '../src/config/database';

process.env.NODE_ENV = 'test';

describe('DailyOS API - Full Verification Test Suite', { concurrency: false }, () => {
  let memDb: any;
  let testPool: Pool;

  let user1Token: string;
  let user1RefreshToken: string;
  let user1Id: string;
  let user1Email = 'alice.smith@example.com';
  let user1Password = 'StrongPassword123!';

  let user2Token: string;
  let user2Id: string;
  let user2Email = 'bob.jones@example.com';
  let user2Password = 'BobPassword456!';

  let goal1Id: string;
  let measurement1Id: string;

  before(async () => {
    memDb = newDb({ autoCreateForeignKeyIndices: true });

    memDb.registerExtension('pgcrypto', (schema: any) => {
      schema.registerFunction({
        name: 'gen_random_uuid',
        returns: DataType.uuid,
        implementation: () => crypto.randomUUID(),
      });
    });

    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
    });

    try {
      memDb.createType('inet', DataType.text);
    } catch {
      // ignore
    }

    const { Pool: MemPool } = memDb.adapters.createPg();
    testPool = new MemPool();
    setTestPool(testPool);

    const sqlPath = path.join(__dirname, '../src/database/migrations/001_create_auth_and_user_tables.sql');
    let sql = fs.readFileSync(sqlPath, 'utf-8');
    sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'DECIMAL');
    memDb.public.none(sql);
  });

  after(async () => {
    if (testPool) {
      await testPool.end();
    }
  });

  describe('Health API', () => {
    it('GET /api/health should return 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });
  });

  describe('1. Authentication Module', { concurrency: false }, () => {
    describe('Registration', () => {
      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'notanemail', password: user1Password });
        assert.equal(res.status, 400);
        assert.equal(res.body.message, 'Validation failed');
      });

      it('should reject weak password', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'valid@example.com', password: 'weak' });
        assert.equal(res.status, 400);
        assert.equal(res.body.message, 'Validation failed');
      });

      it('should successfully register a new user and create auth account & profile', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: user1Email,
            password: user1Password,
            firstName: 'Alice',
            lastName: 'Smith',
          });
        assert.equal(res.status, 201);
        assert.ok(res.body.user);
        assert.equal(res.body.user.email, user1Email.toLowerCase());
        user1Id = res.body.user.id;
      });

      it('should reject duplicate registration with 409 Conflict', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: user1Email,
            password: user1Password,
          });
        assert.equal(res.status, 409);
        assert.ok(res.body.message.includes('already exists'));
      });

      it('should register second user for multi-tenant isolation tests', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: user2Email,
            password: user2Password,
            firstName: 'Bob',
            lastName: 'Jones',
          });
        assert.equal(res.status, 201);
        user2Id = res.body.user.id;
      });
    });

    describe('Login', () => {
      it('should reject login with wrong password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: 'WrongPassword123!' });
        assert.equal(res.status, 401);
        assert.equal(res.body.message, 'Invalid email or password.');
      });

      it('should reject login for non-existent email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'nobody@example.com', password: 'SomePassword123!' });
        assert.equal(res.status, 401);
      });

      it('should log in successfully and return access & refresh tokens', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: user1Password });
        assert.equal(res.status, 200);
        assert.ok(res.body.accessToken);
        assert.ok(res.body.refreshToken);
        assert.equal(res.body.user.email, user1Email);
        assert.ok(res.headers['set-cookie']);

        user1Token = res.body.accessToken;
        user1RefreshToken = res.body.refreshToken;
      });

      it('should log in user 2 successfully', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user2Email, password: user2Password });
        assert.equal(res.status, 200);
        user2Token = res.body.accessToken;
      });
    });

    describe('Get Current User (GET /api/auth/me)', () => {
      it('should reject request without token with 401', async () => {
        const res = await request(app).get('/api/auth/me');
        assert.equal(res.status, 401);
      });

      it('should reject request with invalid token with 401', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalidtoken123');
        assert.equal(res.status, 401);
      });

      it('should return current user account & profile data with valid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.id, user1Id);
        assert.equal(res.body.email, user1Email);
        assert.ok(res.body.profile);
        assert.equal(res.body.profile.firstName, 'Alice');
      });
    });

    describe('Refresh Token Rotation', () => {
      it('should exchange valid refresh token for new tokens (rotation)', async () => {
        const res = await request(app)
          .post('/api/auth/refresh-token')
          .send({ refreshToken: user1RefreshToken });
        assert.equal(res.status, 200);
        assert.ok(res.body.accessToken);
        assert.ok(res.body.refreshToken);
        assert.notEqual(res.body.refreshToken, user1RefreshToken);

        const newAccessToken = res.body.accessToken;
        const newRefreshToken = res.body.refreshToken;

        // Old refresh token must be revoked and fail
        const replayRes = await request(app)
          .post('/api/auth/refresh-token')
          .send({ refreshToken: user1RefreshToken });
        assert.equal(replayRes.status, 401);

        user1Token = newAccessToken;
        user1RefreshToken = newRefreshToken;
      });
    });

    describe('Active Sessions & Revocation', () => {
      it('should list active user sessions', async () => {
        const res = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.sessions));
        assert.ok(res.body.sessions.length > 0);
      });

      it('should revoke a specific session', async () => {
        const listRes = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${user1Token}`);
        const sessionId = listRes.body.sessions[0].id;

        const res = await request(app)
          .delete(`/api/auth/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('revoked'));
      });
    });

    describe('Email Verification', () => {
      it('should verify email using stored verification token', async () => {
        const rawToken = 'test-verification-token-12345';
        const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await testPool.query(
          `UPDATE email_verification_tokens SET token_hash = $1 WHERE user_id = $2`,
          [hash, user1Id]
        );

        const res = await request(app)
          .post('/api/auth/verify-email')
          .send({ token: rawToken });
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('verified successfully'));

        // Second attempt must fail (single-use)
        const secondRes = await request(app)
          .post('/api/auth/verify-email')
          .send({ token: rawToken });
        assert.equal(secondRes.status, 400);
      });
    });

    describe('Password Reset Flow', () => {
      it('should handle forgot password without exposing email existence', async () => {
        const resRegistered = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: user1Email });
        assert.equal(resRegistered.status, 200);

        const resUnregistered = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'notregistered@example.com' });
        assert.equal(resUnregistered.status, 200);
        assert.equal(resRegistered.body.message, resUnregistered.body.message);
      });

      it('should reset password with valid token and invalidate old sessions', async () => {
        const rawResetToken = 'test-reset-token-98765';
        const hash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
        await testPool.query(
          `UPDATE password_reset_tokens SET token_hash = $1 WHERE user_id = $2`,
          [hash, user1Id]
        );

        const newPass = 'BrandNewPassword789!';
        const res = await request(app)
          .post('/api/auth/reset-password')
          .send({ token: rawResetToken, newPassword: newPass });
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('reset successfully'));

        // Old password fails
        const oldLoginRes = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: user1Password });
        assert.equal(oldLoginRes.status, 401);

        // New password succeeds
        const newLoginRes = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: newPass });
        assert.equal(newLoginRes.status, 200);
        user1Token = newLoginRes.body.accessToken;
        user1Password = newPass;
      });
    });

    describe('Update Password', () => {
      it('should reject invalid current password', async () => {
        const res = await request(app)
          .post('/api/auth/update-password')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            currentPassword: 'IncorrectPassword1!',
            newPassword: 'AnotherPassword321!',
          });
        assert.equal(res.status, 400);
        assert.ok(res.body.message.includes('Incorrect current password'));
      });

      it('should update password with correct current password', async () => {
        const updatedPass = 'AnotherPassword321!';
        const res = await request(app)
          .post('/api/auth/update-password')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            currentPassword: user1Password,
            newPassword: updatedPass,
          });
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('updated successfully'));
        user1Password = updatedPass;
      });
    });

    describe('Logout & Logout All', () => {
      it('should logout and clear refresh cookie', async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('Logged out'));
      });

      it('should revoke all active sessions for user', async () => {
        const res = await request(app)
          .post('/api/auth/logout-all')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('All active sessions have been revoked'));
      });
    });
  });

  describe('2. User Profile Module', { concurrency: false }, () => {
    it('should authenticate user 1 and user 2 for profile tests', async () => {
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: user1Email, password: user1Password });
      assert.equal(login1.status, 200);
      user1Token = login1.body.accessToken;

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ email: user2Email, password: user2Password });
      assert.equal(login2.status, 200);
      user2Token = login2.body.accessToken;
    });

    describe('Personal Profile', () => {
      it('PUT /api/profiles/personal should update personal info and calculate age dynamically', async () => {
        const res = await request(app)
          .put('/api/profiles/personal')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            firstName: 'Alice',
            lastName: 'Wonderland',
            dateOfBirth: '1995-06-15',
            gender: 'female',
            pronouns: 'she/her',
            country: 'Canada',
            city: 'Toronto',
            bio: 'Software engineer and productivity enthusiast.',
          });
        assert.equal(res.status, 200);
        assert.equal(res.body.profile.first_name, 'Alice');
        assert.equal(res.body.profile.country, 'Canada');
        assert.equal(typeof res.body.profile.age, 'number');
        assert.ok(res.body.profile.age > 25);
      });

      it('GET /api/profiles/personal should return personal profile with dynamic age', async () => {
        const res = await request(app)
          .get('/api/profiles/personal')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.profile.first_name, 'Alice');
        assert.ok(res.body.profile.age !== undefined);
      });

      it('POST /api/profiles/personal/photo should update profile photo URL', async () => {
        const res = await request(app)
          .post('/api/profiles/personal/photo')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ profilePhotoUrl: 'https://images.example.com/avatar.png' });
        assert.equal(res.status, 200);
        assert.equal(res.body.profilePhotoUrl, 'https://images.example.com/avatar.png');
      });
    });

    describe('Health Profile', () => {
      it('PUT /api/profiles/health should upsert health profile', async () => {
        const res = await request(app)
          .put('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            heightValue: 172.5,
            heightUnit: 'cm',
            currentWeight: 68.0,
            weightUnit: 'kg',
            bloodGroup: 'O+',
            activityLevel: 'moderately_active',
            fitnessLevel: 'intermediate',
            sleepTargetHours: 8.0,
            waterTargetMl: 2500,
            dailyStepTarget: 10000,
            foodAllergies: ['peanuts', 'shellfish'],
          });
        assert.equal(res.status, 200);
        assert.equal(res.body.health.height_value, 172.5);
        assert.equal(res.body.health.blood_group, 'O+');
      });

      it('GET /api/profiles/health should return health profile', async () => {
        const res = await request(app)
          .get('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.health.water_target_ml, 2500);
      });

      it('DELETE /api/profiles/health should delete health profile', async () => {
        const res = await request(app)
          .delete('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.ok(res.body.message.includes('deleted'));

        const verifyRes = await request(app)
          .get('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(verifyRes.body.health, null);
      });
    });

    describe('Body Measurements', () => {
      it('POST /api/profiles/measurements should add record and automatically compute BMI', async () => {
        const res = await request(app)
          .post('/api/profiles/measurements')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            weight: 70.0,
            height: 175.0,
            waist: 78.0,
            chest: 96.0,
            hips: 94.0,
            bodyFatPercentage: 18.5,
            notes: 'Morning weigh-in after workout',
          });
        assert.equal(res.status, 201);
        assert.ok(res.body.measurement);
        // BMI = 70 / (1.75^2) = 22.86
        assert.ok(Math.abs(Number(res.body.measurement.bmi) - 22.86) < 0.2);
        measurement1Id = res.body.measurement.id;
      });

      it('POST /api/profiles/measurements second entry preserves history without overwriting', async () => {
        const res = await request(app)
          .post('/api/profiles/measurements')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            weight: 69.5,
            height: 175.0,
            notes: 'Second week weigh-in',
          });
        assert.equal(res.status, 201);
        assert.notEqual(res.body.measurement.id, measurement1Id);
      });

      it('GET /api/profiles/measurements should return paginated measurement history', async () => {
        const res = await request(app)
          .get('/api/profiles/measurements?page=1&limit=5')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.data.length, 2);
        assert.equal(res.body.pagination.total, 2);
      });

      it('PUT /api/profiles/measurements/:id should update a measurement record and recalculate BMI', async () => {
        const res = await request(app)
          .put(`/api/profiles/measurements/${measurement1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            weight: 72.0,
          });
        assert.equal(res.status, 200);
        // BMI = 72 / (1.75^2) = 23.51
        assert.ok(Math.abs(Number(res.body.measurement.bmi) - 23.51) < 0.2);
      });

      it('DELETE /api/profiles/measurements/:id should delete measurement record', async () => {
        const res = await request(app)
          .delete(`/api/profiles/measurements/${measurement1Id}`)
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
      });
    });

    describe('Professional Profile', () => {
      it('PUT /api/profiles/professional should update professional details', async () => {
        const res = await request(app)
          .put('/api/profiles/professional')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            occupation: 'Lead Architect',
            employmentStatus: 'Full-time',
            companyName: 'Acme Technologies',
            industry: 'Technology',
            experienceYears: 7.5,
            skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'System Design'],
            careerGoal: 'Become VP of Engineering',
            workStartTime: '09:00',
            workEndTime: '17:30',
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          });
        assert.equal(res.status, 200);
        assert.equal(res.body.professional.occupation, 'Lead Architect');
        assert.equal(res.body.professional.company_name, 'Acme Technologies');
      });

      it('GET /api/profiles/professional should return professional profile', async () => {
        const res = await request(app)
          .get('/api/profiles/professional')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.professional.industry, 'Technology');
      });
    });

    describe('Lifestyle Profile', () => {
      it('PUT /api/profiles/lifestyle should update lifestyle information', async () => {
        const res = await request(app)
          .put('/api/profiles/lifestyle')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
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
            lifestyleNotes: 'Aiming for 8 hours of sleep consistently',
          });
        assert.equal(res.status, 200);
        assert.equal(res.body.lifestyle.work_mode, 'hybrid');
        assert.equal(res.body.lifestyle.smoking_status, 'non-smoker');
      });

      it('GET /api/profiles/lifestyle should return lifestyle profile', async () => {
        const res = await request(app)
          .get('/api/profiles/lifestyle')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.lifestyle.dietary_preference, 'Mediterranean');
      });
    });

    describe('Personal Goals', () => {
      it('POST /api/profiles/goals should create goal 1 (career)', async () => {
        const res = await request(app)
          .post('/api/profiles/goals')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            title: 'Complete AWS Solutions Architect Certification',
            description: 'Pass the SAA-C03 exam before Q3',
            category: 'career',
            priority: 'high',
            targetDate: '2026-11-30',
          });
        assert.equal(res.status, 201);
        assert.equal(res.body.goal.title, 'Complete AWS Solutions Architect Certification');
        assert.equal(res.body.goal.status, 'active');
        goal1Id = res.body.goal.id;
      });

      it('POST /api/profiles/goals should create goal 2 (health)', async () => {
        const res = await request(app)
          .post('/api/profiles/goals')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            title: 'Run a 10K Marathon',
            description: 'Train 3 times weekly',
            category: 'health',
            priority: 'medium',
            targetDate: '2026-12-15',
          });
        assert.equal(res.status, 201);
      });

      it('GET /api/profiles/goals should filter goals by category', async () => {
        const res = await request(app)
          .get('/api/profiles/goals?category=career')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.data.length, 1);
        assert.equal(res.body.data[0].category, 'career');
      });

      it('GET /api/profiles/goals/:id should return single goal by ID', async () => {
        const res = await request(app)
          .get(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.goal.id, goal1Id);
      });

      it('PATCH /api/profiles/goals/:id/status should update goal status', async () => {
        const res = await request(app)
          .patch(`/api/profiles/goals/${goal1Id}/status`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ status: 'completed' });
        assert.equal(res.status, 200);
        assert.equal(res.body.goal.status, 'completed');
      });

      it('PUT /api/profiles/goals/:id should update goal fields', async () => {
        const res = await request(app)
          .put(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            title: 'AWS Certified Solutions Architect (Passed)',
            priority: 'low',
          });
        assert.equal(res.status, 200);
        assert.ok(res.body.goal.title.includes('Passed'));
      });
    });

    describe('Complete Profile Retrieval', () => {
      it('GET /api/profiles/complete should return combined profile view', async () => {
        const res = await request(app)
          .get('/api/profiles/complete')
          .set('Authorization', `Bearer ${user1Token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.userId, user1Id);
        assert.ok(res.body.personal);
        assert.equal(res.body.personal.first_name, 'Alice');
        assert.ok(res.body.personal.age !== undefined);
        assert.ok(res.body.professional);
        assert.equal(res.body.professional.occupation, 'Lead Architect');
        assert.ok(res.body.lifestyle);
        assert.equal(res.body.lifestyle.work_mode, 'hybrid');
        assert.ok(Array.isArray(res.body.goals));
        assert.ok(res.body.goals.length > 0);
      });
    });

    describe('Multi-Tenant Data Isolation Security', () => {
      it('User 2 should NOT be able to view User 1 goal', async () => {
        const res = await request(app)
          .get(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`);
        assert.equal(res.status, 404);
        assert.equal(res.body.message, 'Goal not found.');
      });

      it('User 2 should NOT be able to update User 1 goal', async () => {
        const res = await request(app)
          .put(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ title: 'Hacked Goal' });
        assert.equal(res.status, 404);
      });

      it('User 2 should NOT be able to delete User 1 goal', async () => {
        const res = await request(app)
          .delete(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`);
        assert.equal(res.status, 404);
      });
    });
  });
});
