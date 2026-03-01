import { getAuthHeaders } from "./authHeaders";
import { API_BASE } from "./config";

/**
 * Get notification configuration for current user
 * @returns {Promise<Object>} Notification config
 */
export async function getNotificationConfig() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/notification-config`, {
            headers: headers,
        });

        if (!response.ok) {
            let errorMessage = "Failed to fetch notification config";
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
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Update notification configuration
 * @param {Object} config
 * @param {string} [config.discord_webhook_url]
 * @param {string} [config.telegram_chat_id]
 * @param {string} [config.telegram_bot_token]
 * @param {string} [config.email]
 * @param {string} [config.slack_webhook_url]
 * @param {boolean} [config.notification_enabled]
 * @returns {Promise<Object>} Updated config
 */
export async function updateNotificationConfig(config) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/notification-config`, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            let errorMessage = "Failed to update notification config";
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
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Set up email notifications via Resend.
 * Reads the user's saved email from their config and sends a confirmation.
 * @returns {Promise<Object>} Setup result
 */
export async function setupEmail() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/email/setup`, {
            method: "POST",
            headers: headers,
        });

        if (!response.ok) {
            let errorMessage = "Failed to set up email";
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
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Send an alert digest email to the user's configured email address.
 * @returns {Promise<Object>} Digest send result
 */
export async function sendEmailDigest() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/email/digest`, {
            method: "POST",
            headers: headers,
        });

        if (!response.ok) {
            let errorMessage = "Failed to send digest";
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
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Test all configured notification channels via the backend
 * @returns {Promise<Object>} Results per channel
 */
export async function testNotificationChannels() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE}/notification-config/test`,
            {
                method: "POST",
                headers: headers,
            },
        );

        if (!response.ok) {
            let errorMessage = "Failed to test notification channels";
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
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}
