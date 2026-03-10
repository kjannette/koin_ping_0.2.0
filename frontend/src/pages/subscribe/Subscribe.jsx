import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { createAddress, getAddresses } from "../../api/addresses";
import { createAlert } from "../../api/alerts";
import {
  updateNotificationConfig,
  testNotificationChannels,
} from "../../api/notificationConfig";
import { createCheckoutSession, getSubscriptionStatus, verifyCheckoutSession, activateFreeTier } from "../../api/stripe";
import Input from "../../components/Input";
import Button from "../../components/Button";
import TierPicker from "../../components/TierPicker";
import "./Subscribe.css";

const TIER_LIMITS = {
  free:    { maxAlertTypes: 1, channels: ["email"] },
  premium: { maxAlertTypes: 2, channels: ["email", "discord", "telegram"] },
  pro:     { maxAlertTypes: 4, channels: ["email", "discord", "telegram", "slack"] },
};

const STEPS = [
  "Choose Plan",
  "Create Account",
  "Add Wallet",
  "Alert Rules",
  "Notifications",
  "Done",
];

export default function Subscribe() {
  const { currentUser, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skipWarning, setSkipWarning] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const [data, setData] = useState({
    selectedTier: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletAddress: "",
    walletLabel: "",
    createdAddressId: null,
    alertIncomingTx: false,
    alertOutgoingTx: false,
    alertLargeTransfer: false,
    largeTransferThreshold: "",
    alertBalanceBelow: false,
    balanceBelowThreshold: "",
    discordWebhookUrl: "",
    slackWebhookUrl: "",
    notificationEmail: "",
    alertsCreated: [],
    notificationConfigured: false,
  });

  function set(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  const tierLimits = TIER_LIMITS[data.selectedTier] || TIER_LIMITS.free;

  useEffect(() => {
    if (!currentUser) return;
    getAddresses()
      .then((addresses) => {
        if (addresses.length > 0) {
          navigate("/addresses", { replace: true });
        }
      })
      .catch(() => { });
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (payment === "success" && sessionId) {
      setSearchParams({}, { replace: true });
      setLoading(true);
      verifyCheckoutSession(sessionId)
        .then(() => {
          setStep(3);
        })
        .catch((err) => {
          setError("Payment verification failed: " + err.message);
          setStep(2);
        })
        .finally(() => setLoading(false));
    } else if (payment === "cancelled") {
      setSearchParams({}, { replace: true });
      setStep(2);
      setError("Payment was cancelled. Please try again.");
    }
  }, [currentUser, searchParams, setSearchParams]);

  // ── Step handlers ─────────────────────────────────────────────────────────

  function handleStep1() {
    setError("");
    if (!data.selectedTier) {
      setError("Please select a plan to continue");
      return;
    }
    setStep(2);
  }

  async function handleStep2() {
    setError("");
    if (!data.email || !data.password || !data.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (data.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      setLoading(true);
      if (!currentUser) {
        await signup(data.email, data.password);
      }

      if (data.selectedTier === "free") {
        await activateFreeTier();
        setStep(3);
        return;
      }

      const status = await getSubscriptionStatus();
      if (status.subscription_status === "active" || status.subscription_status === "trialing") {
        setStep(3);
        return;
      }
      const { url } = await createCheckoutSession(data.selectedTier);
      window.location.href = url;
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Try logging in instead.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak");
      } else {
        setError("Failed to create account: " + err.message);
      }
      setLoading(false);
    }
  }

  async function handleStep3() {
    setError("");
    if (!data.walletAddress) {
      setError("Please enter a wallet address");
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(data.walletAddress)) {
      setError("Invalid ETH address (must be 0x followed by 40 hex characters)");
      return;
    }
    try {
      setLoading(true);
      const created = await createAddress({
        address: data.walletAddress,
        label: data.walletLabel || undefined,
      });
      set("createdAddressId", created.id);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep4() {
    setError("");
    const rules = [];
    if (data.alertIncomingTx) rules.push({ type: "incoming_tx" });
    if (data.alertOutgoingTx) rules.push({ type: "outgoing_tx" });
    if (data.alertLargeTransfer) {
      if (!data.largeTransferThreshold) {
        setError("Please enter a threshold for large transfers");
        return;
      }
      rules.push({ type: "large_transfer", threshold: data.largeTransferThreshold });
    }
    if (data.alertBalanceBelow) {
      if (!data.balanceBelowThreshold) {
        setError("Please enter a threshold for balance below");
        return;
      }
      rules.push({ type: "balance_below", threshold: data.balanceBelowThreshold });
    }

    if (rules.length === 0) {
      setStep(5);
      return;
    }

    try {
      setLoading(true);
      const created = [];
      for (const rule of rules) {
        const result = await createAlert(data.createdAddressId, rule);
        created.push(result);
      }
      set("alertsCreated", created);
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep5() {
    setError("");
    const hasAny =
      data.discordWebhookUrl || data.slackWebhookUrl || data.notificationEmail;
    if (!hasAny) {
      setStep(6);
      return;
    }
    try {
      setLoading(true);
      await updateNotificationConfig({
        notification_enabled: true,
        discord_webhook_url: data.discordWebhookUrl || undefined,
        slack_webhook_url: data.slackWebhookUrl || undefined,
        email: data.notificationEmail || undefined,
      });
      set("notificationConfigured", true);
      setStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestChannels() {
    setTestLoading(true);
    setTestResults(null);
    try {
      const results = await testNotificationChannels();
      setTestResults(results);
    } catch (err) {
      setTestResults({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  }

  // ── Alert type limit helpers ──────────────────────────────────────────────

  function countSelectedAlerts() {
    let count = 0;
    if (data.alertIncomingTx) count++;
    if (data.alertOutgoingTx) count++;
    if (data.alertLargeTransfer) count++;
    if (data.alertBalanceBelow) count++;
    return count;
  }

  function canSelectMoreAlerts() {
    return tierLimits.maxAlertTypes > countSelectedAlerts();
  }

  // ── Progress bar ──────────────────────────────────────────────────────────

  function ProgressBar() {
    return (
      <div className="progress-bar">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          const dotClass = done
            ? "progress-bar__dot--done"
            : active
              ? "progress-bar__dot--active"
              : "progress-bar__dot--pending";

          return (
            <div key={label} className="progress-bar__step">
              {i > 0 && (
                <div
                  className={`progress-bar__connector ${done || active
                    ? "progress-bar__connector--active"
                    : "progress-bar__connector--inactive"
                    }`}
                />
              )}
              <div>
                <div className={`progress-bar__dot ${dotClass}`}>
                  {done ? "\u2713" : stepNum}
                </div>
                <div
                  className={`progress-bar__label ${active
                    ? "progress-bar__label--active"
                    : "progress-bar__label--inactive"
                    }`}
                >
                  {label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Step content ──────────────────────────────────────────────────────────

  function StepChoosePlan() {
    return (
      <>
        <h2 className="mb-sm">Choose your plan</h2>
        <p className="subscribe__subtitle">
          Select the plan that works best for you. You can upgrade anytime.
        </p>
        <TierPicker
          onSelect={(tier) => set("selectedTier", tier)}
          selectedTier={data.selectedTier}
        />
      </>
    );
  }

  function StepCreateAccount() {
    return (
      <>
        <h2 className="mb-lg">Create your account</h2>
        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={(v) => set("email", v)}
          disabled={loading}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={data.password}
          onChange={(v) => set("password", v)}
          disabled={loading}
          placeholder="At least 6 characters"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={data.confirmPassword}
          onChange={(v) => set("confirmPassword", v)}
          disabled={loading}
          placeholder="Repeat your password"
          className="form-field--last"
        />
      </>
    );
  }

  function StepAddWallet() {
    return (
      <>
        <h2 className="mb-sm">Add a wallet address</h2>
        <p className="subscribe__subtitle">
          Enter the Ethereum address you want to monitor.
        </p>
        <Input
          label="ETH Address"
          value={data.walletAddress}
          onChange={(v) => set("walletAddress", v)}
          disabled={loading}
          placeholder="0x..."
        />
        <Input
          label="Label (optional)"
          value={data.walletLabel}
          onChange={(v) => set("walletLabel", v)}
          disabled={loading}
          placeholder="e.g. My main wallet"
          className="form-field--last"
        />
      </>
    );
  }

  function StepAlertRules() {
    const atLimit = !canSelectMoreAlerts();
    const maxTypes = tierLimits.maxAlertTypes;

    return (
      <>
        <h2 className="mb-sm">Configure alert rules</h2>
        <p className="subscribe__subtitle">
          Choose which events trigger notifications ({countSelectedAlerts()}/{maxTypes} selected).
          You can change these later.
        </p>

        <CheckboxRow
          checked={data.alertIncomingTx}
          onChange={(v) => set("alertIncomingTx", v)}
          label="Incoming transaction"
          disabled={!data.alertIncomingTx && atLimit}
        />
        <CheckboxRow
          checked={data.alertOutgoingTx}
          onChange={(v) => set("alertOutgoingTx", v)}
          label="Outgoing transaction"
          disabled={!data.alertOutgoingTx && atLimit}
        />
        <CheckboxRow
          checked={data.alertLargeTransfer}
          onChange={(v) => set("alertLargeTransfer", v)}
          label="Large transfer"
          disabled={!data.alertLargeTransfer && atLimit}
        >
          {data.alertLargeTransfer && (
            <div className="checkbox-row__nested">
              <Input
                type="number"
                label=""
                value={data.largeTransferThreshold}
                onChange={(v) => set("largeTransferThreshold", v)}
                placeholder="Threshold (ETH)"
                min="0"
                step="0.01"
              />
            </div>
          )}
        </CheckboxRow>
        <CheckboxRow
          checked={data.alertBalanceBelow}
          onChange={(v) => set("alertBalanceBelow", v)}
          label="Balance below"
          disabled={!data.alertBalanceBelow && atLimit}
        >
          {data.alertBalanceBelow && (
            <div className="checkbox-row__nested">
              <Input
                type="number"
                label=""
                value={data.balanceBelowThreshold}
                onChange={(v) => set("balanceBelowThreshold", v)}
                placeholder="Threshold (ETH)"
                min="0"
                step="0.01"
              />
            </div>
          )}
        </CheckboxRow>

        {atLimit && data.selectedTier !== "pro" && (
          <p className="subscribe__tier-hint">
            Your {data.selectedTier} plan allows {maxTypes} alert type{maxTypes !== 1 ? "s" : ""} per address. Upgrade for more.
          </p>
        )}
      </>
    );
  }

  function StepNotifications() {
    const channels = tierLimits.channels;
    const canDiscord = channels.includes("discord");
    const canSlack = channels.includes("slack");

    return (
      <>
        <h2 className="mb-sm">Set up notifications</h2>
        <p className="subscribe__subtitle">
          Add at least one channel so you receive alerts. All fields are optional.
        </p>

        <Input
          label="Email address for alerts"
          type="email"
          value={data.notificationEmail}
          onChange={(v) => set("notificationEmail", v)}
          disabled={loading}
          placeholder="you@example.com"
          className="form-field--last"
        />

        <div className={`mb-md${!canDiscord ? " subscribe__channel-disabled" : ""}`}>
          <label className="form-label">
            Discord Webhook URL{" "}
            <a
              href="https://support.discord.com/hc/en-us/articles/228383668"
              target="_blank"
              rel="noreferrer"
              className="help-link"
            >
              (how to get one)
            </a>
          </label>
          <Input
            label=""
            type="url"
            value={data.discordWebhookUrl}
            onChange={(v) => set("discordWebhookUrl", v)}
            disabled={loading || !canDiscord}
            placeholder="https://discord.com/api/webhooks/..."
          />
          {!canDiscord && (
            <p className="subscribe__tier-hint">Upgrade to Premium to enable Discord alerts</p>
          )}
        </div>

        <div className={`mb-md${!canSlack ? " subscribe__channel-disabled" : ""}`}>
          <label className="form-label">
            Slack Webhook URL{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noreferrer"
              className="help-link"
            >
              (how to get one)
            </a>
          </label>
          <Input
            label=""
            type="url"
            value={data.slackWebhookUrl}
            onChange={(v) => set("slackWebhookUrl", v)}
            disabled={loading || !canSlack}
            placeholder="https://hooks.slack.com/services/..."
          />
          {!canSlack && (
            <p className="subscribe__tier-hint">Upgrade to Pro to enable Slack alerts</p>
          )}
        </div>
      </>
    );
  }

  function StepDone() {
    const alertCount = data.alertsCreated.length;
    const hasNotif = data.notificationConfigured;

    return (
      <>
        <h2 className="mb-md">You're all set!</h2>

        <div className="subscribe__summary">
          <p className="subscribe__summary-title">Summary</p>
          <ul className="subscribe__summary-list">
            <li>
              Plan:{" "}
              <span className="text-white">
                {data.selectedTier === "pro" ? "Pro" : data.selectedTier === "premium" ? "Premium" : "Free Trial"}
              </span>
            </li>
            <li>
              Wallet address added:{" "}
              <span className="text-mono text-white-sm">
                {data.walletAddress}
              </span>
              {data.walletLabel && ` (${data.walletLabel})`}
            </li>
            <li>
              Alert rules configured:{" "}
              <span className="text-white">
                {alertCount > 0 ? `${alertCount} rule${alertCount !== 1 ? "s" : ""}` : "None (skipped)"}
              </span>
            </li>
            <li>
              Notification channels:{" "}
              <span className="text-white">
                {hasNotif ? "Configured" : "Not set up (skipped)"}
              </span>
            </li>
          </ul>
        </div>

        {hasNotif && (
          <div className="mb-lg">
            <Button
              onClick={handleTestChannels}
              disabled={testLoading}
              variant="ghost"
            >
              {testLoading ? "Testing..." : "Test All Channels"}
            </Button>

            {testResults && (
              <div className="mt-md">
                {testResults.error ? (
                  <p className="text-error">{testResults.error}</p>
                ) : (
                  <ul className="list-unstyled">
                    {Object.entries(testResults).map(([channel, result]) => (
                      <li
                        key={channel}
                        className={`test-result ${result.success ? "test-result--success" : "test-result--failure"}`}
                      >
                        {result.success ? "\u2713" : "\u2717"} {channel}:{" "}
                        {result.message || (result.success ? "OK" : "Failed")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <Button onClick={() => navigate("/addresses")} className="btn--lg text-bold">
          Go to Dashboard →
        </Button>
      </>
    );
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  function CheckboxRow({ checked, onChange, label, children, disabled }) {
    return (
      <div className={`checkbox-row${disabled ? " checkbox-row--disabled" : ""}`}>
        <label className="checkbox-row__label">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="checkbox-row__input"
            disabled={disabled}
          />
          {label}
        </label>
        {children}
      </div>
    );
  }

  // ── Footer navigation ─────────────────────────────────────────────────────

  function Footer() {
    if (step === 6) return null;

    const canSkip = step === 4 || step === 5;
    const canBack = step > 1 && step <= 5;

    async function handleNext() {
      setSkipWarning("");
      if (step === 1) handleStep1();
      else if (step === 2) await handleStep2();
      else if (step === 3) await handleStep3();
      else if (step === 4) await handleStep4();
      else if (step === 5) await handleStep5();
    }

    function handleSkip() {
      setError("");
      setSkipWarning("");
      setStep((s) => s + 1);
    }

    function handleBack() {
      setError("");
      setSkipWarning("");
      setStep((s) => s - 1);
    }

    const nextLabel = step === 1
      ? "Continue"
      : step === 2
        ? data.selectedTier === "free"
          ? "Create Account"
          : "Create Account & Subscribe"
        : step === 5
          ? "Finish"
          : "Next →";

    return (
      <div className="subscribe__footer">
        <div>
          {canBack && (
            <Button
              onClick={handleBack}
              disabled={loading}
              variant="ghost"
            >
              ← Back
            </Button>
          )}
        </div>

        <div className="flex gap-md">
          {canSkip && (
            <Button
              onClick={handleSkip}
              disabled={loading}
              variant="ghost"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={loading || (step === 1 && !data.selectedTier)}
            className="text-bold"
          >
            {loading ? "Please wait..." : nextLabel}
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const stepContent = {
    1: StepChoosePlan(),
    2: StepCreateAccount(),
    3: StepAddWallet(),
    4: StepAlertRules(),
    5: StepNotifications(),
    6: StepDone(),
  };

  return (
    <div className="subscribe">
      <div className={`subscribe__container${step === 1 ? " subscribe__container--wide" : ""}`}>
        <h1 className="subscribe__title">Koin Ping</h1>

        {ProgressBar()}

        {error && (
          <div className="alert alert--error">{error}</div>
        )}

        {skipWarning && (
          <div className="alert alert--warning">{skipWarning}</div>
        )}

        <div className="subscribe__card">
          {stepContent[step]}
          {Footer()}
        </div>

        {step === 2 && (
          <p className="subscribe__login-link">
            Already have an account?{" "}
            <a href="/login">Log in here</a>
          </p>
        )}
      </div>
    </div>
  );
}
