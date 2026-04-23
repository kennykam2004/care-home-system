import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser, resetPassword, getRoles } from '../controllers/user.controller.js';

const router = Router();

router.get('/roles', authenticate, getRoles);
router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUserById);
router.post('/', authenticate, requireRole('院長'), createUser);
router.put('/:id', authenticate, requireRole('院長'), updateUser);
router.delete('/:id', authenticate, requireRole('院長'), deleteUser);
router.post('/:id/reset-password', authenticate, requireRole('院長'), resetPassword);

export default router;
