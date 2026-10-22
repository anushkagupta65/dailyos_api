import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  requestExport,
  listExports,
  getExportById,
  downloadExport,
  requestImport,
  listImports,
  getImportById,
} from './data.controller';
import {
  requestExportSchema,
  listExportsQuerySchema,
  requestImportSchema,
  listImportsQuerySchema,
  idParamSchema,
} from './data.validation';

const router = Router();

// All data management endpoints require authentication
router.use(authenticate);

// ---------------- EXPORTS ----------------
router.post('/exports', validate({ body: requestExportSchema }), requestExport);
router.get('/exports', validate({ query: listExportsQuerySchema }), listExports);
router.get('/exports/:id', validate({ params: idParamSchema }), getExportById);
router.get('/exports/:id/download', validate({ params: idParamSchema }), downloadExport);

// ---------------- IMPORTS ----------------
router.post('/imports', validate({ body: requestImportSchema }), requestImport);
router.get('/imports', validate({ query: listImportsQuerySchema }), listImports);
router.get('/imports/:id', validate({ params: idParamSchema }), getImportById);

export default router;
