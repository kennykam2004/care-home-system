import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getInventoryRecords,
  createInventoryRecord,
  deleteInventoryRecord
} from '../controllers/inventory.controller.js';

const router = Router();

router.get('/', authenticate, getInventoryRecords);
router.post('/', authenticate, createInventoryRecord);
router.delete('/:id', authenticate, deleteInventoryRecord);

export default router;
