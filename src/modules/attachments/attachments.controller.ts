import { Request, Response, NextFunction } from 'express';
import { attachmentsService } from './attachments.service';

export const uploadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attachment = await attachmentsService.uploadAttachment(req.user!.id, req.body);
    res.status(201).json({ message: 'Attachment uploaded successfully.', attachment });
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
    res.status(200).json({ attachment });
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
    res.status(200).json({ attachments });
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
    res.status(200).json(result);
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
    res.status(200).json(result);
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
    res.status(200).json({ attachments });
  } catch (err) {
    next(err);
  }
};
