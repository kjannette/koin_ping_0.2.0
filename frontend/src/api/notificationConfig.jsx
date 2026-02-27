// API client for notification configuration

import { getAuthHeaders } from './authHeaders';

const API_BASE = '/api';

/**
 * Get notification configuration for current user
 * @returns {Promise<Object>} Notification config
 */
export async function getNotificationConfig() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/notification-config`, {
      headers: headers
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch notification config';
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
 * Update notification configuration
 * @param {Object} config - Configuration to update
 * @param {string} [config.discord_webhook_url] - Discord webhook URL
 * @param {string} [config.telegram_chat_id] - Telegram chat ID
 * @param {string} [config.email] - Email address
 * @param {boolean} [config.notification_enabled] - Enable/disable notifications
 * @returns {Promise<Object>} Updated config
 */
export async function updateNotificationConfig(config) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/notification-config`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to update notification config';
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
 * Test a Discord webhook URL
 * Sends a test message to verify the webhook works
 * @param {string} webhookUrl - Discord webhook URL to test
 * @returns {Promise<boolean>} True if test successful
 */
export async function testDiscordWebhook(webhookUrl) {
  try {
    const payload = {
      content: 'Koin Ping test notification - Your Discord webhook is configured correctly!',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Discord webhook test failed:', error);
    return false;
  }
}

