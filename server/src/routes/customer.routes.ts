import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember
} from '../controllers/customer.controller.js';

const router = Router();

router.get('/', authenticate, getCustomers);
router.get('/:id', authenticate, getCustomer);
router.post('/', authenticate, createCustomer);
router.put('/:id', authenticate, updateCustomer);
router.delete('/:id', authenticate, deleteCustomer);

// Family members
router.post('/:customerId/family', authenticate, addFamilyMember);
router.put('/family/:id', authenticate, updateFamilyMember);
router.delete('/family/:id', authenticate, deleteFamilyMember);

export default router;
