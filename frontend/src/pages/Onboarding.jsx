/**
 * Onboarding Wizard
 *
 * 5-step guided flow: Create Account → Add Wallet → Alert Rules → Notifications → Done
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createAddress, getAddresses } from "../api/addresses";
import { createAlert } from "../api/alerts";
import {
    updateNotificationConfig,
    testNotificationChannels,
} from "../api/notificationConfig";

const STEPS = [
    "Create Account",
    "Add Wallet",
    "Alert Rules",
    "Notifications",
    "Done",
];

const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    fontSize: "1rem",
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "white",
    boxSizing: "border-box",
};

const labelStyle = {
    display: "block",
    marginBottom: "0.4rem",
    color: "#ccc",
    fontSize: "0.9rem",
};

export default function Onboarding() {
    const { currentUser, signup } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [skipWarning, setSkipWarning] = useState("");
    const [testResults, setTestResults] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    // Wizard state
    const [data, setData] = useState({
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
        // summary
        alertsCreated: [],
        notificationConfigured: false,
    });

    function set(field, value) {
        setData((prev) => ({ ...prev, [field]: value }));
    }

    // On mount: if already fully onboarded, redirect away
    useEffect(() => {
        if (!currentUser) return;
        getAddresses()
            .then((addresses) => {
                if (addresses.length > 0) {
                    navigate("/addresses", { replace: true });
                }
            })
            .catch(() => {}); // ignore errors (e.g. mid-signup)
    }, [currentUser, navigate]);

    // ── Step handlers ─────────────────────────────────────────────────────────

    async function handleStep1() {
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
        // If user already exists (browser-close-mid-wizard), skip signup
        if (!currentUser) {
            try {
                setLoading(true);
                await signup(data.email, data.password);
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
                return;
            } finally {
                setLoading(false);
            }
        }
        setStep(2);
    }

    async function handleStep2() {
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
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleStep3() {
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
            setStep(4);
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
            setStep(4);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleStep4() {
        setError("");
        const hasAny =
            data.discordWebhookUrl || data.slackWebhookUrl || data.notificationEmail;
        if (!hasAny) {
            setStep(5);
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
            setStep(5);
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

    // ── Progress bar ──────────────────────────────────────────────────────────

    function ProgressBar() {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "2rem",
                }}
            >
                {STEPS.map((label, i) => {
                    const stepNum = i + 1;
                    const done = step > stepNum;
                    const active = step === stepNum;
                    return (
                        <div
                            key={label}
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            {i > 0 && (
                                <div
                                    style={{
                                        width: "40px",
                                        height: "2px",
                                        backgroundColor: done || active ? "#0066cc" : "#444",
                                        margin: "0 4px",
                                    }}
                                />
                            )}
                            <div style={{ textAlign: "center" }}>
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        backgroundColor:
                                            done ? "#0066cc" : active ? "#0066cc" : "#333",
                                        border: active ? "2px solid #4499ff" : "2px solid transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "bold",
                                        fontSize: "0.85rem",
                                        color: "white",
                                        margin: "0 auto 4px",
                                    }}
                                >
                                    {done ? "✓" : stepNum}
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.7rem",
                                        color: active ? "white" : "#888",
                                        whiteSpace: "nowrap",
                                    }}
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

    function Step1() {
        return (
            <>
                <h2 style={{ marginBottom: "1.5rem" }}>Create your account</h2>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>Email</label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => set("email", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="you@example.com"
                    />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>Password</label>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => set("password", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="At least 6 characters"
                    />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={labelStyle}>Confirm Password</label>
                    <input
                        type="password"
                        value={data.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="Repeat your password"
                    />
                </div>
            </>
        );
    }

    function Step2() {
        return (
            <>
                <h2 style={{ marginBottom: "0.5rem" }}>Add a wallet address</h2>
                <p style={{ color: "#aaa", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                    Enter the Ethereum address you want to monitor.
                </p>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>ETH Address</label>
                    <input
                        type="text"
                        value={data.walletAddress}
                        onChange={(e) => set("walletAddress", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="0x..."
                    />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={labelStyle}>Label (optional)</label>
                    <input
                        type="text"
                        value={data.walletLabel}
                        onChange={(e) => set("walletLabel", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="e.g. My main wallet"
                    />
                </div>
            </>
        );
    }

    function Step3() {
        return (
            <>
                <h2 style={{ marginBottom: "0.5rem" }}>Configure alert rules</h2>
                <p style={{ color: "#aaa", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                    Choose which events trigger notifications. You can change these later.
                </p>

                <CheckboxRow
                    checked={data.alertIncomingTx}
                    onChange={(v) => set("alertIncomingTx", v)}
                    label="Incoming transaction"
                />
                <CheckboxRow
                    checked={data.alertOutgoingTx}
                    onChange={(v) => set("alertOutgoingTx", v)}
                    label="Outgoing transaction"
                />
                <CheckboxRow
                    checked={data.alertLargeTransfer}
                    onChange={(v) => set("alertLargeTransfer", v)}
                    label="Large transfer"
                >
                    {data.alertLargeTransfer && (
                        <div style={{ marginTop: "0.5rem", marginLeft: "1.75rem" }}>
                            <input
                                type="number"
                                value={data.largeTransferThreshold}
                                onChange={(e) => set("largeTransferThreshold", e.target.value)}
                                style={{ ...inputStyle, width: "160px" }}
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
                >
                    {data.alertBalanceBelow && (
                        <div style={{ marginTop: "0.5rem", marginLeft: "1.75rem" }}>
                            <input
                                type="number"
                                value={data.balanceBelowThreshold}
                                onChange={(e) => set("balanceBelowThreshold", e.target.value)}
                                style={{ ...inputStyle, width: "160px" }}
                                placeholder="Threshold (ETH)"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    )}
                </CheckboxRow>
            </>
        );
    }

    function Step4() {
        return (
            <>
                <h2 style={{ marginBottom: "0.5rem" }}>Set up notifications</h2>
                <p style={{ color: "#aaa", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                    Add at least one channel so you receive alerts. All fields are optional.
                </p>

                <div style={{ marginBottom: "1.25rem" }}>
                    <label style={labelStyle}>
                        Discord Webhook URL{" "}
                        <a
                            href="https://support.discord.com/hc/en-us/articles/228383668"
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#4499ff", fontSize: "0.8rem" }}
                        >
                            (how to get one)
                        </a>
                    </label>
                    <input
                        type="url"
                        value={data.discordWebhookUrl}
                        onChange={(e) => set("discordWebhookUrl", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="https://discord.com/api/webhooks/..."
                    />
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                    <label style={labelStyle}>
                        Slack Webhook URL{" "}
                        <a
                            href="https://api.slack.com/messaging/webhooks"
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#4499ff", fontSize: "0.8rem" }}
                        >
                            (how to get one)
                        </a>
                    </label>
                    <input
                        type="url"
                        value={data.slackWebhookUrl}
                        onChange={(e) => set("slackWebhookUrl", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="https://hooks.slack.com/services/..."
                    />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={labelStyle}>Email address for alerts</label>
                    <input
                        type="email"
                        value={data.notificationEmail}
                        onChange={(e) => set("notificationEmail", e.target.value)}
                        disabled={loading}
                        style={inputStyle}
                        placeholder="you@example.com"
                    />
                </div>
            </>
        );
    }

    function Step5() {
        const alertCount = data.alertsCreated.length;
        const hasNotif = data.notificationConfigured;

        return (
            <>
                <h2 style={{ marginBottom: "1rem" }}>You're all set!</h2>

                <div
                    style={{
                        backgroundColor: "#1e2e1e",
                        border: "1px solid #2d5a2d",
                        borderRadius: "6px",
                        padding: "1rem 1.25rem",
                        marginBottom: "1.5rem",
                    }}
                >
                    <p style={{ margin: "0 0 0.5rem", color: "#90ee90", fontWeight: "bold" }}>
                        Summary
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#ccc", lineHeight: "1.8" }}>
                        <li>
                            Wallet address added:{" "}
                            <span style={{ color: "white", fontFamily: "monospace", fontSize: "0.85rem" }}>
                                {data.walletAddress}
                            </span>
                            {data.walletLabel && ` (${data.walletLabel})`}
                        </li>
                        <li>
                            Alert rules configured:{" "}
                            <span style={{ color: "white" }}>
                                {alertCount > 0 ? `${alertCount} rule${alertCount !== 1 ? "s" : ""}` : "None (skipped)"}
                            </span>
                        </li>
                        <li>
                            Notification channels:{" "}
                            <span style={{ color: "white" }}>
                                {hasNotif ? "Configured" : "Not set up (skipped)"}
                            </span>
                        </li>
                    </ul>
                </div>

                {hasNotif && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <button
                            onClick={handleTestChannels}
                            disabled={testLoading}
                            style={{
                                padding: "0.6rem 1.25rem",
                                backgroundColor: testLoading ? "#333" : "#1a4d80",
                                color: "white",
                                border: "1px solid #0066cc",
                                borderRadius: "4px",
                                cursor: testLoading ? "not-allowed" : "pointer",
                                fontSize: "0.9rem",
                            }}
                        >
                            {testLoading ? "Testing..." : "Test All Channels"}
                        </button>

                        {testResults && (
                            <div style={{ marginTop: "0.75rem" }}>
                                {testResults.error ? (
                                    <p style={{ color: "#ff6666" }}>{testResults.error}</p>
                                ) : (
                                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                        {Object.entries(testResults).map(([channel, result]) => (
                                            <li
                                                key={channel}
                                                style={{
                                                    color: result.success ? "#90ee90" : "#ff6666",
                                                    fontSize: "0.9rem",
                                                    marginBottom: "0.25rem",
                                                }}
                                            >
                                                {result.success ? "✓" : "✗"} {channel}:{" "}
                                                {result.message || (result.success ? "OK" : "Failed")}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={() => navigate("/addresses")}
                    style={{
                        padding: "0.75rem 2rem",
                        backgroundColor: "#0066cc",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "bold",
                    }}
                >
                    Go to Dashboard →
                </button>
            </>
        );
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    function CheckboxRow({ checked, onChange, label, children }) {
        return (
            <div style={{ marginBottom: "1rem" }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        cursor: "pointer",
                        color: "#ddd",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "#0066cc" }}
                    />
                    {label}
                </label>
                {children}
            </div>
        );
    }

    // ── Footer navigation ─────────────────────────────────────────────────────

    function Footer() {
        if (step === 5) return null;

        const canSkip = step === 3 || step === 4;
        const canBack = step > 1;

        async function handleNext() {
            setSkipWarning("");
            if (step === 1) await handleStep1();
            else if (step === 2) await handleStep2();
            else if (step === 3) await handleStep3();
            else if (step === 4) await handleStep4();
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

        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1.5rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #333",
                }}
            >
                <div>
                    {canBack && (
                        <button
                            onClick={handleBack}
                            disabled={loading}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "transparent",
                                color: "#aaa",
                                border: "1px solid #444",
                                borderRadius: "4px",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            ← Back
                        </button>
                    )}
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    {canSkip && (
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "transparent",
                                color: "#aaa",
                                border: "1px solid #444",
                                borderRadius: "4px",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            Skip for now
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        style={{
                            padding: "0.5rem 1.25rem",
                            backgroundColor: loading ? "#333" : "#0066cc",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        {loading ? "Please wait..." : step === 4 ? "Finish" : "Next →"}
                    </button>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const stepContent = {
        1: <Step1 />,
        2: <Step2 />,
        3: <Step3 />,
        4: <Step4 />,
        5: <Step5 />,
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#1a1a1a",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: "3rem",
                paddingBottom: "3rem",
            }}
        >
            <div style={{ width: "100%", maxWidth: "540px", padding: "0 1rem" }}>
                <h1
                    style={{
                        textAlign: "center",
                        marginBottom: "2rem",
                        color: "#0066cc",
                        letterSpacing: "0.5px",
                    }}
                >
                    Koin Ping
                </h1>

                <ProgressBar />

                {error && (
                    <div
                        style={{
                            padding: "0.75rem 1rem",
                            marginBottom: "1rem",
                            backgroundColor: "#3a1a1a",
                            border: "1px solid #cc3333",
                            borderRadius: "4px",
                            color: "#ff6666",
                            fontSize: "0.9rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                {skipWarning && (
                    <div
                        style={{
                            padding: "0.75rem 1rem",
                            marginBottom: "1rem",
                            backgroundColor: "#3a2e00",
                            border: "1px solid #aa7700",
                            borderRadius: "4px",
                            color: "#ffcc44",
                            fontSize: "0.9rem",
                        }}
                    >
                        {skipWarning}
                    </div>
                )}

                <div
                    style={{
                        backgroundColor: "#242424",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        padding: "2rem",
                    }}
                >
                    {stepContent[step]}
                    <Footer />
                </div>

                {step === 1 && (
                    <p
                        style={{
                            textAlign: "center",
                            marginTop: "1.25rem",
                            color: "#888",
                            fontSize: "0.9rem",
                        }}
                    >
                        Already have an account?{" "}
                        <a href="/login" style={{ color: "#0066cc" }}>
                            Log in here
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
}
