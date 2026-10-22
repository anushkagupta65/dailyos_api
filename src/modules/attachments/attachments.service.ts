import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { withTransaction, pool } from '../../config/database';
import { attachmentsRepository } from './attachments.repository';

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION
);

export const getAttachmentsDir = (): string => {
  if (process.env.STORAGE_DIR) {
    return path.join(process.env.STORAGE_DIR, 'attachments');
  }
  if (isServerless) {
    return path.join(os.tmpdir(), 'storage', 'attachments');
  }
  return path.join(process.cwd(), 'storage', 'attachments');
};

export class AttachmentsService {
  constructor() {
    // Avoid synchronous directory creation at module evaluation time.
    // In Vercel serverless functions, process.cwd() is read-only (/var/task),
    // so filesystem initialization is performed lazily when writing files.
  }

  private ensureStorageDir(): string {
    const primaryDir = getAttachmentsDir();
    try {
      if (!fs.existsSync(primaryDir)) {
        fs.mkdirSync(primaryDir, { recursive: true });
      }
      return primaryDir;
    } catch (err) {
      // If primaryDir is not writable (e.g. read-only filesystem), fallback to os.tmpdir()
      const fallbackDir = path.join(os.tmpdir(), 'storage', 'attachments');
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        return fallbackDir;
      } catch (fallbackErr) {
        console.error(`Failed to create attachments directory at ${fallbackDir}:`, fallbackErr);
        throw {
          status: 500,
          message: 'Unable to initialize attachment storage directory.',
        };
      }
    }
  }

  private resolveFilePath(storedFileName: string): string | null {
    // 1. Check primary/configured storage directory
    const primaryPath = path.join(getAttachmentsDir(), storedFileName);
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }

    // 2. Check /tmp fallback path
    const tmpPath = path.join(os.tmpdir(), 'storage', 'attachments', storedFileName);
    if (fs.existsSync(tmpPath)) {
      return tmpPath;
    }

    // 3. Check local development path (only if not serverless)
    if (!isServerless) {
      const localPath = path.join(process.cwd(), 'storage', 'attachments', storedFileName);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }

    return null;
  }

  async uploadAttachment(
    userId: string,
    payload: {
      entityType: string;
      entityId: string;
      fileName: string;
      mimeType: string;
      fileData: string;
    }
  ) {
    const isOwner = await attachmentsRepository.verifyEntityOwnership(
      userId,
      payload.entityType,
      payload.entityId
    );
    if (!isOwner) {
      throw {
        status: 403,
        message: `You do not have permission to attach files to this ${payload.entityType}.`,
      };
    }

    const base64Data = payload.fileData.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSize = buffer.length;

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (fileSize > MAX_SIZE) {
      throw {
        status: 400,
        message: 'File size exceeds maximum allowed limit of 15MB.',
      };
    }

    const safeFileName = path.basename(payload.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const attachmentId = crypto.randomUUID();
    const storedFileName = `${attachmentId}_${safeFileName}`;
    const storageDir = this.ensureStorageDir();
    const filePath = path.join(storageDir, storedFileName);

    if (isServerless) {
      console.warn(
        `[STORAGE WARNING] Attachment ${attachmentId} stored temporarily at ephemeral serverless path: ${filePath}. ` +
        `This file will NOT persist across serverless instance recycles. ` +
        `Persistent cloud storage (e.g. Supabase Storage or AWS S3) is required for permanent storage in production.`
      );
    }

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/api/attachments/${attachmentId}/download`;

    return withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO user_attachments (
           id, user_id, entity_type, entity_id, file_name, file_url, mime_type, file_size
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          attachmentId,
          userId,
          payload.entityType,
          payload.entityId,
          payload.fileName,
          fileUrl,
          payload.mimeType,
          fileSize,
        ]
      );
      const attachment = rows[0];

      // If this is a profile photo, also update user_profiles.profile_photo_url
      if (
        (payload.entityType === 'profile' || payload.entityType === 'profile_picture') &&
        payload.mimeType.startsWith('image/')
      ) {
        await client.query(
          `UPDATE user_profiles
           SET profile_photo_url = $1, updated_at = NOW()
           WHERE user_id = $2`,
          [fileUrl, userId]
        );
      }

      // If this is a receipt or transaction, also update financial_transactions.attachment_url
      if (
        (payload.entityType === 'receipt' || payload.entityType === 'transaction')
      ) {
        await client.query(
          `UPDATE financial_transactions
           SET attachment_url = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [fileUrl, payload.entityId, userId]
        );
      }

      return attachment;
    });
  }

  async getAttachmentById(userId: string, id: string) {
    const attachment = await attachmentsRepository.getAttachmentById(userId, id);
    if (!attachment) {
      throw { status: 404, message: 'Attachment not found.' };
    }
    return attachment;
  }

  async getAttachmentFile(userId: string, id: string) {
    const attachment = await this.getAttachmentById(userId, id);
    const safeFileName = path.basename(attachment.file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${attachment.id}_${safeFileName}`;
    const filePath = this.resolveFilePath(storedFileName);

    if (!filePath || !fs.existsSync(filePath)) {
      throw { status: 404, message: 'Attachment file not found on disk.' };
    }

    return {
      filePath,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
    };
  }

  async getAttachmentsByEntity(userId: string, entityType: string, entityId: string) {
    const isOwner = await attachmentsRepository.verifyEntityOwnership(userId, entityType, entityId);
    if (!isOwner) {
      throw { status: 403, message: 'Access denied for requested entity attachments.' };
    }
    return attachmentsRepository.getAttachmentsByEntity(userId, entityType, entityId);
  }

  async listAttachments(userId: string, filters: any) {
    return attachmentsRepository.listAttachments(userId, filters);
  }

  async deleteAttachment(userId: string, id: string) {
    const attachment = await this.getAttachmentById(userId, id);

    const safeFileName = path.basename(attachment.file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${attachment.id}_${safeFileName}`;
    const filePath = this.resolveFilePath(storedFileName);

    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to remove file from disk:', err);
      }
    }

    await withTransaction(async (client) => {
      await attachmentsRepository.deleteAttachment(client, userId, id);
    });

    return { message: 'Attachment deleted successfully.' };
  }
}

export const attachmentsService = new AttachmentsService();
