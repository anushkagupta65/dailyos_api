import request from 'supertest';
import { newDb, DataType } from 'pg-mem';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import app from '../src/app';
import { setTestPool } from '../src/config/database';

describe('DailyOS API - Full Verification Test Suite', () => {
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

  beforeAll(async () => {
    // 1. Setup in-memory PostgreSQL emulator
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

    // 2. Run migrations
    const sqlPath = path.join(__dirname, '../src/database/migrations/001_create_auth_and_user_tables.sql');
    let sql = fs.readFileSync(sqlPath, 'utf-8');
    sql = sql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'DECIMAL');
    memDb.public.none(sql);
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }
  });

  describe('Health API', () => {
    it('GET /api/health should return 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('1. Authentication Module', () => {
    describe('Registration', () => {
      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'notanemail', password: user1Password });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation failed');
      });

      it('should reject weak password (no uppercase or number)', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ email: 'valid@example.com', password: 'weak' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation failed');
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
        expect(res.status).toBe(201);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(user1Email.toLowerCase());
        user1Id = res.body.user.id;
      });

      it('should reject duplicate registration with 409 Conflict', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: user1Email,
            password: user1Password,
          });
        expect(res.status).toBe(409);
        expect(res.body.message).toContain('already exists');
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
        expect(res.status).toBe(201);
        user2Id = res.body.user.id;
      });
    });

    describe('Login', () => {
      it('should reject login with wrong password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: 'WrongPassword123!' });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password.');
      });

      it('should reject login for non-existent email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'nobody@example.com', password: 'SomePassword123!' });
        expect(res.status).toBe(401);
      });

      it('should log in successfully and return access & refresh tokens', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: user1Password });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.user.email).toBe(user1Email);
        expect(res.headers['set-cookie']).toBeDefined();

        user1Token = res.body.accessToken;
        user1RefreshToken = res.body.refreshToken;
      });

      it('should log in user 2 successfully', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: user2Email, password: user2Password });
        expect(res.status).toBe(200);
        user2Token = res.body.accessToken;
      });
    });

    describe('Get Current User (GET /api/auth/me)', () => {
      it('should reject request without token with 401', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
      });

      it('should reject request with invalid token with 401', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalidtoken123');
        expect(res.status).toBe(401);
      });

      it('should return current user account & profile data with valid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(user1Id);
        expect(res.body.email).toBe(user1Email);
        expect(res.body.profile).toBeDefined();
        expect(res.body.profile.firstName).toBe('Alice');
      });
    });

    describe('Refresh Token Rotation', () => {
      it('should exchange valid refresh token for new tokens (rotation)', async () => {
        const res = await request(app)
          .post('/api/auth/refresh-token')
          .send({ refreshToken: user1RefreshToken });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.refreshToken).not.toBe(user1RefreshToken);

        const newAccessToken = res.body.accessToken;
        const newRefreshToken = res.body.refreshToken;

        // Old refresh token must be revoked and fail
        const replayRes = await request(app)
          .post('/api/auth/refresh-token')
          .send({ refreshToken: user1RefreshToken });
        expect(replayRes.status).toBe(401);

        // Update active tokens
        user1Token = newAccessToken;
        user1RefreshToken = newRefreshToken;
      });
    });

    describe('Active Sessions & Revocation', () => {
      it('should list active user sessions', async () => {
        const res = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.sessions)).toBe(true);
        expect(res.body.sessions.length).toBeGreaterThan(0);
      });

      it('should revoke a specific session', async () => {
        const listRes = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${user1Token}`);
        const sessionId = listRes.body.sessions[0].id;

        const res = await request(app)
          .delete(`/api/auth/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('revoked');
      });
    });

    describe('Email Verification', () => {
      it('should verify email using stored verification token', async () => {
        const tokenRes = await testPool.query(
          `SELECT token_hash FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL`,
          [user1Id]
        );
        expect(tokenRes.rows.length).toBe(1);

        // Update with known raw token
        const rawToken = 'test-verification-token-12345';
        const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await testPool.query(
          `UPDATE email_verification_tokens SET token_hash = $1 WHERE user_id = $2`,
          [hash, user1Id]
        );

        const res = await request(app)
          .post('/api/auth/verify-email')
          .send({ token: rawToken });
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('verified successfully');

        // Second attempt must fail (single-use)
        const secondRes = await request(app)
          .post('/api/auth/verify-email')
          .send({ token: rawToken });
        expect(secondRes.status).toBe(400);
      });
    });

    describe('Password Reset Flow', () => {
      it('should handle forgot password without exposing email existence', async () => {
        const resRegistered = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: user1Email });
        expect(resRegistered.status).toBe(200);

        const resUnregistered = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'notregistered@example.com' });
        expect(resUnregistered.status).toBe(200);
        expect(resRegistered.body.message).toBe(resUnregistered.body.message);
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
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('reset successfully');

        // Old password fails
        const oldLoginRes = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: user1Password });
        expect(oldLoginRes.status).toBe(401);

        // New password succeeds
        const newLoginRes = await request(app)
          .post('/api/auth/login')
          .send({ email: user1Email, password: newPass });
        expect(newLoginRes.status).toBe(200);
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
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Incorrect current password');
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
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('updated successfully');
        user1Password = updatedPass;
      });
    });

    describe('Logout & Logout All', () => {
      it('should logout and clear refresh cookie', async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Logged out');
      });

      it('should revoke all active sessions for user', async () => {
        const res = await request(app)
          .post('/api/auth/logout-all')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('All active sessions have been revoked');
      });
    });
  });

  describe('2. User Profile Module', () => {
    // Re-login User 1 and User 2 to get fresh access tokens
    beforeAll(async () => {
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: user1Email, password: user1Password });
      user1Token = login1.body.accessToken;

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ email: user2Email, password: user2Password });
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
        expect(res.status).toBe(200);
        expect(res.body.profile.first_name).toBe('Alice');
        expect(res.body.profile.country).toBe('Canada');
        expect(typeof res.body.profile.age).toBe('number');
        expect(res.body.profile.age).toBeGreaterThan(25);
      });

      it('GET /api/profiles/personal should return personal profile with dynamic age', async () => {
        const res = await request(app)
          .get('/api/profiles/personal')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.profile.first_name).toBe('Alice');
        expect(res.body.profile.age).toBeDefined();
      });

      it('POST /api/profiles/personal/photo should update profile photo URL', async () => {
        const res = await request(app)
          .post('/api/profiles/personal/photo')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ profilePhotoUrl: 'https://images.example.com/avatar.png' });
        expect(res.status).toBe(200);
        expect(res.body.profilePhotoUrl).toBe('https://images.example.com/avatar.png');
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
        expect(res.status).toBe(200);
        expect(res.body.health.height_value).toBe('172.5');
        expect(res.body.health.blood_group).toBe('O+');
      });

      it('GET /api/profiles/health should return health profile', async () => {
        const res = await request(app)
          .get('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.health.water_target_ml).toBe(2500);
      });

      it('DELETE /api/profiles/health should delete health profile', async () => {
        const res = await request(app)
          .delete('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('deleted');

        const verifyRes = await request(app)
          .get('/api/profiles/health')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(verifyRes.body.health).toBeNull();
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
        expect(res.status).toBe(201);
        expect(res.body.measurement).toBeDefined();
        // BMI = 70 / (1.75^2) = 22.86
        expect(Number(res.body.measurement.bmi)).toBeCloseTo(22.86, 1);
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
        expect(res.status).toBe(201);
        expect(res.body.measurement.id).not.toBe(measurement1Id);
      });

      it('GET /api/profiles/measurements should return paginated measurement history', async () => {
        const res = await request(app)
          .get('/api/profiles/measurements?page=1&limit=5')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
        expect(res.body.pagination.total).toBe(2);
      });

      it('PUT /api/profiles/measurements/:id should update a measurement record and recalculate BMI', async () => {
        const res = await request(app)
          .put(`/api/profiles/measurements/${measurement1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            weight: 72.0,
          });
        expect(res.status).toBe(200);
        // BMI = 72 / (1.75^2) = 23.51
        expect(Number(res.body.measurement.bmi)).toBeCloseTo(23.51, 1);
      });

      it('DELETE /api/profiles/measurements/:id should delete measurement record', async () => {
        const res = await request(app)
          .delete(`/api/profiles/measurements/${measurement1Id}`)
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
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
        expect(res.status).toBe(200);
        expect(res.body.professional.occupation).toBe('Lead Architect');
        expect(res.body.professional.company_name).toBe('Acme Technologies');
      });

      it('GET /api/profiles/professional should return professional profile', async () => {
        const res = await request(app)
          .get('/api/profiles/professional')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.professional.industry).toBe('Technology');
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
        expect(res.status).toBe(200);
        expect(res.body.lifestyle.work_mode).toBe('hybrid');
        expect(res.body.lifestyle.smoking_status).toBe('non-smoker');
      });

      it('GET /api/profiles/lifestyle should return lifestyle profile', async () => {
        const res = await request(app)
          .get('/api/profiles/lifestyle')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.lifestyle.dietary_preference).toBe('Mediterranean');
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
        expect(res.status).toBe(201);
        expect(res.body.goal.title).toBe('Complete AWS Solutions Architect Certification');
        expect(res.body.goal.status).toBe('active');
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
        expect(res.status).toBe(201);
      });

      it('GET /api/profiles/goals should filter goals by category', async () => {
        const res = await request(app)
          .get('/api/profiles/goals?category=career')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].category).toBe('career');
      });

      it('GET /api/profiles/goals/:id should return single goal by ID', async () => {
        const res = await request(app)
          .get(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.goal.id).toBe(goal1Id);
      });

      it('PATCH /api/profiles/goals/:id/status should update goal status', async () => {
        const res = await request(app)
          .patch(`/api/profiles/goals/${goal1Id}/status`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ status: 'completed' });
        expect(res.status).toBe(200);
        expect(res.body.goal.status).toBe('completed');
      });

      it('PUT /api/profiles/goals/:id should update goal fields', async () => {
        const res = await request(app)
          .put(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            title: 'AWS Certified Solutions Architect (Passed)',
            priority: 'low',
          });
        expect(res.status).toBe(200);
        expect(res.body.goal.title).toContain('Passed');
      });
    });

    describe('Complete Profile Retrieval', () => {
      it('GET /api/profiles/complete should return combined profile view', async () => {
        const res = await request(app)
          .get('/api/profiles/complete')
          .set('Authorization', `Bearer ${user1Token}`);
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe(user1Id);
        expect(res.body.personal).toBeDefined();
        expect(res.body.personal.first_name).toBe('Alice');
        expect(res.body.personal.age).toBeDefined();
        expect(res.body.professional).toBeDefined();
        expect(res.body.professional.occupation).toBe('Lead Architect');
        expect(res.body.lifestyle).toBeDefined();
        expect(res.body.lifestyle.work_mode).toBe('hybrid');
        expect(Array.isArray(res.body.goals)).toBe(true);
        expect(res.body.goals.length).toBeGreaterThan(0);
      });
    });

    describe('Multi-Tenant Data Isolation Security', () => {
      it('User 2 should NOT be able to view User 1 goal', async () => {
        const res = await request(app)
          .get(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Goal not found.');
      });

      it('User 2 should NOT be able to update User 1 goal', async () => {
        const res = await request(app)
          .put(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ title: 'Hacked Goal' });
        expect(res.status).toBe(404);
      });

      it('User 2 should NOT be able to delete User 1 goal', async () => {
        const res = await request(app)
          .delete(`/api/profiles/goals/${goal1Id}`)
          .set('Authorization', `Bearer ${user2Token}`);
        expect(res.status).toBe(404);
      });
    });
  });
});
