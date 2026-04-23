import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getServiceRecords,
  createServiceRecord,
  deleteServiceRecord
} from '../controllers/serviceRecord.controller.js';

const router = Router();

router.get('/', authenticate, getServiceRecords);
router.post('/', authenticate, createServiceRecord);
router.delete('/:id', authenticate, deleteServiceRecord);

export default router;
