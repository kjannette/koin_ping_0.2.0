// API client for alert rule management

import { getAuthHeaders, getAuthHeadersSimple } from './authHeaders';
import { API_BASE } from './config';

/**
 * Alert types supported by the system
 */
export const ALERT_TYPES = {
  INCOMING_TX: 'incoming_tx',
  OUTGOING_TX: 'outgoing_tx',
  LARGE_TRANSFER: 'large_transfer',
  BALANCE_BELOW: 'balance_below'
};

/**
 * Create a new alert rule for an address
 * @param {number} addressId - Address ID
 * @param {Object} data - Alert rule data
 * @param {string} data.type - Alert type (one of ALERT_TYPES)
 * @param {string} [data.threshold] - Threshold value (required for large_transfer and balance_below)
 * @returns {Promise<Object>} Created alert rule
 */
export async function createAlert(addressId, data) {
  try {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/addresses/${addressId}/alerts`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
      let errorMessage = 'Failed to create alert rule';
      try {
    const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
  }
  
  return response.json();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
}

/**
 * Get all alert rules for an address
 * @param {number} addressId - Address ID
 * @returns {Promise<Array>} List of alert rules
 */
export async function getAlerts(addressId) {
  try {
  const headers = await getAuthHeadersSimple();
  const response = await fetch(`${API_BASE}/addresses/${addressId}/alerts`, {
    headers: headers
  });
  
  if (!response.ok) {
      let errorMessage = 'Failed to fetch alert rules';
      try {
    const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
  }
  
  return response.json();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
}

/**
 * Enable or disable an alert rule
 * @param {number} alertId - Alert rule ID
 * @param {boolean} enabled - Whether the alert should be enabled
 * @returns {Promise<Object>} Updated alert rule
 */
export async function updateAlertStatus(alertId, enabled) {
  try {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({ enabled })
  });
  
  if (!response.ok) {
      let errorMessage = 'Failed to update alert rule';
      try {
    const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
  }
  
  return response.json();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
}

/**
 * Delete an alert rule
 * @param {number} alertId - Alert rule ID
 * @returns {Promise<void>}
 */
export async function deleteAlert(alertId) {
  try {
  const headers = await getAuthHeadersSimple();
  const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'DELETE',
    headers: headers
  });
  
  if (!response.ok && response.status !== 204) {
      let errorMessage = 'Failed to delete alert rule';
      try {
    const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
}
