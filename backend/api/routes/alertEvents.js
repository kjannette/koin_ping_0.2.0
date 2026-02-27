import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as AlertEventController from '../../controllers/AlertEventController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', AlertEventController.list);

export default router;

