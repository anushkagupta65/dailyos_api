import { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service';

// ---------------- PERSONAL PROFILE ----------------
export const getPersonalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await profileService.getPersonalProfile(req.user!.id);
    res.status(200).json({ profile });
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
    res.status(200).json({ profile });
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
    res.status(200).json(result);
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
    res.status(200).json({ health });
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
    res.status(200).json({ health });
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
    res.status(200).json(result);
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
    res.status(201).json({ measurement });
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
    res.status(200).json(result);
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
    res.status(200).json({ measurement });
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
    res.status(200).json(result);
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
    res.status(200).json({ professional });
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
    res.status(200).json({ professional });
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
    res.status(200).json({ lifestyle });
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
    res.status(200).json({ lifestyle });
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
    res.status(201).json({ goal });
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
    res.status(200).json(result);
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
    res.status(200).json({ goal });
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
    res.status(200).json({ goal });
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
    res.status(200).json({ goal });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
