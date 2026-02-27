import express from 'express';

const router = express.Router();

// GET /status - System Status (mock)
router.get('/', (req, res) => {
  // TEMP - Mock response until poller service is complete
  res.json({
    latestBlock: 0,
    lag: 0,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;

