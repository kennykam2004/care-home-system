import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
  deductPrepaid
} from '../controllers/bill.controller.js';

const router = Router();

router.get('/', authenticate, getBills);
router.get('/:id', authenticate, getBill);
router.post('/', authenticate, createBill);
router.put('/:id', authenticate, updateBill);
router.delete('/:id', authenticate, deleteBill);
router.post('/deduct-prepaid', authenticate, deductPrepaid);

export default router;
