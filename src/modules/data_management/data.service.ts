import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { withTransaction } from '../../config/database';
import { dataRepository } from './data.repository';
import { settingsService } from '../settings/settings.service';

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION
);

export const getExportsDir = (): string => {
  if (process.env.STORAGE_DIR) {
    return path.join(process.env.STORAGE_DIR, 'exports');
  }
  if (isServerless) {
    return path.join(os.tmpdir(), 'storage', 'exports');
  }
  return path.join(process.cwd(), 'storage', 'exports');
};

export class DataService {
  constructor() {
    // Avoid synchronous directory creation at module evaluation time.
    // In Vercel serverless functions, process.cwd() is read-only (/var/task),
    // so filesystem initialization is performed lazily when writing files.
  }

  private ensureExportsDir(): string {
    const primaryDir = getExportsDir();
    try {
      if (!fs.existsSync(primaryDir)) {
        fs.mkdirSync(primaryDir, { recursive: true });
      }
      return primaryDir;
    } catch (err) {
      // If primaryDir is not writable (e.g. read-only filesystem), fallback to os.tmpdir()
      const fallbackDir = path.join(os.tmpdir(), 'storage', 'exports');
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        return fallbackDir;
      } catch (fallbackErr) {
        console.error(`Failed to create exports directory at ${fallbackDir}:`, fallbackErr);
        throw {
          status: 500,
          message: 'Unable to initialize exports storage directory.',
        };
      }
    }
  }

  private resolveExportFilePath(exportId: string): string | null {
    const fileName = `${exportId}.json`;

    // 1. Check primary/configured storage directory
    const primaryPath = path.join(getExportsDir(), fileName);
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }

    // 2. Check /tmp fallback path
    const tmpPath = path.join(os.tmpdir(), 'storage', 'exports', fileName);
    if (fs.existsSync(tmpPath)) {
      return tmpPath;
    }

    // 3. Check local development path (only if not serverless)
    if (!isServerless) {
      const localPath = path.join(process.cwd(), 'storage', 'exports', fileName);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }

    return null;
  }

  // ---------------- EXPORTS ----------------
  async requestExport(userId: string, exportType: 'full' | 'financial' | 'habits' | 'personal') {
    const privacy = await settingsService.getPrivacySettings(userId);
    if (privacy && privacy.data_export_enabled === false) {
      throw {
        status: 403,
        message: 'Data export is disabled in your privacy settings. Please enable it to export your data.',
      };
    }

    const exportRecord = await dataRepository.createExport(userId, exportType);

    try {
      let exportData: Record<string, any> = {};

      if (exportType === 'full' || exportType === 'personal') {
        const [profile, intentions, learning] = await Promise.all([
          dataRepository.fetchProfileData(userId),
          dataRepository.fetchIntentionsData(userId),
          dataRepository.fetchLearningAndNotesData(userId),
        ]);
        exportData.profile = profile;
        exportData.intentions = intentions;
        exportData.learning_and_notes = learning;
      }

      if (exportType === 'full' || exportType === 'habits') {
        exportData.habits = await dataRepository.fetchHabitsData(userId);
      }

      if (exportType === 'full') {
        const [tasks, reviews, preferences] = await Promise.all([
          dataRepository.fetchTasksData(userId),
          dataRepository.fetchReviewsData(userId),
          dataRepository.fetchPreferencesData(userId),
        ]);
        exportData.tasks = tasks;
        exportData.reviews = reviews;
        exportData.preferences = preferences;
      }

      if (exportType === 'full' || exportType === 'financial') {
        exportData.finance = await dataRepository.fetchFinanceData(userId);
      }

      const backupContent = {
        version: '1.0',
        export_id: exportRecord.id,
        export_type: exportType,
        exported_at: new Date().toISOString(),
        user_id: userId,
        data: exportData,
      };

      const exportsDir = this.ensureExportsDir();
      const filePath = path.join(exportsDir, `${exportRecord.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(backupContent, null, 2), 'utf-8');

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const fileUrl = `/api/data/exports/${exportRecord.id}/download`;

      return await dataRepository.updateExportStatus(
        exportRecord.id,
        userId,
        'completed',
        fileUrl,
        expiresAt
      );
    } catch (err: any) {
      await dataRepository.updateExportStatus(exportRecord.id, userId, 'failed', '');
      throw err;
    }
  }

  async getExportById(userId: string, exportId: string) {
    const exportRecord = await dataRepository.getExportById(userId, exportId);
    if (!exportRecord) {
      throw { status: 404, message: 'Export request not found.' };
    }
    return exportRecord;
  }

  async listExports(userId: string, query: any) {
    return await dataRepository.listExports(userId, {
      status: query.status,
      exportType: query.exportType,
      page: query.page || 1,
      limit: query.limit || 10,
    });
  }

  async getExportFile(userId: string, exportId: string) {
    const exportRecord = await this.getExportById(userId, exportId);

    if (exportRecord.status !== 'completed') {
      throw {
        status: 400,
        message: `Export is not ready for download. Current status: ${exportRecord.status}.`,
      };
    }

    if (exportRecord.expires_at && new Date() > new Date(exportRecord.expires_at)) {
      await dataRepository.updateExportStatus(
        exportRecord.id,
        userId,
        'expired',
        exportRecord.file_url
      );
      throw {
        status: 410,
        message: 'This export file has expired. Please request a new export.',
      };
    }

    const filePath = this.resolveExportFilePath(exportRecord.id);
    if (!filePath || !fs.existsSync(filePath)) {
      throw { status: 404, message: 'Export file not found on server.' };
    }

    return {
      filePath,
      fileName: `lifetracker-export-${exportRecord.export_type}-${exportRecord.id}.json`,
    };
  }

  // ---------------- IMPORTS ----------------
  async requestImport(userId: string, payload: any) {
    const fileName = payload.fileName || 'backup.json';
    const importRecord = await dataRepository.createImport(userId, fileName);

    const rawData = payload.data || payload;
    if (!rawData || typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
      await dataRepository.updateImportStatus(importRecord.id, userId, 'failed', {
        message: 'Invalid import payload: missing or empty data object.',
      });
      throw { status: 400, message: 'Invalid import payload: missing or empty data object.' };
    }

    const dataToImport = rawData.data || rawData;

    try {
      await withTransaction(async (client) => {
        // 1. Profile
        if (dataToImport.profile) {
          const { personal_profile, health_profile, professional_profile, lifestyle_profile, goals } =
            dataToImport.profile;

          if (personal_profile) {
            await client.query(
              `INSERT INTO user_profiles (user_id, bio, phone, date_of_birth, gender, location, avatar_url)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (user_id) DO UPDATE SET
                 bio = EXCLUDED.bio,
                 phone = EXCLUDED.phone,
                 date_of_birth = EXCLUDED.date_of_birth,
                 gender = EXCLUDED.gender,
                 location = EXCLUDED.location,
                 avatar_url = EXCLUDED.avatar_url,
                 updated_at = NOW()`,
              [
                userId,
                personal_profile.bio,
                personal_profile.phone,
                personal_profile.date_of_birth,
                personal_profile.gender,
                personal_profile.location,
                personal_profile.avatar_url,
              ]
            );
          }

          if (health_profile) {
            await client.query(
              `INSERT INTO user_health_profiles (
                 user_id, blood_group, height_cm, current_weight_kg, target_weight_kg,
                 allergies, medical_conditions, emergency_contact_name, emergency_contact_phone
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (user_id) DO UPDATE SET
                 blood_group = EXCLUDED.blood_group,
                 height_cm = EXCLUDED.height_cm,
                 current_weight_kg = EXCLUDED.current_weight_kg,
                 target_weight_kg = EXCLUDED.target_weight_kg,
                 allergies = EXCLUDED.allergies,
                 medical_conditions = EXCLUDED.medical_conditions,
                 emergency_contact_name = EXCLUDED.emergency_contact_name,
                 emergency_contact_phone = EXCLUDED.emergency_contact_phone,
                 updated_at = NOW()`,
              [
                userId,
                health_profile.blood_group,
                health_profile.height_cm,
                health_profile.current_weight_kg,
                health_profile.target_weight_kg,
                health_profile.allergies,
                health_profile.medical_conditions,
                health_profile.emergency_contact_name,
                health_profile.emergency_contact_phone,
              ]
            );
          }

          if (professional_profile) {
            await client.query(
              `INSERT INTO user_professional_profiles (user_id, current_title, company, industry, years_experience, skills)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (user_id) DO UPDATE SET
                 current_title = EXCLUDED.current_title,
                 company = EXCLUDED.company,
                 industry = EXCLUDED.industry,
                 years_experience = EXCLUDED.years_experience,
                 skills = EXCLUDED.skills,
                 updated_at = NOW()`,
              [
                userId,
                professional_profile.current_title,
                professional_profile.company,
                professional_profile.industry,
                professional_profile.years_experience,
                professional_profile.skills ? JSON.stringify(professional_profile.skills) : null,
              ]
            );
          }

          if (lifestyle_profile) {
            await client.query(
              `INSERT INTO user_lifestyle_profiles (user_id, sleep_hours_target, daily_water_target_ml, diet_preference, activity_level)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO UPDATE SET
                 sleep_hours_target = EXCLUDED.sleep_hours_target,
                 daily_water_target_ml = EXCLUDED.daily_water_target_ml,
                 diet_preference = EXCLUDED.diet_preference,
                 activity_level = EXCLUDED.activity_level,
                 updated_at = NOW()`,
              [
                userId,
                lifestyle_profile.sleep_hours_target,
                lifestyle_profile.daily_water_target_ml,
                lifestyle_profile.diet_preference,
                lifestyle_profile.activity_level,
              ]
            );
          }

          if (Array.isArray(goals)) {
            for (const g of goals) {
              await client.query(
                `INSERT INTO user_goals (user_id, category, title, description, target_date, status, priority, progress_percentage)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT DO NOTHING`,
                [
                  userId,
                  g.category,
                  g.title,
                  g.description,
                  g.target_date,
                  g.status || 'in_progress',
                  g.priority || 'medium',
                  g.progress_percentage || 0,
                ]
              );
            }
          }
        }

        // 2. Preferences
        if (dataToImport.preferences) {
          const { user_preferences, user_privacy_settings, dashboard_preferences, user_insight_preferences } =
            dataToImport.preferences;

          if (user_preferences) {
            await client.query(
              `INSERT INTO user_preferences (
                 user_id, theme, accent_color, date_format, time_format, timezone,
                 week_starts_on, currency, language
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (user_id) DO UPDATE SET
                 theme = EXCLUDED.theme,
                 accent_color = EXCLUDED.accent_color,
                 date_format = EXCLUDED.date_format,
                 time_format = EXCLUDED.time_format,
                 timezone = EXCLUDED.timezone,
                 week_starts_on = EXCLUDED.week_starts_on,
                 currency = EXCLUDED.currency,
                 language = EXCLUDED.language,
                 updated_at = NOW()`,
              [
                userId,
                user_preferences.theme,
                user_preferences.accent_color,
                user_preferences.date_format,
                user_preferences.time_format,
                user_preferences.timezone,
                user_preferences.week_starts_on,
                user_preferences.currency,
                user_preferences.language,
              ]
            );
          }

          if (user_privacy_settings) {
            await client.query(
              `INSERT INTO user_privacy_settings (
                 user_id, analytics_consent, personalization_consent, health_data_consent, data_export_enabled
               ) VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO UPDATE SET
                 analytics_consent = EXCLUDED.analytics_consent,
                 personalization_consent = EXCLUDED.personalization_consent,
                 health_data_consent = EXCLUDED.health_data_consent,
                 data_export_enabled = EXCLUDED.data_export_enabled,
                 updated_at = NOW()`,
              [
                userId,
                user_privacy_settings.analytics_consent,
                user_privacy_settings.personalization_consent,
                user_privacy_settings.health_data_consent,
                user_privacy_settings.data_export_enabled,
              ]
            );
          }

          if (user_insight_preferences) {
            await client.query(
              `INSERT INTO user_insight_preferences (
                 user_id, default_period, default_filter, show_habits, show_money
               ) VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO UPDATE SET
                 default_period = EXCLUDED.default_period,
                 default_filter = EXCLUDED.default_filter,
                 show_habits = EXCLUDED.show_habits,
                 show_money = EXCLUDED.show_money,
                 updated_at = NOW()`,
              [
                userId,
                user_insight_preferences.default_period,
                user_insight_preferences.default_filter,
                user_insight_preferences.show_habits,
                user_insight_preferences.show_money,
              ]
            );
          }
        }

        // 3. Habits
        if (dataToImport.habits) {
          const { categories, habits, schedules, logs, flexibility } = dataToImport.habits;
          const categoryIdMap = new Map<string, string>();
          const habitIdMap = new Map<string, string>();

          if (Array.isArray(categories)) {
            for (const cat of categories) {
              const { rows } = await client.query(
                `INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
                 VALUES ($1, $2, $3, $4, $5, FALSE, $6)
                 RETURNING id`,
                [userId, cat.name, cat.description, cat.icon, cat.color, cat.sort_order || 0]
              );
              categoryIdMap.set(cat.id, rows[0].id);
            }
          }

          if (Array.isArray(habits)) {
            for (const h of habits) {
              const mappedCatId = h.category_id ? categoryIdMap.get(h.category_id) || null : null;
              const { rows } = await client.query(
                `INSERT INTO habits (
                   user_id, category_id, name, description, icon, color, habit_type,
                   tracking_type, target_value, target_unit, frequency_type, start_date,
                   end_date, preferred_time, cue, difficulty, status, sort_order
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                 RETURNING id`,
                [
                  userId,
                  mappedCatId,
                  h.name,
                  h.description,
                  h.icon,
                  h.color,
                  h.habit_type || 'positive',
                  h.tracking_type || 'boolean',
                  h.target_value,
                  h.target_unit,
                  h.frequency_type || 'daily',
                  h.start_date,
                  h.end_date,
                  h.preferred_time,
                  h.cue,
                  h.difficulty || 'medium',
                  h.status || 'active',
                  h.sort_order || 0,
                ]
              );
              habitIdMap.set(h.id, rows[0].id);
            }
          }

          if (Array.isArray(schedules)) {
            for (const s of schedules) {
              const mappedHabitId = habitIdMap.get(s.habit_id);
              if (mappedHabitId) {
                await client.query(
                  `INSERT INTO habit_schedules (
                     habit_id, user_id, schedule_type, weekdays, interval_days, effective_from, effective_until
                   ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    mappedHabitId,
                    userId,
                    s.schedule_type,
                    JSON.stringify(s.weekdays || []),
                    s.interval_days,
                    s.effective_from,
                    s.effective_until,
                  ]
                );
              }
            }
          }

          if (Array.isArray(logs)) {
            for (const l of logs) {
              const mappedHabitId = habitIdMap.get(l.habit_id);
              if (mappedHabitId) {
                await client.query(
                  `INSERT INTO habit_logs (
                     user_id, habit_id, log_date, status, actual_value, notes, completed_at
                   ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (user_id, habit_id, log_date) DO UPDATE SET
                     status = EXCLUDED.status,
                     actual_value = EXCLUDED.actual_value,
                     notes = EXCLUDED.notes`,
                  [
                    userId,
                    mappedHabitId,
                    l.log_date,
                    l.status,
                    l.actual_value,
                    l.notes,
                    l.completed_at,
                  ]
                );
              }
            }
          }
        }

        // 4. Tasks
        if (dataToImport.tasks) {
          const { tasks } = dataToImport.tasks;
          if (Array.isArray(tasks)) {
            for (const t of tasks) {
              await client.query(
                `INSERT INTO tasks (
                   user_id, title, description, category, priority, status,
                   scheduled_date, due_date, start_time, end_time,
                   estimated_minutes, actual_minutes, completed_at, source
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT DO NOTHING`,
                [
                  userId,
                  t.title,
                  t.description,
                  t.category,
                  t.priority || 'medium',
                  t.status || 'inbox',
                  t.scheduled_date,
                  t.due_date,
                  t.start_time,
                  t.end_time,
                  t.estimated_minutes,
                  t.actual_minutes,
                  t.completed_at,
                  t.source || 'manual',
                ]
              );
            }
          }
        }

        // 5. Intentions & Priorities
        if (dataToImport.intentions) {
          const { daily_intentions, daily_priorities } = dataToImport.intentions;
          if (Array.isArray(daily_intentions)) {
            for (const di of daily_intentions) {
              await client.query(
                `INSERT INTO daily_intentions (user_id, date, intention)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, date) DO UPDATE SET intention = EXCLUDED.intention, updated_at = NOW()`,
                [userId, di.date, di.intention]
              );
            }
          }
          if (Array.isArray(daily_priorities)) {
            for (const dp of daily_priorities) {
              await client.query(
                `INSERT INTO daily_priorities (user_id, date, priority_1, priority_2, priority_3)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, date) DO UPDATE SET
                   priority_1 = EXCLUDED.priority_1,
                   priority_2 = EXCLUDED.priority_2,
                   priority_3 = EXCLUDED.priority_3,
                   updated_at = NOW()`,
                [userId, dp.date, dp.priority_1, dp.priority_2, dp.priority_3]
              );
            }
          }
        }

        // 6. Notes & Learning
        if (dataToImport.learning_and_notes) {
          const { notes, learning_entries } = dataToImport.learning_and_notes;
          if (Array.isArray(notes)) {
            for (const n of notes) {
              await client.query(
                `INSERT INTO notes (user_id, title, content, is_pinned, is_archived)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING`,
                [userId, n.title, n.content, n.is_pinned || false, n.is_archived || false]
              );
            }
          }
          if (Array.isArray(learning_entries)) {
            for (const le of learning_entries) {
              await client.query(
                `INSERT INTO learning_entries (user_id, title, content, key_takeaway, category, source, learned_at, review_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT DO NOTHING`,
                [userId, le.title, le.content, le.key_takeaway, le.category, le.source, le.learned_at, le.review_date]
              );
            }
          }
        }

        // 7. Finance
        if (dataToImport.finance) {
          const { accounts, transactions, financial_goals, liabilities } = dataToImport.finance;
          const accountIdMap = new Map<string, string>();

          if (Array.isArray(accounts)) {
            for (const a of accounts) {
              const { rows } = await client.query(
                `INSERT INTO financial_accounts (
                   user_id, name, institution_name, account_type, account_number_masked,
                   currency, opening_balance, current_balance, is_default, is_active
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                  userId,
                  a.name,
                  a.institution_name,
                  a.account_type,
                  a.account_number_masked,
                  a.currency || 'INR',
                  a.opening_balance || 0,
                  a.current_balance || 0,
                  a.is_default || false,
                  a.is_active ?? true,
                ]
              );
              accountIdMap.set(a.id, rows[0].id);
            }
          }

          if (Array.isArray(financial_goals)) {
            for (const fg of financial_goals) {
              await client.query(
                `INSERT INTO financial_goals (
                   user_id, title, description, goal_type, target_amount, current_amount, currency, start_date, target_date, status
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT DO NOTHING`,
                [
                  userId,
                  fg.title,
                  fg.description,
                  fg.goal_type,
                  fg.target_amount,
                  fg.current_amount || 0,
                  fg.currency || 'INR',
                  fg.start_date,
                  fg.target_date,
                  fg.status || 'active',
                ]
              );
            }
          }

          if (Array.isArray(liabilities)) {
            for (const l of liabilities) {
              await client.query(
                `INSERT INTO financial_liabilities (
                   user_id, name, liability_type, institution, original_amount, outstanding_amount,
                   interest_rate, start_date, due_date, status
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT DO NOTHING`,
                [
                  userId,
                  l.name,
                  l.liability_type,
                  l.institution,
                  l.original_amount,
                  l.outstanding_amount,
                  l.interest_rate,
                  l.start_date,
                  l.due_date,
                  l.status || 'active',
                ]
              );
            }
          }
        }
      });

      return await dataRepository.updateImportStatus(importRecord.id, userId, 'completed');
    } catch (err: any) {
      await dataRepository.updateImportStatus(importRecord.id, userId, 'failed', {
        message: err.message || 'Unknown import error',
      });
      throw err;
    }
  }

  async getImportById(userId: string, importId: string) {
    const record = await dataRepository.getImportById(userId, importId);
    if (!record) {
      throw { status: 404, message: 'Import record not found.' };
    }
    return record;
  }

  async listImports(userId: string, query: any) {
    return await dataRepository.listImports(userId, {
      status: query.status,
      page: query.page || 1,
      limit: query.limit || 10,
    });
  }
}

export const dataService = new DataService();
