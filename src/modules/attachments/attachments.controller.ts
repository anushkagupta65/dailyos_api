import { Request, Response, NextFunction } from 'express';
import { attachmentsService } from './attachments.service';
import { sendSuccess } from '../../utils/response';

export const uploadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attachment = await attachmentsService.uploadAttachment(req.user!.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Attachment uploaded successfully.',
      data: { attachment },
    });
  } catch (err) {
    next(err);
  }
};

export const getAttachmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attachment = await attachmentsService.getAttachmentById(
      req.user!.id,
      req.params.id as string
    );
    sendSuccess(res, {
      status: 200,
      message: 'Attachment retrieved successfully.',
      data: { attachment },
    });
  } catch (err) {
    next(err);
  }
};

export const downloadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filePath, fileName, mimeType } = await attachmentsService.getAttachmentFile(
      req.user!.id,
      req.params.id as string
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

export const getAttachmentsByEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const attachments = await attachmentsService.getAttachmentsByEntity(
      req.user!.id,
      entityType as string,
      entityId as string
    );
    sendSuccess(res, {
      status: 200,
      message: 'Attachments retrieved successfully.',
      data: { attachments },
    });
  } catch (err) {
    next(err);
  }
};

export const listAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = res.locals.validatedQuery || req.query;
    const result = await attachmentsService.listAttachments(req.user!.id, query);
    sendSuccess(res, {
      status: 200,
      message: 'Attachments retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await attachmentsService.deleteAttachment(
      req.user!.id,
      req.params.id as string
    );
    sendSuccess(res, {
      status: 200,
      message: result.message || 'Attachment deleted successfully.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

export const getProfileAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attachments = await attachmentsService.getAttachmentsByEntity(
      req.user!.id,
      'profile',
      req.user!.id
    );
    sendSuccess(res, {
      status: 200,
      message: 'Profile attachments retrieved successfully.',
      data: { attachments },
    });
  } catch (err) {
    next(err);
  }
};
