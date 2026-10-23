import { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service';
import { sendSuccess } from '../../utils/response';

// ---------------- PERSONAL PROFILE ----------------
export const getPersonalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await profileService.getPersonalProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Personal profile retrieved successfully.',
      data: { profile },
    });
  } catch (err) {
    next(err);
  }
};

export const updatePersonalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await profileService.upsertPersonalProfile(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Personal profile updated successfully.',
      data: { profile },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await profileService.updateProfilePhoto(
      req.user!.id,
      req.body.profilePhotoUrl
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Profile photo updated successfully.',
      data: { profilePhotoUrl: result.profilePhotoUrl },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- HEALTH PROFILE ----------------
export const getHealthProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health = await profileService.getHealthProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Health profile retrieved successfully.',
      data: { health },
    });
  } catch (err) {
    next(err);
  }
};

export const updateHealthProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const health = await profileService.upsertHealthProfile(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Health profile updated successfully.',
      data: { health },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHealthProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await profileService.deleteHealthProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Health profile deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- BODY MEASUREMENTS ----------------
export const addBodyMeasurement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const measurement = await profileService.addBodyMeasurement(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Body measurement recorded successfully.',
      data: { measurement },
    });
  } catch (err) {
    next(err);
  }
};

export const getBodyMeasurements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const result = await profileService.getBodyMeasurements(req.user!.id, page, limit);
    sendSuccess(res, {
      status: 200,
      message: 'Body measurements retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const updateBodyMeasurement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const measurement = await profileService.updateBodyMeasurement(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Body measurement updated successfully.',
      data: { measurement },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBodyMeasurement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await profileService.deleteBodyMeasurement(
      req.user!.id,
      req.params.id as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Body measurement deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- PROFESSIONAL PROFILE ----------------
export const getProfessionalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const professional = await profileService.getProfessionalProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Professional profile retrieved successfully.',
      data: { professional },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfessionalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const professional = await profileService.upsertProfessionalProfile(
      req.user!.id,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Professional profile updated successfully.',
      data: { professional },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LIFESTYLE PROFILE ----------------
export const getLifestyleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lifestyle = await profileService.getLifestyleProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Lifestyle profile retrieved successfully.',
      data: { lifestyle },
    });
  } catch (err) {
    next(err);
  }
};

export const updateLifestyleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lifestyle = await profileService.upsertLifestyleProfile(req.user!.id, req.body);
    sendSuccess(res, {
      status: 200,
      message: 'Lifestyle profile updated successfully.',
      data: { lifestyle },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- PERSONAL GOALS ----------------
export const createGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await profileService.createGoal(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Personal goal created successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const getGoals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery;

    const result = await profileService.getGoals(req.user!.id, {
      category: query.category as string,
      priority: query.priority as string,
      status: query.status as string,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
    sendSuccess(res, {
      status: 200,
      message: 'Personal goals retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getGoalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await profileService.getGoalById(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: 'Personal goal retrieved successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const updateGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await profileService.updateGoal(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, {
      status: 200,
      message: 'Personal goal updated successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const updateGoalStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await profileService.updateGoalStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );
    sendSuccess(res, {
      status: 200,
      message: 'Personal goal status updated successfully.',
      data: { goal },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await profileService.deleteGoal(req.user!.id, req.params.id as string);
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Personal goal deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- COMPLETE PROFILE ----------------
export const getCompleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await profileService.getCompleteProfile(req.user!.id);
    sendSuccess(res, {
      status: 200,
      message: 'Complete profile retrieved successfully.',
      data: { profile: result },
    });
  } catch (err) {
    next(err);
  }
};
