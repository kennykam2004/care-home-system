import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService
} from '../controllers/service.controller.js';

const router = Router();

router.get('/', authenticate, getServices);
router.get('/:id', authenticate, getService);
router.post('/', authenticate, createService);
router.put('/:id', authenticate, updateService);
router.delete('/:id', authenticate, deleteService);

export default router;
