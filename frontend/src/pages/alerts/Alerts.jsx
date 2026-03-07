import { useState, useEffect } from "react";
import AlertForm from "../../components/AlertForm";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { getAddresses } from "../../api/addresses";
import {
  getAlerts,
  createAlert,
  updateAlertStatus,
  updateAlertThresholds,
  deleteAlert,
} from "../../api/alerts";
import {
  getNotificationConfig,
  updateNotificationConfig,
  testNotificationChannels,
  setupEmail,
  sendEmailDigest,
} from "../../api/notificationConfig";
import "./Alerts.css";

export default function Alerts() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const [openAccordions, setOpenAccordions] = useState({});
  const [thresholdEdits, setThresholdEdits] = useState({});

  function toggleAccordion(alertId) {
    setOpenAccordions((prev) => ({ ...prev, [alertId]: !prev[alertId] }));
  }

  function getThresholdEdit(alert) {
    if (thresholdEdits[alert.id]) return thresholdEdits[alert.id];
    return {
      minimum: alert.minimum != null ? String(alert.minimum) : "",
      maximum: alert.maximum != null ? String(alert.maximum) : "",
    };
  }

  function setThresholdEdit(alertId, field, value) {
    setThresholdEdits((prev) => {
      const current = prev[alertId] || getThresholdEditForAlert(alertId);
      return { ...prev, [alertId]: { ...current, [field]: value } };
    });
  }

  function getThresholdEditForAlert(alertId) {
    const alert = alerts.find((a) => a.id === alertId);
    return {
      minimum: alert?.minimum != null ? String(alert.minimum) : "",
      maximum: alert?.maximum != null ? String(alert.maximum) : "",
    };
  }

  async function handleSaveThresholds(alertId) {
    const edit = thresholdEdits[alertId];
    if (!edit) return;

    const min = edit.minimum.trim() === "" ? null : Number(edit.minimum);
    const max = edit.maximum.trim() === "" ? null : Number(edit.maximum);

    if (min !== null && isNaN(min)) return;
    if (max !== null && isNaN(max)) return;
    if (min !== null && max !== null && min > max) return;

    try {
      const updated = await updateAlertThresholds(alertId, min, max);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? updated : a)),
      );
      setThresholdEdits((prev) => {
        const next = { ...prev };
        delete next[alertId];
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to update thresholds:", err);
    }
  }

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
    return <div className="page">Loading addresses...</div>;
  }

  if (addresses.length === 0) {
    return (
      <div className="page">
        <p>No addresses tracked yet. Add an address first to create alerts.</p>
      </div>
    );
  }

  return (
    <div className="page page--wide">
      <h1 className="mb-xl">Alert Rules & Notifications</h1>

      <div className="alerts-grid">
        {/* LEFT COLUMN: Alert Rules */}
        <div>
          <h2 className="mt-0">Alert Rules</h2>

          <div className="mb-xl">
            <label className="form-label mb-sm">
              <strong>Select Address:</strong>
            </label>
            <select
              value={selectedAddressId || ""}
              onChange={(e) =>
                setSelectedAddressId(Number(e.target.value))
              }
              className="form-select"
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
              <div className="alerts__address-info">
                <div className="text-sm text-muted">
                  Managing alerts for:
                </div>
                <div className="text-bold">
                  {selectedAddress.label || "Unlabeled"}
                </div>
                <div className="text-mono text-sm text-muted">
                  {selectedAddress.address}
                </div>
              </div>

              <div className="mb-xl">
                <h3>Create New Alert</h3>
                <AlertForm onSubmit={handleAlertSubmit} />
              </div>

              <div>
                <h3>Active Alert Rules</h3>
                {error && (
                  <p className="text-error">Error: {error}</p>
                )}
                {alerts.length === 0 ? (
                  <p className="text-dimmed">
                    No alert rules defined yet. Create one above.
                  </p>
                ) : (
                  <ul className="list-unstyled">
                    {alerts.map((alert) => {
                      const hasAccordion =
                        alert.type === "incoming_tx" ||
                        alert.type === "outgoing_tx";
                      const isOpen = !!openAccordions[alert.id];
                      const edit = getThresholdEdit(alert);

                      return (
                        <li
                          key={alert.id}
                          className={`alerts__rule ${!alert.enabled ? "alerts__rule--disabled" : ""}`}
                        >
                          <div className="flex flex--between">
                            <div>
                              <div className="text-bold mb-sm">
                                {formatAlertType(alert.type)}
                              </div>
                              {alert.threshold && (
                                <div className="text-sm text-muted">
                                  Threshold: {alert.threshold} ETH
                                </div>
                              )}
                              {alert.minimum != null && (
                                <div className="text-sm text-muted">
                                  Min: {alert.minimum} ETH
                                </div>
                              )}
                              {alert.maximum != null && (
                                <div className="text-sm text-muted">
                                  Max: {alert.maximum} ETH
                                </div>
                              )}
                              <div className="text-xs text-dimmed">
                                Status:{" "}
                                {alert.enabled ? "Enabled" : "Disabled"}
                              </div>
                            </div>
                            <div className="flex flex--center gap-sm">
                              <Button
                                onClick={() =>
                                  handleToggleAlert(
                                    alert.id,
                                    alert.enabled,
                                  )
                                }
                              >
                                {alert.enabled ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDeleteAlert(alert.id)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          {hasAccordion && (
                            <>
                              <button
                                type="button"
                                className="alerts__accordion-toggle"
                                onClick={() =>
                                  toggleAccordion(alert.id)
                                }
                              >
                                <span
                                  className={`alerts__accordion-chevron ${isOpen ? "alerts__accordion-chevron--open" : ""}`}
                                >
                                  &#9654;
                                </span>
                                Add optional minimum and maximum
                                threshold values
                              </button>
                              <div
                                className={`alerts__accordion-panel ${isOpen ? "alerts__accordion-panel--open" : ""}`}
                              >
                                <div className="alerts__threshold-inputs">
                                  <Input
                                    label="Minimum"
                                    type="number"
                                    step="0.000001"
                                    min="0"
                                    value={edit.minimum}
                                    onChange={(v) =>
                                      setThresholdEdit(
                                        alert.id,
                                        "minimum",
                                        v,
                                      )
                                    }
                                    placeholder="No minimum"
                                  />
                                  <Input
                                    label="Maximum"
                                    type="number"
                                    step="0.000001"
                                    min="0"
                                    value={edit.maximum}
                                    onChange={(v) =>
                                      setThresholdEdit(
                                        alert.id,
                                        "maximum",
                                        v,
                                      )
                                    }
                                    placeholder="No maximum"
                                  />
                                </div>
                                <div className="alerts__threshold-actions">
                                  <Button
                                    onClick={() =>
                                      handleSaveThresholds(alert.id)
                                    }
                                    className="btn--sm"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Notification Settings */}
        <div>
          <h2 className="mt-0">Notification Settings</h2>

          {notificationSuccess && (
            <div className="alert alert--success">{notificationSuccess}</div>
          )}

          {notificationError && (
            <div className="alert alert--error">{notificationError}</div>
          )}

          {/* Master toggle */}
          <div className="alerts__toggle-panel">
            <label className="alerts__toggle-label">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) =>
                  setNotificationEnabled(e.target.checked)
                }
                className="alerts__toggle-checkbox"
              />
              <span className="text-bold">Enable Notifications</span>
            </label>
            <div className="alerts__toggle-hint">
              Master switch for all notification channels
            </div>
          </div>

          {/* All channel settings -- hidden when master toggle is off */}
          {notificationEnabled && (
            <>
              {/* Telegram */}
              <div className="section">
                <h3 className="mt-0 mb-md">Telegram</h3>
                <Input
                  label="Bot Token"
                  value={telegramBotToken}
                  onChange={setTelegramBotToken}
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                />
                <Input
                  label="Chat ID"
                  value={telegramChatId}
                  onChange={setTelegramChatId}
                  placeholder="-1001234567890"
                />
                <a
                  href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  How to create a Telegram bot & get your Chat ID
                </a>
              </div>

              {/* Email */}
              <div className="section">
                <h3 className="mt-0 mb-md">Email</h3>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                />
                <div className="help-link text-dimmed mb-md">
                  Alert notifications and digests will be sent to this address
                </div>
                <div className="alerts__email-buttons">
                  <Button
                    onClick={handleSetupEmail}
                    disabled={settingUpEmail || !email}
                    className="btn--sm"
                  >
                    {settingUpEmail ? "Setting up..." : "Verify Email"}
                  </Button>
                  <Button
                    onClick={handleSendDigest}
                    disabled={sendingDigest || !email}
                    variant="secondary"
                    className="btn--sm"
                  >
                    {sendingDigest ? "Sending..." : "Send Digest Now"}
                  </Button>
                </div>
              </div>

              {/* Discord */}
              <div className="section">
                <h3 className="mt-0 mb-md">Discord</h3>
                <Input
                  label="Discord Webhook URL"
                  value={discordWebhookUrl}
                  onChange={setDiscordWebhookUrl}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <a
                  href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  How to get a Discord webhook URL
                </a>
              </div>

              {/* Slack */}
              <div className="section">
                <h3 className="mt-0 mb-md">Slack</h3>
                <Input
                  label="Slack Webhook URL"
                  value={slackWebhookUrl}
                  onChange={setSlackWebhookUrl}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  How to set up Slack Incoming Webhooks
                </a>
              </div>

              {/* Save & Test buttons */}
              <div className="alerts__save-test">
                <Button
                  onClick={handleSaveNotificationConfig}
                  disabled={notificationLoading}
                  className="btn--lg"
                >
                  {notificationLoading ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  onClick={handleTestChannels}
                  disabled={testingChannels}
                  variant="success"
                  className="btn--lg"
                >
                  {testingChannels ? "Testing..." : "Test All Channels"}
                </Button>
              </div>
            </>
          )}
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
