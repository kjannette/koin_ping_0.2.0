import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as NotificationConfigController from '../../controllers/NotificationConfigController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', NotificationConfigController.getConfig);

router.put('/', NotificationConfigController.updateConfig);

router.delete('/', NotificationConfigController.deleteConfig);

export default router;

