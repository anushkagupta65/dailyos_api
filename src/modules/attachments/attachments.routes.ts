import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  uploadAttachment,
  getAttachmentById,
  downloadAttachment,
  getAttachmentsByEntity,
  listAttachments,
  deleteAttachment,
} from './attachments.controller';
import {
  idParamSchema,
  uploadAttachmentSchema,
  attachmentsQuerySchema,
  entityParamsSchema,
} from './attachments.validation';

const router = Router();

// All attachment endpoints require authentication
router.use(authenticate);

// ---------------- ATTACHMENTS ----------------
router.post('/', validate({ body: uploadAttachmentSchema }), uploadAttachment);
router.get('/', validate({ query: attachmentsQuerySchema }), listAttachments);
router.get('/entity/:entityType/:entityId', validate({ params: entityParamsSchema }), getAttachmentsByEntity);
router.get('/:id/download', validate({ params: idParamSchema }), downloadAttachment);
router.get('/:id', validate({ params: idParamSchema }), getAttachmentById);
router.delete('/:id', validate({ params: idParamSchema }), deleteAttachment);

export default router;
