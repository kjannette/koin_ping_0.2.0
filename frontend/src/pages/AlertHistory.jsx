import { useState, useEffect } from "react";
import { getAlertEvents } from "../api/alertEvents";

export default function AlertHistory() {
    const [alertEvents, setAlertEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch alert events on mount
    useEffect(() => {
        async function fetchAlertEvents() {
            try {
                setLoading(true);
                const data = await getAlertEvents();
                setAlertEvents(data);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch alert events:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAlertEvents();
    }, []);

    if (loading) {
        return <div style={{ padding: "2rem" }}>Loading...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: "2rem", color: "red" }}>Error: {error}</div>
        );
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
            <h1>Recent Alert Events</h1>

            {alertEvents.length === 0 ? (
                <p style={{ color: "#808080" }}>No alerts yet</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {alertEvents.map((event) => (
                        <li
                            key={event.id}
                            style={{
                                padding: "1rem",
                                marginBottom: "0.75rem",
                                border: "1px solid #444",
                                borderRadius: "4px",
                                backgroundColor: "#333",
                            }}
                        >
                            <div style={{ marginBottom: "0.5rem" }}>
                                {event.message}
                            </div>
                            {event.address_label && (
                                <div
                                    style={{
                                    fontSize: "1.035rem",
                                    color: "#808080",
                                        marginBottom: "0.25rem",
                                    }}
                                >
                                    Address: {event.address_label}
                                </div>
                            )}
                            <small style={{ color: "#b3b3b3" }}>
                                {formatTimestamp(event.timestamp)}
                            </small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Helper to format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}
