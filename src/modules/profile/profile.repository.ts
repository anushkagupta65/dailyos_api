import { pool } from '../../config/database';

export class ProfileRepository {
  // ---------------- PERSONAL PROFILE ----------------
  async getPersonalProfile(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertPersonalProfile(userId: string, data: any) {
    const existing = await this.getPersonalProfile(userId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE user_profiles
         SET first_name = COALESCE($2, first_name),
             last_name = COALESCE($3, last_name),
             display_name = COALESCE($4, display_name),
             profile_photo_url = COALESCE($5, profile_photo_url),
             date_of_birth = COALESCE($6, date_of_birth),
             gender = COALESCE($7, gender),
             pronouns = COALESCE($8, pronouns),
             phone_number = COALESCE($9, phone_number),
             country_code = COALESCE($10, country_code),
             country = COALESCE($11, country),
             state = COALESCE($12, state),
             city = COALESCE($13, city),
             bio = COALESCE($14, bio),
             preferred_language = COALESCE($15, preferred_language),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.firstName,
          data.lastName,
          data.displayName,
          data.profilePhotoUrl,
          data.dateOfBirth,
          data.gender,
          data.pronouns,
          data.phoneNumber,
          data.countryCode,
          data.country,
          data.state,
          data.city,
          data.bio,
          data.preferredLanguage,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO user_profiles (
           user_id, first_name, last_name, display_name, profile_photo_url,
           date_of_birth, gender, pronouns, phone_number, country_code,
           country, state, city, bio, preferred_language
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          userId,
          data.firstName || '',
          data.lastName || '',
          data.displayName || data.firstName || '',
          data.profilePhotoUrl || null,
          data.dateOfBirth || null,
          data.gender || null,
          data.pronouns || null,
          data.phoneNumber || null,
          data.countryCode || null,
          data.country || null,
          data.state || null,
          data.city || null,
          data.bio || null,
          data.preferredLanguage || 'en',
        ]
      );
      return rows[0];
    }
  }

  async updateProfilePhoto(userId: string, photoUrl: string) {
    const { rows } = await pool.query(
      `UPDATE user_profiles
       SET profile_photo_url = $2, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId, photoUrl]
    );
    return rows[0] || null;
  }

  // ---------------- HEALTH PROFILE ----------------
  async getHealthProfile(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_health_profiles WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertHealthProfile(userId: string, data: any) {
    const existing = await this.getHealthProfile(userId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE user_health_profiles
         SET height_value = COALESCE($2, height_value),
             height_unit = COALESCE($3, height_unit),
             current_weight = COALESCE($4, current_weight),
             weight_unit = COALESCE($5, weight_unit),
             blood_group = COALESCE($6, blood_group),
             activity_level = COALESCE($7, activity_level),
             fitness_level = COALESCE($8, fitness_level),
             dietary_preference = COALESCE($9, dietary_preference),
             food_allergies = COALESCE($10, food_allergies),
             sleep_target_hours = COALESCE($11, sleep_target_hours),
             average_sleep_hours = COALESCE($12, average_sleep_hours),
             water_target_ml = COALESCE($13, water_target_ml),
             exercise_frequency = COALESCE($14, exercise_frequency),
             health_notes = COALESCE($15, health_notes),
             fitness_objectives = COALESCE($16, fitness_objectives),
             preferred_workout_types = COALESCE($17, preferred_workout_types),
             daily_step_target = COALESCE($18, daily_step_target),
             wake_up_time = COALESCE($19, wake_up_time),
             sleep_time = COALESCE($20, sleep_time),
             dietary_restrictions = COALESCE($21, dietary_restrictions),
             wellness_preferences = COALESCE($22, wellness_preferences),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.heightValue,
          data.heightUnit,
          data.currentWeight,
          data.weightUnit,
          data.bloodGroup,
          data.activityLevel,
          data.fitnessLevel,
          data.dietaryPreference,
          data.foodAllergies ? JSON.stringify(data.foodAllergies) : null,
          data.sleepTargetHours,
          data.averageSleepHours,
          data.waterTargetMl,
          data.exerciseFrequency,
          data.healthNotes,
          data.fitnessObjectives ? JSON.stringify(data.fitnessObjectives) : null,
          data.preferredWorkoutTypes ? JSON.stringify(data.preferredWorkoutTypes) : null,
          data.dailyStepTarget,
          data.wakeUpTime,
          data.sleepTime,
          data.dietaryRestrictions ? JSON.stringify(data.dietaryRestrictions) : null,
          data.wellnessPreferences ? JSON.stringify(data.wellnessPreferences) : null,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO user_health_profiles (
           user_id, height_value, height_unit, current_weight, weight_unit,
           blood_group, activity_level, fitness_level, dietary_preference,
           food_allergies, sleep_target_hours, average_sleep_hours, water_target_ml,
           exercise_frequency, health_notes, fitness_objectives, preferred_workout_types,
           daily_step_target, wake_up_time, sleep_time, dietary_restrictions,
           wellness_preferences
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         RETURNING *`,
        [
          userId,
          data.heightValue || null,
          data.heightUnit || 'cm',
          data.currentWeight || null,
          data.weightUnit || 'kg',
          data.bloodGroup || null,
          data.activityLevel || null,
          data.fitnessLevel || null,
          data.dietaryPreference || null,
          JSON.stringify(data.foodAllergies || []),
          data.sleepTargetHours || null,
          data.averageSleepHours || null,
          data.waterTargetMl || null,
          data.exerciseFrequency || null,
          data.healthNotes || null,
          JSON.stringify(data.fitnessObjectives || []),
          JSON.stringify(data.preferredWorkoutTypes || []),
          data.dailyStepTarget || null,
          data.wakeUpTime || null,
          data.sleepTime || null,
          JSON.stringify(data.dietaryRestrictions || []),
          JSON.stringify(data.wellnessPreferences || []),
        ]
      );
      return rows[0];
    }
  }

  async deleteHealthProfile(userId: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM user_health_profiles WHERE user_id = $1`,
      [userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- BODY MEASUREMENTS ----------------
  async createBodyMeasurement(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO user_body_measurements (
         user_id, weight, height, bmi, waist, chest, hips, body_fat_percentage, recorded_at, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), $10)
       RETURNING *`,
      [
        userId,
        data.weight || null,
        data.height || null,
        data.bmi || null,
        data.waist || null,
        data.chest || null,
        data.hips || null,
        data.bodyFatPercentage || null,
        data.recordedAt || null,
        data.notes || null,
      ]
    );
    return rows[0];
  }

  async getBodyMeasurements(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM user_body_measurements WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT * FROM user_body_measurements
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBodyMeasurementById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_body_measurements WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async getLatestBodyMeasurement(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_body_measurements
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async updateBodyMeasurement(userId: string, id: string, data: any) {
    const { rows } = await pool.query(
      `UPDATE user_body_measurements
       SET weight = COALESCE($3, weight),
           height = COALESCE($4, height),
           bmi = COALESCE($5, bmi),
           waist = COALESCE($6, waist),
           chest = COALESCE($7, chest),
           hips = COALESCE($8, hips),
           body_fat_percentage = COALESCE($9, body_fat_percentage),
           recorded_at = COALESCE($10, recorded_at),
           notes = COALESCE($11, notes)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        data.weight,
        data.height,
        data.bmi,
        data.waist,
        data.chest,
        data.hips,
        data.bodyFatPercentage,
        data.recordedAt,
        data.notes,
      ]
    );
    return rows[0] || null;
  }

  async deleteBodyMeasurement(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM user_body_measurements WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------- PROFESSIONAL PROFILE ----------------
  async getProfessionalProfile(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_professional_profiles WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertProfessionalProfile(userId: string, data: any) {
    const existing = await this.getProfessionalProfile(userId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE user_professional_profiles
         SET occupation = COALESCE($2, occupation),
             employment_status = COALESCE($3, employment_status),
             company_name = COALESCE($4, company_name),
             industry = COALESCE($5, industry),
             experience_years = COALESCE($6, experience_years),
             education_level = COALESCE($7, education_level),
             highest_qualification = COALESCE($8, highest_qualification),
             skills = COALESCE($9, skills),
             career_goal = COALESCE($10, career_goal),
             work_start_time = COALESCE($11, work_start_time),
             work_end_time = COALESCE($12, work_end_time),
             work_days = COALESCE($13, work_days),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.occupation,
          data.employmentStatus,
          data.companyName,
          data.industry,
          data.experienceYears,
          data.educationLevel,
          data.highestQualification,
          data.skills ? JSON.stringify(data.skills) : null,
          data.careerGoal,
          data.workStartTime,
          data.workEndTime,
          data.workDays ? JSON.stringify(data.workDays) : null,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO user_professional_profiles (
           user_id, occupation, employment_status, company_name, industry,
           experience_years, education_level, highest_qualification, skills,
           career_goal, work_start_time, work_end_time, work_days
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          userId,
          data.occupation || null,
          data.employmentStatus || null,
          data.companyName || null,
          data.industry || null,
          data.experienceYears || null,
          data.educationLevel || null,
          data.highestQualification || null,
          JSON.stringify(data.skills || []),
          data.careerGoal || null,
          data.workStartTime || null,
          data.workEndTime || null,
          JSON.stringify(data.workDays || []),
        ]
      );
      return rows[0];
    }
  }

  // ---------------- LIFESTYLE PROFILE ----------------
  async getLifestyleProfile(userId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_lifestyle_profiles WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertLifestyleProfile(userId: string, data: any) {
    const existing = await this.getLifestyleProfile(userId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE user_lifestyle_profiles
         SET wake_up_time = COALESCE($2, wake_up_time),
             sleep_time = COALESCE($3, sleep_time),
             work_mode = COALESCE($4, work_mode),
             exercise_days = COALESCE($5, exercise_days),
             preferred_exercise = COALESCE($6, preferred_exercise),
             dietary_preference = COALESCE($7, dietary_preference),
             smoking_status = COALESCE($8, smoking_status),
             alcohol_preference = COALESCE($9, alcohol_preference),
             hobbies = COALESCE($10, hobbies),
             personal_interests = COALESCE($11, personal_interests),
             lifestyle_notes = COALESCE($12, lifestyle_notes),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.wakeUpTime,
          data.sleepTime,
          data.workMode,
          data.exerciseDays ? JSON.stringify(data.exerciseDays) : null,
          data.preferredExercise ? JSON.stringify(data.preferredExercise) : null,
          data.dietaryPreference,
          data.smokingStatus,
          data.alcoholPreference,
          data.hobbies ? JSON.stringify(data.hobbies) : null,
          data.personalInterests ? JSON.stringify(data.personalInterests) : null,
          data.lifestyleNotes,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO user_lifestyle_profiles (
           user_id, wake_up_time, sleep_time, work_mode, exercise_days,
           preferred_exercise, dietary_preference, smoking_status, alcohol_preference,
           hobbies, personal_interests, lifestyle_notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          userId,
          data.wakeUpTime || null,
          data.sleepTime || null,
          data.workMode || null,
          JSON.stringify(data.exerciseDays || []),
          JSON.stringify(data.preferredExercise || []),
          data.dietaryPreference || null,
          data.smokingStatus || null,
          data.alcoholPreference || null,
          JSON.stringify(data.hobbies || []),
          JSON.stringify(data.personalInterests || []),
          data.lifestyleNotes || null,
        ]
      );
      return rows[0];
    }
  }

  // ---------------- PERSONAL GOALS ----------------
  async createGoal(userId: string, data: any) {
    const { rows } = await pool.query(
      `INSERT INTO user_goals (
         user_id, title, description, category, priority, target_date, status
       ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'active'))
       RETURNING *`,
      [
        userId,
        data.title,
        data.description || null,
        data.category,
        data.priority,
        data.targetDate || null,
        data.status || 'active',
      ]
    );
    return rows[0];
  }

  async getGoals(
    userId: string,
    filters: {
      category?: string;
      priority?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (filters.category) {
      params.push(filters.category);
      conditions.push(`category = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ count: string }>(
      `SELECT count(*) FROM user_goals WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM user_goals
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGoalById(userId: string, id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  }

  async updateGoal(userId: string, id: string, data: any) {
    const { rows } = await pool.query(
      `UPDATE user_goals
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           category = COALESCE($5, category),
           priority = COALESCE($6, priority),
           target_date = COALESCE($7, target_date),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        data.title,
        data.description,
        data.category,
        data.priority,
        data.targetDate,
        data.status,
      ]
    );
    return rows[0] || null;
  }

  async updateGoalStatus(userId: string, id: string, status: string) {
    const { rows } = await pool.query(
      `UPDATE user_goals
       SET status = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, status]
    );
    return rows[0] || null;
  }

  async deleteGoal(userId: string, id: string): Promise<boolean> {
    const res = await pool.query(
      `DELETE FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getUserAccount(userId: string) {
    const { rows } = await pool.query(
      `SELECT id, email, email_verified_at, status, onboarding_completed, created_at, updated_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    return rows[0] || null;
  }
}

export const profileRepository = new ProfileRepository();
