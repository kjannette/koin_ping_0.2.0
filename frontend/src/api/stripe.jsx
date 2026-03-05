import { getAuthHeaders } from "./authHeaders";
import { API_BASE } from "./config";

export async function createCheckoutSession() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
        method: "POST",
        headers,
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create checkout session");
    }
    return res.json();
}

export async function verifyCheckoutSession(sessionId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stripe/verify-checkout`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to verify checkout session");
    }
    return res.json();
}

export async function getSubscriptionStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stripe/subscription-status`, {
        headers,
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to get subscription status");
    }
    return res.json();
}
