import { useState, useEffect } from "react";
import AlertForm from "../components/AlertForm";
import Button from "../components/Button";
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
    testNotificationChannels,
    setupEmail,
    sendEmailDigest,
} from "../api/notificationConfig";

const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    fontSize: "0.9rem",
    backgroundColor: "#1a1a1a",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "white",
    fontFamily: "monospace",
    boxSizing: "border-box",
};

const labelStyle = {
    display: "block",
    marginBottom: "0.25rem",
    fontSize: "0.9rem",
    color: "#ccc",
};

const helpLinkStyle = { color: "#0066cc", fontSize: "0.85rem" };

const sectionStyle = {
    marginBottom: "1.5rem",
    padding: "1rem",
    backgroundColor: "#2a2a2a",
    borderRadius: "6px",
    border: "1px solid #3a3a3a",
};

export default function Alerts() {
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Notification config state
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
    const [telegramBotToken, setTelegramBotToken] = useState("");
    const [telegramChatId, setTelegramChatId] = useState("");
    const [email, setEmail] = useState("");
    const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationError, setNotificationError] = useState(null);
    const [notificationSuccess, setNotificationSuccess] = useState(null);
    const [testingChannels, setTestingChannels] = useState(false);
    const [settingUpEmail, setSettingUpEmail] = useState(false);
    const [sendingDigest, setSendingDigest] = useState(false);
    const [hasExistingConfig, setHasExistingConfig] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                const addressData = await getAddresses();
                setAddresses(addressData);
                if (addressData.length > 0) {
                    setSelectedAddressId(addressData[0].id);
                }

                const configData = await getNotificationConfig();
                setNotificationEnabled(
                    configData.notification_enabled !== false,
                );
                setDiscordWebhookUrl(configData.discord_webhook_url || "");
                setTelegramBotToken(configData.telegram_bot_token || "");
                setTelegramChatId(configData.telegram_chat_id || "");
                setEmail(configData.email || "");
                setSlackWebhookUrl(configData.slack_webhook_url || "");

                const hasSaved =
                    !!configData.discord_webhook_url ||
                    !!configData.telegram_bot_token ||
                    !!configData.telegram_chat_id ||
                    !!configData.email ||
                    !!configData.slack_webhook_url;
                setHasExistingConfig(hasSaved);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedAddressId) {
            setAlerts([]);
            return;
        }

        async function fetchAlerts() {
            try {
                const data = await getAlerts(selectedAddressId);
                setAlerts(data);
                setError(null);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch alerts:", err);
            }
        }

        fetchAlerts();
    }, [selectedAddressId]);

    async function handleAlertSubmit(data) {
        if (!selectedAddressId) return;

        try {
            const newAlert = await createAlert(selectedAddressId, data);
            setAlerts((prev) => [...prev, newAlert]);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to create alert:", err);
        }
    }

    async function handleToggleAlert(alertId, currentStatus) {
        try {
            const updated = await updateAlertStatus(alertId, !currentStatus);
            setAlerts((prev) =>
                prev.map((alert) => (alert.id === alertId ? updated : alert)),
            );
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to update alert:", err);
        }
    }

    async function handleDeleteAlert(alertId) {
        try {
            await deleteAlert(alertId);
            setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to delete alert:", err);
        }
    }

    async function handleSaveNotificationConfig() {
        if (hasExistingConfig) {
            const confirmed = window.confirm(
                "This will overwrite your previously saved notification settings. Continue?",
            );
            if (!confirmed) return;
        }

        try {
            setNotificationLoading(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            const config = {
                notification_enabled: notificationEnabled,
                discord_webhook_url: discordWebhookUrl || null,
                telegram_bot_token: telegramBotToken || null,
                telegram_chat_id: telegramChatId || null,
                email: email || null,
                slack_webhook_url: slackWebhookUrl || null,
            };

            await updateNotificationConfig(config);
            setHasExistingConfig(true);
            setNotificationSuccess("Notification settings saved!");
            setTimeout(() => setNotificationSuccess(null), 3000);
        } catch (err) {
            setNotificationError(err.message);
            console.error("Failed to save notification config:", err);
        } finally {
            setNotificationLoading(false);
        }
    }

    async function handleTestChannels() {
        try {
            setTestingChannels(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            const data = await testNotificationChannels();
            const results = data.results || [];

            const failed = results.filter((r) => !r.success);
            const succeeded = results.filter((r) => r.success);

            if (failed.length === 0 && succeeded.length > 0) {
                setNotificationSuccess(
                    `Test sent to: ${succeeded.map((r) => r.channel).join(", ")}`,
                );
            } else if (failed.length > 0 && succeeded.length > 0) {
                setNotificationSuccess(
                    `Sent: ${succeeded.map((r) => r.channel).join(", ")}. Failed: ${failed.map((r) => `${r.channel} (${r.error})`).join(", ")}`,
                );
            } else if (failed.length > 0) {
                setNotificationError(
                    `Test failed: ${failed.map((r) => `${r.channel} (${r.error})`).join(", ")}`,
                );
            }

            setTimeout(() => {
                setNotificationSuccess(null);
                setNotificationError(null);
            }, 6000);
        } catch (err) {
            setNotificationError(err.message);
        } finally {
            setTestingChannels(false);
        }
    }

    async function handleSetupEmail() {
        try {
            setSettingUpEmail(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            await handleSaveNotificationConfig();

            const result = await setupEmail();
            setNotificationSuccess(
                result.message || "Confirmation email sent!",
            );
            setTimeout(() => setNotificationSuccess(null), 5000);
        } catch (err) {
            setNotificationError(err.message);
        } finally {
            setSettingUpEmail(false);
        }
    }

    async function handleSendDigest() {
        try {
            setSendingDigest(true);
            setNotificationError(null);
            setNotificationSuccess(null);

            const result = await sendEmailDigest();
            setNotificationSuccess(result.message || "Digest email sent!");
            setTimeout(() => setNotificationSuccess(null), 5000);
        } catch (err) {
            setNotificationError(err.message);
        } finally {
            setSendingDigest(false);
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

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                    alignItems: "start",
                }}
            >
                {/* LEFT COLUMN: Alert Rules */}
                <div>
                    <h2 style={{ marginTop: 0 }}>Alert Rules</h2>

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

                            <div style={{ marginBottom: "2rem" }}>
                                <h3>Create New Alert</h3>
                                <AlertForm onSubmit={handleAlertSubmit} />
                            </div>

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
                            marginBottom: "1.5rem",
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

                    {/* All channel settings — hidden when master toggle is off */}
                    <div
                        style={{
                            display: notificationEnabled ? "block" : "none",
                        }}
                    >
                        {/* Telegram */}
                        <div style={sectionStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                                Telegram
                            </h3>

                            <div style={{ marginBottom: "0.75rem" }}>
                                <label style={labelStyle}>Bot Token</label>
                                <input
                                    type="text"
                                    value={telegramBotToken}
                                    onChange={(e) =>
                                        setTelegramBotToken(e.target.value)
                                    }
                                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ marginBottom: "0.5rem" }}>
                                <label style={labelStyle}>Chat ID</label>
                                <input
                                    type="text"
                                    value={telegramChatId}
                                    onChange={(e) =>
                                        setTelegramChatId(e.target.value)
                                    }
                                    placeholder="-1001234567890"
                                    style={inputStyle}
                                />
                            </div>

                            <a
                                href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={helpLinkStyle}
                            >
                                How to create a Telegram bot & get your Chat ID
                            </a>
                        </div>

                        {/* Email */}
                        <div style={sectionStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                                Email
                            </h3>

                            <div style={{ marginBottom: "0.75rem" }}>
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    style={inputStyle}
                                />
                            </div>

                            <div
                                style={{
                                    fontSize: "0.85rem",
                                    color: "#808080",
                                    marginBottom: "0.75rem",
                                }}
                            >
                                Alert notifications and digests will be sent to
                                this address
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                }}
                            >
                                <button
                                    onClick={handleSetupEmail}
                                    disabled={settingUpEmail || !email}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        fontSize: "0.85rem",
                                        backgroundColor:
                                            settingUpEmail || !email
                                                ? "#333"
                                                : "#0066cc",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor:
                                            settingUpEmail || !email
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    {settingUpEmail
                                        ? "Setting up..."
                                        : "Verify Email"}
                                </button>

                                <button
                                    onClick={handleSendDigest}
                                    disabled={sendingDigest || !email}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        fontSize: "0.85rem",
                                        backgroundColor:
                                            sendingDigest || !email
                                                ? "#333"
                                                : "#6c757d",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor:
                                            sendingDigest || !email
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    {sendingDigest
                                        ? "Sending..."
                                        : "Send Digest Now"}
                                </button>
                            </div>
                        </div>

                        {/* Discord */}
                        <div style={sectionStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                                Discord
                            </h3>

                            <div style={{ marginBottom: "0.5rem" }}>
                                <label style={labelStyle}>
                                    Discord Webhook URL
                                </label>
                                <input
                                    type="text"
                                    value={discordWebhookUrl}
                                    onChange={(e) =>
                                        setDiscordWebhookUrl(e.target.value)
                                    }
                                    placeholder="https://discord.com/api/webhooks/..."
                                    style={inputStyle}
                                />
                            </div>

                            <a
                                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={helpLinkStyle}
                            >
                                How to get a Discord webhook URL
                            </a>
                        </div>

                        {/* Slack */}
                        <div style={sectionStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
                                Slack
                            </h3>

                            <div style={{ marginBottom: "0.5rem" }}>
                                <label style={labelStyle}>
                                    Slack Webhook URL
                                </label>
                                <input
                                    type="text"
                                    value={slackWebhookUrl}
                                    onChange={(e) =>
                                        setSlackWebhookUrl(e.target.value)
                                    }
                                    placeholder="https://hooks.slack.com/services/..."
                                    style={inputStyle}
                                />
                            </div>

                            <a
                                href="https://api.slack.com/messaging/webhooks"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={helpLinkStyle}
                            >
                                How to set up Slack Incoming Webhooks
                            </a>
                        </div>

                        {/* Save & Test buttons at the bottom */}
                        <div
                            style={{
                                display: "flex",
                                gap: "0.75rem",
                                marginTop: "1rem",
                            }}
                        >
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
                                onClick={handleTestChannels}
                                disabled={testingChannels}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    fontSize: "1rem",
                                    backgroundColor: testingChannels
                                        ? "#333"
                                        : "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: testingChannels
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                {testingChannels
                                    ? "Testing..."
                                    : "Test All Channels"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatAlertType(type) {
    const labels = {
        incoming_tx: "Incoming transaction",
        outgoing_tx: "Outgoing transaction",
        large_transfer: "Large transfer",
        balance_below: "Balance below threshold",
    };
    return labels[type] || type;
}
