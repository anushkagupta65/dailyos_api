import { pool } from '../../config/database';

export interface UserPreferencesRecord {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  date_format: string;
  time_format: '12h' | '24h';
  timezone: string;
  week_starts_on: number;
  currency: string;
  language: string;
  updated_at: string;
}

export interface UserPrivacySettingsRecord {
  id: string;
  user_id: string;
  analytics_consent: boolean;
  personalization_consent: boolean;
  health_data_consent: boolean;
  data_export_enabled: boolean;
  updated_at: string;
}

export class SettingsRepository {
  // ---------------- USER PREFERENCES ----------------
  async getPreferences(userId: string): Promise<UserPreferencesRecord | null> {
    const { rows } = await pool.query<UserPreferencesRecord>(
      `SELECT id, user_id, theme, accent_color, date_format, time_format, timezone,
              week_starts_on, currency, language, updated_at
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertPreferences(
    userId: string,
    data: {
      theme?: 'light' | 'dark' | 'system';
      accentColor?: string;
      dateFormat?: string;
      timeFormat?: '12h' | '24h';
      timezone?: string;
      weekStartsOn?: number;
      currency?: string;
      language?: string;
    },
    defaults: {
      theme: 'light' | 'dark' | 'system';
      accent_color: string;
      date_format: string;
      time_format: '12h' | '24h';
      timezone: string;
      week_starts_on: number;
      currency: string;
      language: string;
    }
  ): Promise<UserPreferencesRecord> {
    const existing = await this.getPreferences(userId);
    if (existing) {
      const { rows } = await pool.query<UserPreferencesRecord>(
        `UPDATE user_preferences
         SET theme = COALESCE($2, theme),
             accent_color = COALESCE($3, accent_color),
             date_format = COALESCE($4, date_format),
             time_format = COALESCE($5, time_format),
             timezone = COALESCE($6, timezone),
             week_starts_on = COALESCE($7, week_starts_on),
             currency = COALESCE($8, currency),
             language = COALESCE($9, language),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING id, user_id, theme, accent_color, date_format, time_format, timezone,
                   week_starts_on, currency, language, updated_at`,
        [
          userId,
          data.theme,
          data.accentColor,
          data.dateFormat,
          data.timeFormat,
          data.timezone,
          data.weekStartsOn,
          data.currency,
          data.language,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query<UserPreferencesRecord>(
        `INSERT INTO user_preferences (
           user_id, theme, accent_color, date_format, time_format, timezone,
           week_starts_on, currency, language
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, user_id, theme, accent_color, date_format, time_format, timezone,
                   week_starts_on, currency, language, updated_at`,
        [
          userId,
          data.theme ?? defaults.theme,
          data.accentColor ?? defaults.accent_color,
          data.dateFormat ?? defaults.date_format,
          data.timeFormat ?? defaults.time_format,
          data.timezone ?? defaults.timezone,
          data.weekStartsOn ?? defaults.week_starts_on,
          data.currency ?? defaults.currency,
          data.language ?? defaults.language,
        ]
      );
      return rows[0];
    }
  }

  // ---------------- PRIVACY SETTINGS ----------------
  async getPrivacySettings(userId: string): Promise<UserPrivacySettingsRecord | null> {
    const { rows } = await pool.query<UserPrivacySettingsRecord>(
      `SELECT id, user_id, analytics_consent, personalization_consent,
              health_data_consent, data_export_enabled, updated_at
       FROM user_privacy_settings
       WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async upsertPrivacySettings(
    userId: string,
    data: {
      analyticsConsent?: boolean;
      personalizationConsent?: boolean;
      healthDataConsent?: boolean;
      dataExportEnabled?: boolean;
    },
    defaults: {
      analytics_consent: boolean;
      personalization_consent: boolean;
      health_data_consent: boolean;
      data_export_enabled: boolean;
    }
  ): Promise<UserPrivacySettingsRecord> {
    const existing = await this.getPrivacySettings(userId);
    if (existing) {
      const { rows } = await pool.query<UserPrivacySettingsRecord>(
        `UPDATE user_privacy_settings
         SET analytics_consent = COALESCE($2, analytics_consent),
             personalization_consent = COALESCE($3, personalization_consent),
             health_data_consent = COALESCE($4, health_data_consent),
             data_export_enabled = COALESCE($5, data_export_enabled),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING id, user_id, analytics_consent, personalization_consent,
                   health_data_consent, data_export_enabled, updated_at`,
        [
          userId,
          data.analyticsConsent,
          data.personalizationConsent,
          data.healthDataConsent,
          data.dataExportEnabled,
        ]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query<UserPrivacySettingsRecord>(
        `INSERT INTO user_privacy_settings (
           user_id, analytics_consent, personalization_consent,
           health_data_consent, data_export_enabled
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, analytics_consent, personalization_consent,
                   health_data_consent, data_export_enabled, updated_at`,
        [
          userId,
          data.analyticsConsent ?? defaults.analytics_consent,
          data.personalizationConsent ?? defaults.personalization_consent,
          data.healthDataConsent ?? defaults.health_data_consent,
          data.dataExportEnabled ?? defaults.data_export_enabled,
        ]
      );
      return rows[0];
    }
  }
}

export const settingsRepository = new SettingsRepository();
