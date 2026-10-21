import { z } from 'zod';

export const personalProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  displayName: z.string().trim().max(100).optional(),
  profilePhotoUrl: z.string().trim().url('Invalid URL format').or(z.literal('')).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').nullable().optional(),
  gender: z.string().trim().max(30).nullable().optional(),
  pronouns: z.string().trim().max(50).nullable().optional(),
  phoneNumber: z.string().trim().max(30).nullable().optional(),
  countryCode: z.string().trim().max(5).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  preferredLanguage: z.string().trim().max(10).optional(),
});

export const updatePhotoSchema = z.object({
  profilePhotoUrl: z.string().trim().url('Invalid photo URL'),
});

export const healthProfileSchema = z.object({
  heightValue: z.number().positive('Height must be positive').nullable().optional(),
  heightUnit: z.enum(['cm', 'ft_in']).optional(),
  currentWeight: z.number().positive('Weight must be positive').nullable().optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  bloodGroup: z.string().trim().max(5).nullable().optional(),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).nullable().optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  dietaryPreference: z.string().trim().max(50).nullable().optional(),
  foodAllergies: z.array(z.string().trim()).optional(),
  sleepTargetHours: z.number().min(0).max(24).nullable().optional(),
  averageSleepHours: z.number().min(0).max(24).nullable().optional(),
  waterTargetMl: z.number().int().min(0).nullable().optional(),
  exerciseFrequency: z.string().trim().max(50).nullable().optional(),
  healthNotes: z.string().max(2000).nullable().optional(),
  fitnessObjectives: z.array(z.string().trim()).optional(),
  preferredWorkoutTypes: z.array(z.string().trim()).optional(),
  dailyStepTarget: z.number().int().min(0).nullable().optional(),
  wakeUpTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  sleepTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  dietaryRestrictions: z.array(z.string().trim()).optional(),
  wellnessPreferences: z.array(z.string().trim()).optional(),
});

export const measurementSchema = z.object({
  weight: z.number().positive('Weight must be positive').nullable().optional(),
  height: z.number().positive('Height must be positive').nullable().optional(),
  bmi: z.number().positive('BMI must be positive').nullable().optional(),
  waist: z.number().positive('Waist must be positive').nullable().optional(),
  chest: z.number().positive('Chest must be positive').nullable().optional(),
  hips: z.number().positive('Hips must be positive').nullable().optional(),
  bodyFatPercentage: z.number().min(0).max(100).nullable().optional(),
  recordedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const professionalProfileSchema = z.object({
  occupation: z.string().trim().max(100).nullable().optional(),
  employmentStatus: z.string().trim().max(50).nullable().optional(),
  companyName: z.string().trim().max(150).nullable().optional(),
  industry: z.string().trim().max(100).nullable().optional(),
  experienceYears: z.number().min(0).max(80).nullable().optional(),
  educationLevel: z.string().trim().max(100).nullable().optional(),
  highestQualification: z.string().trim().max(150).nullable().optional(),
  skills: z.array(z.string().trim()).optional(),
  careerGoal: z.string().max(2000).nullable().optional(),
  workStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  workEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  workDays: z.array(z.string().trim()).optional(),
});

export const lifestyleProfileSchema = z.object({
  wakeUpTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  sleepTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format').nullable().optional(),
  workMode: z.enum(['office', 'remote', 'hybrid', 'other']).nullable().optional(),
  exerciseDays: z.array(z.string().trim()).optional(),
  preferredExercise: z.array(z.string().trim()).optional(),
  dietaryPreference: z.string().trim().max(50).nullable().optional(),
  smokingStatus: z.string().trim().max(30).nullable().optional(),
  alcoholPreference: z.string().trim().max(30).nullable().optional(),
  hobbies: z.array(z.string().trim()).optional(),
  personalInterests: z.array(z.string().trim()).optional(),
  lifestyleNotes: z.string().max(2000).nullable().optional(),
});

export const goalCategoryEnum = z.enum([
  'personal',
  'career',
  'health',
  'learning',
  'relationships',
  'lifestyle',
  'other',
]);

export const goalPriorityEnum = z.enum(['low', 'medium', 'high']);
export const goalStatusEnum = z.enum(['active', 'completed', 'paused', 'cancelled']);

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  category: goalCategoryEnum,
  priority: goalPriorityEnum,
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').nullable().optional(),
  status: goalStatusEnum.optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

export const updateGoalStatusSchema = z.object({
  status: goalStatusEnum,
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const goalsQuerySchema = paginationQuerySchema.extend({
  category: goalCategoryEnum.optional(),
  priority: goalPriorityEnum.optional(),
  status: goalStatusEnum.optional(),
});
