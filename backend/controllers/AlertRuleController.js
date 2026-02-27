import * as AlertRuleModel from '../models/AlertRuleModel.js';
import * as AddressModel from '../models/AddressModel.js';

const VALID_ALERT_TYPES = ['incoming_tx', 'outgoing_tx', 'large_transfer', 'balance_below'];
const THRESHOLD_REQUIRED_TYPES = ['large_transfer', 'balance_below'];

/**
 * Create a new alert rule
 */
export async function create(req, res) {
  const addressId = parseInt(req.params.addressId);
  const { type, threshold } = req.body;
  const user_id = req.user_id; // From authenticate middleware

  console.log(`User ${user_id} creating alert for address ID: ${addressId}`);

  if (isNaN(addressId)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid address ID'
    });
  }


  if (!type) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Alert type is required'
    });
  }

  // Validation: type must be valid
  if (!VALID_ALERT_TYPES.includes(type)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `Invalid alert type. Must be one of: ${VALID_ALERT_TYPES.join(', ')}`
    });
  }


  if (THRESHOLD_REQUIRED_TYPES.includes(type)) {
    if (!threshold || threshold === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Alert type '${type}' requires a threshold value`
      });
    }


    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Threshold must be a positive number'
      });
    }
  }

  try {
    // Verify address exists AND belongs to this user
    const address = await AddressModel.findById(addressId, user_id);
    if (!address) {
      console.log(`Address ${addressId} not found or not owned by user`);
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Address not found'
      });
    }

    const newAlert = await AlertRuleModel.create(
      addressId,
      type,
      threshold || null
    );

    console.log(`Alert rule created with ID: ${newAlert.id}`);
    return res.status(201).json(newAlert);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create alert rule'
    });
  }
}


export async function listByAddress(req, res) {
  const addressId = parseInt(req.params.addressId);
  const user_id = req.user_id; // From authenticate middleware

  console.log(`User ${user_id} listing alerts for address ID: ${addressId}`);

  if (isNaN(addressId)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid address ID'
    });
  }


  const address = await AddressModel.findById(addressId, user_id);
  if (!address) {
    console.log(`Address ${addressId} not found or not owned by user`);
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Address not found'
    });
  }

  const alerts = await AlertRuleModel.listByAddress(addressId);
  console.log(`Found ${alerts.length} alert rules`);
  return res.json(alerts);
}


export async function updateStatus(req, res) {
  const alertId = parseInt(req.params.alertId);
  const { enabled } = req.body;
  const user_id = req.user_id; 

  console.log(`User ${user_id} updating alert ID: ${alertId}`);

  // Validation: alertId must be valid
  if (isNaN(alertId)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid alert ID'
    });
  }

  // Validation: enabled must be boolean
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'enabled must be a boolean value'
    });
  }

  // Verify user owns this alert (through address ownership)
  const alert = await AlertRuleModel.findById(alertId, user_id);
  if (!alert) {
    console.log(`Alert ${alertId} not found or not owned by user`);
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Alert rule not found'
    });
  }

  const updatedAlert = await AlertRuleModel.updateEnabled(alertId, enabled);

  console.log(`Alert ${alertId} updated: enabled=${enabled}`);
  return res.json(updatedAlert);
}


export async function remove(req, res) {
  const alertId = parseInt(req.params.alertId);
  const user_id = req.user_id; 

  console.log(`User ${user_id} deleting alert ID: ${alertId}`);

  if (isNaN(alertId)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid alert ID'
    });
  }


  const alert = await AlertRuleModel.findById(alertId, user_id);
  if (!alert) {
    console.log(`Alert ${alertId} not found or not owned by user`);
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Alert rule not found'
    });
  }

  const deleted = await AlertRuleModel.remove(alertId);

  console.log(`Alert ${alertId} deleted`);
  return res.status(204).send();
}

