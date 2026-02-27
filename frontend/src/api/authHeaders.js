/**
 * Auth Headers Helper
 * 
 * Provides authentication headers for API calls
 * Includes Firebase ID token in Authorization header
 */

import { auth } from '../firebase/config';

/**
 * Get headers with authentication token
 * @returns {Promise<Object>} Headers object with Authorization
 */
export async function getAuthHeaders() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  // Get Firebase ID token
  const token = await currentUser.getIdToken();

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Get headers for non-JSON requests (e.g., DELETE with no body)
 * @returns {Promise<Object>} Headers object with Authorization
 */
export async function getAuthHeadersSimple() {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  const token = await currentUser.getIdToken();

  return {
    'Authorization': `Bearer ${token}`
  };
}

