// API client for system status

import { API_BASE } from './config';

/**
 * Get system status including latest processed block and health
 * @returns {Promise<Object>} System status
 */
export async function getSystemStatus() {
  const response = await fetch(`${API_BASE}/status`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch system status');
  }
  
  return response.json();
}
