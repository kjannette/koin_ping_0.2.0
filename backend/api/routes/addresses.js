import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as AddressController from '../../controllers/AddressController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// POST /addresses - Create Blockchain Address
router.post('/', AddressController.create);

// GET /addresses - List Addresses
router.get('/', AddressController.list);

// DELETE /addresses/:addressId - Delete Address
router.delete('/:addressId', AddressController.remove);

export default router;

