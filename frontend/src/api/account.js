import { getAuthHeaders } from "./authHeaders";
import { API_BASE } from "./config";

export async function getAccount() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/user/account`, { headers });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load account");
    }
    return res.json();
}

export async function createPortalSession() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/stripe/create-portal-session`, {
        method: "POST",
        headers,
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create portal session");
    }
    return res.json();
}
