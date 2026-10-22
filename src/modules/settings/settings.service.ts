import { settingsRepository } from './settings.repository';

export const DEFAULT_USER_PREFERENCES = {
  theme: 'system' as const,
  accent_color: '#3B82F6',
  date_format: 'YYYY-MM-DD',
  time_format: '24h' as const,
  timezone: 'UTC',
  week_starts_on: 1,
  currency: 'INR',
  language: 'en',
};

export const DEFAULT_PRIVACY_SETTINGS = {
  analytics_consent: true,
  personalization_consent: true,
  health_data_consent: true,
  data_export_enabled: true,
};

export class SettingsService {
  async getPreferences(userId: string) {
    const preferences = await settingsRepository.getPreferences(userId);
    if (!preferences) {
      // Lazily create and return default preferences
      return await settingsRepository.upsertPreferences(userId, {}, DEFAULT_USER_PREFERENCES);
    }
    return preferences;
  }

  async createPreferences(userId: string, data: any) {
    return await settingsRepository.upsertPreferences(userId, data, DEFAULT_USER_PREFERENCES);
  }

  async updatePreferences(userId: string, data: any) {
    return await settingsRepository.upsertPreferences(userId, data, DEFAULT_USER_PREFERENCES);
  }

  async getPrivacySettings(userId: string) {
    const privacy = await settingsRepository.getPrivacySettings(userId);
    if (!privacy) {
      // Lazily create and return default privacy settings
      return await settingsRepository.upsertPrivacySettings(userId, {}, DEFAULT_PRIVACY_SETTINGS);
    }
    return privacy;
  }

  async updatePrivacySettings(userId: string, data: any) {
    return await settingsRepository.upsertPrivacySettings(userId, data, DEFAULT_PRIVACY_SETTINGS);
  }
}

export const settingsService = new SettingsService();
