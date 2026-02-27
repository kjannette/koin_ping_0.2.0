import { useState, useEffect } from "react";
import AlertForm from "../components/AlertForm";
import Button from "../components/Button";
import { getAddresses } from "../api/addresses";
import { getAlerts, createAlert, updateAlertStatus, deleteAlert } from "../api/alerts";
import {
  getNotificationConfig,
  updateNotificationConfig,
  testDiscordWebhook,
  testSlackWebhook,
} from "../api/notificationConfig";

export default function Alerts() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notificationConfig, setNotificationConfig] = useState(null);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState(null);
  const [notificationSuccess, setNotificationSuccess] = useState(null);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);

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
        setNotificationConfig(configData);
        setDiscordWebhookUrl(configData.discord_webhook_url || '');
        setSlackWebhookUrl(configData.slack_webhook_url || '');
        setEmailAddress(configData.email || '');
        setNotificationEnabled(configData.notification_enabled !== false);
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
        prev.map((alert) => (alert.id === alertId ? updated : alert))
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
    try {
      setNotificationLoading(true);
      setNotificationError(null);
      setNotificationSuccess(null);

      const config = {
        discord_webhook_url: discordWebhookUrl || null,
        slack_webhook_url: slackWebhookUrl || null,
        email: emailAddress || null,
        notification_enabled: notificationEnabled,
      };

      const updated = await updateNotificationConfig(config);
      setNotificationConfig(updated);
      setNotificationSuccess('Notification settings saved!');

      setTimeout(() => setNotificationSuccess(null), 3000);
    } catch (err) {
      setNotificationError(err.message);
      console.error("Failed to save notification config:", err);
    } finally {
      setNotificationLoading(false);
    }
  }

  async function handleTestDiscord() {
    if (!discordWebhookUrl) {
      setNotificationError('Please enter a Discord webhook URL first');
      return;
    }

    try {
      setTestingDiscord(true);
      setNotificationError(null);
      setNotificationSuccess(null);

      const success = await testDiscordWebhook(discordWebhookUrl);

      if (success) {
        setNotificationSuccess('Test notification sent! Check your Discord channel.');
        setTimeout(() => setNotificationSuccess(null), 5000);
      } else {
        setNotificationError('Test failed. Check your webhook URL.');
      }
    } catch (err) {
      setNotificationError('Test failed: ' + err.message);
    } finally {
      setTestingDiscord(false);
    }
  }

  async function handleTestSlack() {
    if (!slackWebhookUrl) {
      setNotificationError('Please enter a Slack webhook URL first');
      return;
    }

    try {
      setTestingSlack(true);
      setNotificationError(null);
      setNotificationSuccess(null);

      const success = await testSlackWebhook(slackWebhookUrl);

      if (success) {
        setNotificationSuccess('Test notification sent! Check your Slack channel.');
        setTimeout(() => setNotificationSuccess(null), 5000);
      } else {
        setNotificationError('Test failed. Check your webhook URL.');
      }
    } catch (err) {
      setNotificationError('Test failed: ' + err.message);
    } finally {
      setTestingSlack(false);
    }
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading addresses...</div>;
  }

  if (addresses.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <p>No addresses tracked yet. Add an address first to create alerts.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Alert Rules & Notifications</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* LEFT COLUMN: Alert Rules */}
        <div>
          <h2 style={{ marginTop: 0 }}>Alert Rules</h2>

          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <strong>Select Address:</strong>
            </label>
            <select
              value={selectedAddressId || ""}
              onChange={(e) => setSelectedAddressId(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "white"
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
                  backgroundColor: "#2a2a2a",
                  borderRadius: "4px",
                  border: "1px solid #444"
                }}
              >
                <div style={{ fontSize: "0.9rem", color: "#999" }}>
                  Managing alerts for:
                </div>
                <div style={{ fontWeight: "bold", marginTop: "0.25rem" }}>
                  {selectedAddress.label || "Unlabeled"}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#999" }}>
                  {selectedAddress.address}
                </div>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3>Create New Alert</h3>
                <AlertForm onSubmit={handleAlertSubmit} />
              </div>

              <div>
                <h3>Active Alert Rules</h3>
                {error && <p style={{ color: "red" }}>Error: {error}</p>}
                {alerts.length === 0 ? (
                  <p style={{ color: "#666" }}>
                    No alert rules defined yet. Create one above.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {alerts.map((alert) => (
                      <li
                        key={alert.id}
                        style={{
                          padding: "1rem",
                          marginBottom: "0.5rem",
                          border: "1px solid #444",
                          borderRadius: "4px",
                          backgroundColor: "#2a2a2a",
                          opacity: alert.enabled ? 1 : 0.6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                              {formatAlertType(alert.type)}
                            </div>
                            {alert.threshold && (
                              <div style={{ fontSize: "0.9rem", color: "#999" }}>
                                Threshold: {alert.threshold} ETH
                              </div>
                            )}
                            <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                              Status: {alert.enabled ? "Enabled" : "Disabled"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button
                              onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                            >
                              {alert.enabled ? "Disable" : "Enable"}
                            </Button>
                            <Button onClick={() => handleDeleteAlert(alert.id)}>
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
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#00ff0020',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              color: '#00ff00'
            }}>
              {notificationSuccess}
            </div>
          )}

          {notificationError && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#ff000020',
              border: '1px solid #ff0000',
              borderRadius: '4px',
              color: '#ff6666'
            }}>
              {notificationError}
            </div>
          )}

          {/* Master toggle */}
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #444' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 'bold' }}>Enable Notifications</span>
            </label>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', marginLeft: '26px' }}>
              Master switch for all notification channels
            </div>
          </div>

          {/* Discord Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Discord</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Webhook URL
              </label>
              <input
                type="text"
                value={discordWebhookUrl}
                onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
              />
              <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                <a
                  href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc' }}
                >
                  How to get a Discord webhook URL
                </a>
              </div>
            </div>

            <button
              onClick={handleTestDiscord}
              disabled={testingDiscord || !discordWebhookUrl}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                backgroundColor: testingDiscord || !discordWebhookUrl ? '#333' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: testingDiscord || !discordWebhookUrl ? 'not-allowed' : 'pointer'
              }}
            >
              {testingDiscord ? 'Testing...' : 'Test Webhook'}
            </button>
          </div>

          {/* Slack Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Slack</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Incoming Webhook URL
              </label>
              <input
                type="text"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
              />
              <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc' }}
                >
                  How to set up Slack Incoming Webhooks
                </a>
              </div>
            </div>

            <button
              onClick={handleTestSlack}
              disabled={testingSlack || !slackWebhookUrl}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                backgroundColor: testingSlack || !slackWebhookUrl ? '#333' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: testingSlack || !slackWebhookUrl ? 'not-allowed' : 'pointer'
              }}
            >
              {testingSlack ? 'Testing...' : 'Test Webhook'}
            </button>
          </div>

          {/* Email Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Email</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
              <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                Requires SMTP to be configured on the server
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveNotificationConfig}
            disabled={notificationLoading}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: notificationLoading ? '#333' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: notificationLoading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {notificationLoading ? 'Saving...' : 'Save All Notification Settings'}
          </button>
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
