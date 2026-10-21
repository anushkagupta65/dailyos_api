import { profileRepository } from './profile.repository';

export const calculateAge = (dateOfBirth: string | Date | null): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

export const calculateBMI = (
  weightKg?: number | null,
  heightCm?: number | null
): number | null => {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number(bmi.toFixed(2));
};

export class ProfileService {
  // ---------------- PERSONAL ----------------
  async getPersonalProfile(userId: string) {
    const profile = await profileRepository.getPersonalProfile(userId);
    if (!profile) {
      return null;
    }
    return {
      ...profile,
      age: calculateAge(profile.date_of_birth),
    };
  }

  async upsertPersonalProfile(userId: string, data: any) {
    const profile = await profileRepository.upsertPersonalProfile(userId, data);
    return {
      ...profile,
      age: calculateAge(profile.date_of_birth),
    };
  }

  async updateProfilePhoto(userId: string, photoUrl: string) {
    const profile = await profileRepository.updateProfilePhoto(userId, photoUrl);
    if (!profile) {
      throw { status: 404, message: 'User profile not found.' };
    }
    return {
      message: 'Profile photo updated successfully.',
      profilePhotoUrl: profile.profile_photo_url,
    };
  }

  // ---------------- HEALTH ----------------
  async getHealthProfile(userId: string) {
    return profileRepository.getHealthProfile(userId);
  }

  async upsertHealthProfile(userId: string, data: any) {
    return profileRepository.upsertHealthProfile(userId, data);
  }

  async deleteHealthProfile(userId: string) {
    const deleted = await profileRepository.deleteHealthProfile(userId);
    if (!deleted) {
      throw { status: 404, message: 'Health profile not found.' };
    }
    return { message: 'Health profile deleted successfully.' };
  }

  // ---------------- MEASUREMENTS ----------------
  async addBodyMeasurement(userId: string, data: any) {
    let bmi = data.bmi;
    if (bmi === undefined && data.weight && data.height) {
      bmi = calculateBMI(data.weight, data.height);
    }

    return profileRepository.createBodyMeasurement(userId, {
      ...data,
      bmi,
    });
  }

  async getBodyMeasurements(userId: string, page = 1, limit = 10) {
    return profileRepository.getBodyMeasurements(userId, page, limit);
  }

  async updateBodyMeasurement(userId: string, id: string, data: any) {
    const existing = await profileRepository.getBodyMeasurementById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Measurement record not found.' };
    }

    const weight = data.weight !== undefined ? data.weight : existing.weight;
    const height = data.height !== undefined ? data.height : existing.height;
    let bmi = data.bmi !== undefined ? data.bmi : calculateBMI(weight, height);

    const updated = await profileRepository.updateBodyMeasurement(userId, id, {
      ...data,
      bmi,
    });

    return updated;
  }

  async deleteBodyMeasurement(userId: string, id: string) {
    const deleted = await profileRepository.deleteBodyMeasurement(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Measurement record not found.' };
    }
    return { message: 'Measurement record deleted successfully.' };
  }

  // ---------------- PROFESSIONAL ----------------
  async getProfessionalProfile(userId: string) {
    return profileRepository.getProfessionalProfile(userId);
  }

  async upsertProfessionalProfile(userId: string, data: any) {
    return profileRepository.upsertProfessionalProfile(userId, data);
  }

  // ---------------- LIFESTYLE ----------------
  async getLifestyleProfile(userId: string) {
    return profileRepository.getLifestyleProfile(userId);
  }

  async upsertLifestyleProfile(userId: string, data: any) {
    return profileRepository.upsertLifestyleProfile(userId, data);
  }

  // ---------------- GOALS ----------------
  async createGoal(userId: string, data: any) {
    return profileRepository.createGoal(userId, data);
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
    return profileRepository.getGoals(userId, filters);
  }

  async getGoalById(userId: string, id: string) {
    const goal = await profileRepository.getGoalById(userId, id);
    if (!goal) {
      throw { status: 404, message: 'Goal not found.' };
    }
    return goal;
  }

  async updateGoal(userId: string, id: string, data: any) {
    const existing = await profileRepository.getGoalById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Goal not found.' };
    }
    return profileRepository.updateGoal(userId, id, data);
  }

  async updateGoalStatus(userId: string, id: string, status: string) {
    const existing = await profileRepository.getGoalById(userId, id);
    if (!existing) {
      throw { status: 404, message: 'Goal not found.' };
    }
    return profileRepository.updateGoalStatus(userId, id, status);
  }

  async deleteGoal(userId: string, id: string) {
    const deleted = await profileRepository.deleteGoal(userId, id);
    if (!deleted) {
      throw { status: 404, message: 'Goal not found.' };
    }
    return { message: 'Goal deleted successfully.' };
  }

  // ---------------- COMPLETE PROFILE ----------------
  async getCompleteProfile(userId: string) {
    const [
      userAccount,
      personal,
      health,
      latestMeasurement,
      professional,
      lifestyle,
      goals,
    ] = await Promise.all([
      profileRepository.getUserAccount(userId),
      profileRepository.getPersonalProfile(userId),
      profileRepository.getHealthProfile(userId),
      profileRepository.getLatestBodyMeasurement(userId),
      profileRepository.getProfessionalProfile(userId),
      profileRepository.getLifestyleProfile(userId),
      profileRepository.getGoals(userId, { limit: 100 }),
    ]);

    if (!userAccount) {
      throw { status: 404, message: 'User not found.' };
    }

    return {
      userId: userAccount.id,
      email: userAccount.email,
      emailVerifiedAt: userAccount.email_verified_at,
      status: userAccount.status,
      onboardingCompleted: userAccount.onboarding_completed,
      personal: personal
        ? {
            ...personal,
            age: calculateAge(personal.date_of_birth),
          }
        : null,
      health,
      latestMeasurement,
      professional,
      lifestyle,
      goals: goals.data,
    };
  }
}

export const profileService = new ProfileService();
