// API client for alert event history

import { getAuthHeadersSimple } from "./authHeaders";
import { API_BASE } from "./config";

/**
 * Get all alert events (history)
 * @returns {Promise<Array>} List of alert events, sorted by most recent first
 */
export async function getAlertEvents() {
    try {
        const headers = await getAuthHeadersSimple();
        const response = await fetch(`${API_BASE}/alert-events`, {
            headers: headers,
        });

        if (!response.ok) {
            let errorMessage = "Failed to fetch alert events";
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
