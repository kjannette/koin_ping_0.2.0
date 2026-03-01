import { useState, useEffect } from "react";
import AlertForm from "../components/AlertForm";
import Button from "../components/Button";
import Input from "../components/Input";
import { getAddresses } from "../api/addresses";
import {
    getAlerts,
    createAlert,
    updateAlertStatus,
    deleteAlert,
} from "../api/alerts";
import {
    getNotificationConfig,
    updateNotificationConfig,
    testDiscordWebhook,
} from "../api/notificationConfig";

export default function Alerts() {
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Notification config state
    const [notificationConfig, setNotificationConfig] = useState(null);
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationError, setNotificationError] = useState(null);
    const [notificationSuccess, setNotificationSuccess] = useState(null);
    const [testingWebhook, setTestingWebhook] = useState(false);

    // Load addresses and notification config on mount
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Fetch addresses
                const addressData = await getAddresses();
                setAddresses(addressData);
                if (addressData.length > 0) {
                    setSelectedAddressId(addressData[0].id);
                }

                // Fetch notification config
                const configData = await getNotificationConfig();
                setNotificationConfig(configData);
                setDiscordWebhookUrl(configData.discord_webhook_url || "");
                setNotificationEnabled(
                    configData.notification_enabled !== false,
                );
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Load alerts when address is selected
    useEffect(() => {
        if (!selectedAddressId) {
            setAlerts([]);
            return;
        }

        async function fetchAlerts() {
            try {
                const data = await getAlerts(selectedAddressId);
                setAlerts(data);
                setError(null); // Clear any previous errors
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch alerts:", err);
            }
        }

        fetchAlerts();
    }, [selectedAddressId]);

    // Handle new alert submission
    async function handleAlertSubmit(data) {
        if (!selectedAddressId) return;

        try {
            const newAlert = await createAlert(selectedAddressId, data);
            setAlerts((prev) => [...prev, newAlert]);
            setError(null); // Clear any previous errors
        } catch (err) {
            setError(err.message);
            console.error("Failed to create alert:", err);
        }
    }

    // Toggle alert enabled/disabled
    async function handleToggleAlert(alertId, currentStatus) {
        try {
            const updated = await updateAlertStatus(alertId, !currentStatus);
            setAlerts((prev) =>
                prev.map((alert) => (alert.id === alertId ? updated : alert)),
            );
            setError(null); // Clear any previous errors
        } catch (err) {
            setError(err.message);
            console.error("Failed to update alert:", err);
        }
    }

    // Delete alert
    async function handleDeleteAlert(alertId) {
        try {
            await deleteAlert(alertId);
            setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
            setError(null); // Clear any previous errors
        } catch (err) {
            setError(err.message);
            console.error("Failed to delete alert:", err);
        }
    }

    // Save notification config
    async function handleSaveNotificationConfig() {
        try {
            setNotificationLoading(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            const config = {
                discord_webhook_url: discordWebhookUrl || null,
                notification_enabled: notificationEnabled,
            };

            const updated = await updateNotificationConfig(config);
            setNotificationConfig(updated);
            setNotificationSuccess("Notification settings saved!");

            // Clear success message after 3 seconds
            setTimeout(() => setNotificationSuccess(null), 3000);
        } catch (err) {
            setNotificationError(err.message);
            console.error("Failed to save notification config:", err);
        } finally {
            setNotificationLoading(false);
        }
    }

    // Test Discord webhook
    async function handleTestWebhook() {
        if (!discordWebhookUrl) {
            setNotificationError("Please enter a Discord webhook URL first");
            return;
        }

        try {
            setTestingWebhook(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            const success = await testDiscordWebhook(discordWebhookUrl);

            if (success) {
                setNotificationSuccess(
                    "Test notification sent! Check your Discord channel.",
                );
                setTimeout(() => setNotificationSuccess(null), 5000);
            } else {
                setNotificationError("Test failed. Check your webhook URL.");
            }
        } catch (err) {
            setNotificationError("Test failed: " + err.message);
        } finally {
            setTestingWebhook(false);
        }
    }

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

    if (loading) {
        return <div style={{ padding: "2rem" }}>Loading addresses...</div>;
    }

    if (addresses.length === 0) {
        return (
            <div style={{ padding: "2rem" }}>
                <p>
                    No addresses tracked yet. Add an address first to create
                    alerts.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
            <h1 style={{ marginBottom: "2rem" }}>
                Alert Rules & Notifications
            </h1>

            {/* Two-column layout */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                }}
            >
                {/* LEFT COLUMN: Alert Rules */}
                <div>
                    <h2 style={{ marginTop: 0 }}>Alert Rules</h2>

                    {/* Address selector */}
                    <div style={{ marginBottom: "2rem" }}>
                        <label
                            style={{ display: "block", marginBottom: "0.5rem" }}
                        >
                            <strong>Select Address:</strong>
                        </label>
                        <select
                            value={selectedAddressId || ""}
                            onChange={(e) =>
                                setSelectedAddressId(Number(e.target.value))
                            }
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                fontSize: "1rem",
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #444",
                                borderRadius: "4px",
                                color: "white",
                            }}
                        >
                            {addresses.map((addr) => (
                                <option key={addr.id} value={addr.id}>
                                    {addr.label || "Unlabeled"} - {addr.address}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedAddress && (
                        <>
                            {/* Current address info */}
                            <div
                                style={{
                                    padding: "1rem",
                                    marginBottom: "2rem",
                                    backgroundColor: "#333",
                                    borderRadius: "4px",
                                    border: "1px solid #444",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "1.035rem",
                                        color: "#b3b3b3",
                                    }}
                                >
                                    Managing alerts for:
                                </div>
                                <div
                                    style={{
                                        fontWeight: "bold",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    {selectedAddress.label || "Unlabeled"}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: "1.035rem",
                                        color: "#b3b3b3",
                                    }}
                                >
                                    {selectedAddress.address}
                                </div>
                            </div>

                            {/* Alert creation form */}
                            <div style={{ marginBottom: "2rem" }}>
                                <h3>Create New Alert</h3>
                                <AlertForm onSubmit={handleAlertSubmit} />
                            </div>

                            {/* Existing alerts list */}
                            <div>
                                <h3>Active Alert Rules</h3>
                                {error && (
                                    <p style={{ color: "red" }}>
                                        Error: {error}
                                    </p>
                                )}
                                {alerts.length === 0 ? (
                                    <p style={{ color: "#666" }}>
                                        No alert rules defined yet. Create one
                                        above.
                                    </p>
                                ) : (
                                    <ul
                                        style={{
                                            listStyle: "none",
                                            padding: 0,
                                        }}
                                    >
                                        {alerts.map((alert) => (
                                            <li
                                                key={alert.id}
                                                style={{
                                                    padding: "1rem",
                                                    marginBottom: "0.5rem",
                                                    border: "1px solid #444",
                                                    borderRadius: "4px",
                                                                    backgroundColor: "#333",
                                                    opacity: alert.enabled
                                                        ? 1
                                                        : 0.6,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems:
                                                            "flex-start",
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div
                                                            style={{
                                                                fontWeight:
                                                                    "bold",
                                                                marginBottom:
                                                                    "0.25rem",
                                                            }}
                                                        >
                                                            {formatAlertType(
                                                                alert.type,
                                                            )}
                                                        </div>
                                                        {alert.threshold && (
                                                            <div
                                                                style={{
                                                                    fontSize:
                                                                        "1.035rem",
                                                                    color: "#b3b3b3",
                                                                }}
                                                            >
                                                                Threshold:{" "}
                                                                {
                                                                    alert.threshold
                                                                }{" "}
                                                                ETH
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "0.978rem",
                                                                color: "#808080",
                                                                marginTop:
                                                                    "0.25rem",
                                                            }}
                                                        >
                                                            Status:{" "}
                                                            {alert.enabled
                                                                ? "Enabled"
                                                                : "Disabled"}
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "0.5rem",
                                                        }}
                                                    >
                                                        <Button
                                                            onClick={() =>
                                                                handleToggleAlert(
                                                                    alert.id,
                                                                    alert.enabled,
                                                                )
                                                            }
                                                        >
                                                            {alert.enabled
                                                                ? "Disable"
                                                                : "Enable"}
                                                        </Button>
                                                        <Button
                                                            onClick={() =>
                                                                handleDeleteAlert(
                                                                    alert.id,
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN: Notification Settings */}
                <div>
                    <h2 style={{ marginTop: 0 }}>Notification Settings</h2>

                    {notificationSuccess && (
                        <div
                            style={{
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                backgroundColor: "#00ff0020",
                                border: "1px solid #00ff00",
                                borderRadius: "4px",
                                color: "#00ff00",
                            }}
                        >
                            {notificationSuccess}
                        </div>
                    )}

                    {notificationError && (
                        <div
                            style={{
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                backgroundColor: "#ff000020",
                                border: "1px solid #ff0000",
                                borderRadius: "4px",
                                color: "#ff6666",
                            }}
                        >
                            {notificationError}
                        </div>
                    )}

                    {/* Master toggle */}
                    <div
                        style={{
                            marginBottom: "2rem",
                            padding: "1rem",
                            backgroundColor: "#333",
                            borderRadius: "4px",
                        }}
                    >
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={notificationEnabled}
                                onChange={(e) =>
                                    setNotificationEnabled(e.target.checked)
                                }
                                style={{
                                    marginRight: "0.5rem",
                                    width: "18px",
                                    height: "18px",
                                }}
                            />
                            <span style={{ fontWeight: "bold" }}>
                                Enable Notifications
                            </span>
                        </label>
                        <div
                            style={{
                                fontSize: "0.978rem",
                                color: "#808080",
                                marginTop: "0.5rem",
                                marginLeft: "26px",
                            }}
                        >
                            Master switch for all notification channels
                        </div>
                    </div>

                    {/* Discord Section */}
                    <div style={{ marginBottom: "2rem" }}>
                        <h3 style={{ marginBottom: "1rem" }}>Discord</h3>

                        <div style={{ marginBottom: "1rem" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                Discord Webhook URL
                            </label>
                            <input
                                type="text"
                                value={discordWebhookUrl}
                                onChange={(e) =>
                                    setDiscordWebhookUrl(e.target.value)
                                }
                                placeholder="https://discord.com/api/webhooks/..."
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    fontSize: "1rem",
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #444",
                                    borderRadius: "4px",
                                    color: "white",
                                    fontFamily: "monospace",
                                    fontSize: "0.9rem",
                                }}
                            />
                            <div
                                style={{
                                    fontSize: "0.978rem",
                                    color: "#b3b3b3",
                                    marginTop: "0.5rem",
                                }}
                            >
                                <a
                                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#0066cc" }}
                                >
                                    How to get a Discord webhook URL
                                </a>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                                onClick={handleSaveNotificationConfig}
                                disabled={notificationLoading}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    fontSize: "1rem",
                                    backgroundColor: notificationLoading
                                        ? "#333"
                                        : "#0066cc",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: notificationLoading
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                {notificationLoading
                                    ? "Saving..."
                                    : "Save Settings"}
                            </button>

                            <button
                                onClick={handleTestWebhook}
                                disabled={testingWebhook || !discordWebhookUrl}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    fontSize: "1rem",
                                    backgroundColor:
                                        testingWebhook || !discordWebhookUrl
                                            ? "#333"
                                            : "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor:
                                        testingWebhook || !discordWebhookUrl
                                            ? "not-allowed"
                                            : "pointer",
                                }}
                            >
                                {testingWebhook ? "Testing..." : "Test Webhook"}
                            </button>
                        </div>
                    </div>

                    {/* Telegram Section (Coming Soon) */}
                    <div style={{ marginBottom: "2rem", opacity: 0.5 }}>
                        <h3 style={{ marginBottom: "1rem" }}>Telegram</h3>
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "#333",
                                borderRadius: "4px",
                                color: "#999",
                                textAlign: "center",
                            }}
                        >
                            Coming Soon
                        </div>
                    </div>

                    {/* Email Section (Coming Soon) */}
                    <div style={{ opacity: 0.5 }}>
                        <h3 style={{ marginBottom: "1rem" }}>Email</h3>
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "#333",
                                borderRadius: "4px",
                                color: "#999",
                                textAlign: "center",
                            }}
                        >
                            Coming Soon
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to format alert type for display
function formatAlertType(type) {
    const labels = {
        incoming_tx: "Incoming transaction",
        outgoing_tx: "Outgoing transaction",
        large_transfer: "Large transfer",
        balance_below: "Balance below threshold",
    };
    return labels[type] || type;
}
