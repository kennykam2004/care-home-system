import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getBillPublishes, publishBill, deleteBillPublish } from '../controllers/billPublish.controller.js';

const router = Router();

router.get('/', authenticate, getBillPublishes);
router.post('/', authenticate, publishBill);
router.delete('/:id', authenticate, deleteBillPublish);

export default router;
