import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  registerDevice,
  listDevices,
  getDevice,
  deleteDevice,
  getSyncStatus,
  pull,
  push,
} from './sync.controller';
import {
  idParamSchema,
  registerDeviceSchema,
  syncPullSchema,
  syncPushSchema,
  syncStatusQuerySchema,
} from './sync.validation';

const router = Router();

// All sync endpoints require authentication
router.use(authenticate);

// ---------------- DEVICES ----------------
router.post('/devices', validate({ body: registerDeviceSchema }), registerDevice);
router.get('/devices', listDevices);
router.get('/devices/:id', validate({ params: idParamSchema }), getDevice);
router.delete('/devices/:id', validate({ params: idParamSchema }), deleteDevice);

// ---------------- SYNCHRONIZATION ----------------
router.get('/status', validate({ query: syncStatusQuerySchema }), getSyncStatus);
router.post('/pull', validate({ body: syncPullSchema }), pull);
router.post('/push', validate({ body: syncPushSchema }), push);

export default router;
