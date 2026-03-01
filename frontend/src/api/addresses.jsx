// API client for address management

import { getAuthHeaders, getAuthHeadersSimple } from "./authHeaders";
import { API_BASE } from "./config";

/**
 * Create a new blockchain address to monitor
 * @param {Object} data - Address data
 * @param {string} data.address - Blockchain address (0x...)
 * @param {string} [data.label] - Optional label for the address
 * @returns {Promise<Object>} Created address with id and metadata
 */
export async function createAddress(data) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/addresses`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            // Try to parse error response, but handle if it's not JSON
            let errorMessage = "Failed to create address";
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch {
                // If JSON parse fails, use status text
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        // Handle network errors
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Get all tracked addresses
 * @returns {Promise<Array>} List of all addresses
 */
export async function getAddresses() {
    try {
        const headers = await getAuthHeadersSimple();
        const response = await fetch(`${API_BASE}/addresses`, {
            headers: headers,
        });

        if (!response.ok) {
            // Try to parse error response, but handle if it's not JSON
            let errorMessage = "Failed to fetch addresses";
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch {
                // If JSON parse fails, use status text
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        // Handle network errors or JSON parse errors
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}

/**
 * Delete a tracked address
 * @param {number} addressId - Address ID to delete
 * @returns {Promise<void>}
 */
export async function deleteAddress(addressId) {
    try {
        const headers = await getAuthHeadersSimple();
        const response = await fetch(`${API_BASE}/addresses/${addressId}`, {
            method: "DELETE",
            headers: headers,
        });

        if (!response.ok && response.status !== 204) {
            // Try to parse error response, but handle if it's not JSON
            let errorMessage = "Failed to delete address";
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch {
                // If JSON parse fails, use status text
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        // Handle network errors
        if (error.message.includes("fetch")) {
            throw new Error(
                "Cannot connect to server. Is the backend running?",
            );
        }
        throw error;
    }
}
