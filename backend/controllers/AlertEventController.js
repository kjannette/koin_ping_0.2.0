import * as AlertEventModel from '../models/AlertEventModel.js';

// Mock data for when DB is empty (MVP scaffolding)
const MOCK_EVENTS = [
  {
    id: 1,
    alert_rule_id: 1,
    message: 'Incoming transaction detected: 5.5 ETH received',
    address_label: 'Treasury Wallet',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 2,
    alert_rule_id: 2,
    message: 'Balance dropped below threshold: Current balance 8.2 ETH',
    address_label: 'Treasury Wallet',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
  },
  {
    id: 3,
    alert_rule_id: 3,
    message: 'Outgoing transaction detected: 2.0 ETH sent',
    address_label: 'Cold Storage',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
];


export async function list(req, res) {
  const limit = parseInt(req.query.limit) || 20;
  const user_id = req.user_id; // From authenticate middleware

  console.log(`User ${user_id} listing alert events (limit: ${limit})`);


  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Limit must be between 1 and 100'
    });
  }

  const events = await AlertEventModel.listRecentByUser(user_id, limit);

  console.log(`Found ${events.length} alert events for user`);

  // Return mock data if DB is empty (MVP scaffolding)
  if (events.length === 0) {
    return res.json(MOCK_EVENTS.slice(0, limit));
  }

  return res.json(events);
}

