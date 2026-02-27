import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as AlertRuleController from '../../controllers/AlertRuleController.js';

const router = express.Router();

router.use(authenticate);

router.post('/:addressId/alerts', AlertRuleController.create);

router.get('/:addressId/alerts', AlertRuleController.listByAddress);

router.patch('/:alertId', AlertRuleController.updateStatus);

router.delete('/:alertId', AlertRuleController.remove);

export default router;

