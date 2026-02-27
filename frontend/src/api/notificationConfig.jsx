import { getAuthHeaders } from './authHeaders';
import { API_BASE } from './config';

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
 * @param {string} [config.slack_webhook_url] - Slack webhook URL
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
 * Test a webhook URL by sending a test message via the backend
 * @param {string} type - 'discord' or 'slack'
 * @param {string} webhookUrl - Webhook URL to test
 * @returns {Promise<boolean>} True if test successful
 */
async function testWebhook(type, webhookUrl) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/notification-config/test`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ type, url: webhookUrl })
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`${type} webhook test failed:`, error);
    return false;
  }
}

/**
 * Test a Discord webhook URL
 * @param {string} webhookUrl - Discord webhook URL to test
 * @returns {Promise<boolean>} True if test successful
 */
export async function testDiscordWebhook(webhookUrl) {
  return testWebhook('discord', webhookUrl);
}

/**
 * Test a Slack webhook URL
 * @param {string} webhookUrl - Slack webhook URL to test
 * @returns {Promise<boolean>} True if test successful
 */
export async function testSlackWebhook(webhookUrl) {
  return testWebhook('slack', webhookUrl);
}
