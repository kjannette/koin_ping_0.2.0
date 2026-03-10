import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "firebase/auth";
import { auth } from "../../firebase/config";
import { getAccount, createPortalSession } from "../../api/account";
import "./Account.css";

const TIER_LABELS = {
  free: "Free Trial",
  premium: "Premium",
  pro: "Pro",
};

export default function Account() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordErr, setPasswordErr] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const data = await getAccount();
        setAccount(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);

    if (newPassword.length < 6) {
      setPasswordErr("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr("Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordErr(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleManageSubscription() {
    try {
      setPortalLoading(true);
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <div className="page">Loading...</div>;
  }

  if (error && !account) {
    return <div className="page text-error">Error: {error}</div>;
  }

  const tier = account.subscription_tier || "free";
  const isCanceling = account.cancel_at_period_end;
  const statusLabel = isCanceling
    ? "Canceling"
    : account.subscription_status === "active"
      ? "Active"
      : account.subscription_status.charAt(0).toUpperCase() +
        account.subscription_status.slice(1);

  const canUpgrade = tier === "free" || tier === "premium";
  const hasPaidSub = tier !== "free";

  return (
    <div className="page account-page">
      <h1 className="mb-lg">Account</h1>

      {error && <div className="alert alert--error mb-lg">{error}</div>}

      {/* ── Profile Section ──────────────────────── */}
      <div className="section mb-lg">
        <h2 className="account__section-title">Profile</h2>
        <div className="account__row">
          <span className="account__label">Email</span>
          <span className="account__value">{account.email}</span>
        </div>
        <div className="account__row">
          <span className="account__label">User Name</span>
          <span className="account__value">{account.user_name}</span>
        </div>
        <div className="account__row account__row--last">
          <span className="account__label">User ID</span>
          <span className="account__value text-mono account__uuid">{account.user_id}</span>
        </div>
      </div>

      {/* ── Subscription Section ─────────────────── */}
      <div className="section mb-lg">
        <h2 className="account__section-title">Subscription</h2>
        <div className="account__row">
          <span className="account__label">Plan</span>
          <span className="account__value">{TIER_LABELS[tier] || account.subscription_plan}</span>
        </div>
        <div className="account__row">
          <span className="account__label">Status</span>
          <span className={`account__value account__status account__status--${isCanceling ? "canceling" : account.subscription_status}`}>
            {statusLabel}
          </span>
        </div>
        {account.member_since && (
          <div className="account__row">
            <span className="account__label">Member Since</span>
            <span className="account__value">{account.member_since}</span>
          </div>
        )}
        {account.next_billing_date && !isCanceling && (
          <div className="account__row">
            <span className="account__label">Next Billing Date</span>
            <span className="account__value">{account.next_billing_date}</span>
          </div>
        )}
        {isCanceling && account.period_end_date && (
          <div className="account__row">
            <span className="account__label">Access Until</span>
            <span className="account__value">{account.period_end_date}</span>
          </div>
        )}

        {isCanceling && (
          <div className="alert alert--warning mt-md">
            Your subscription has been canceled and will not renew.
            You have full access until {account.period_end_date}.
          </div>
        )}

        <div className="account__portal-section">
          {canUpgrade && (
            <button
              onClick={() => navigate("/subscribe")}
              className="btn btn--primary"
            >
              Upgrade Plan
            </button>
          )}
          {hasPaidSub && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="btn btn--ghost"
            >
              {portalLoading ? "Redirecting..." : "Manage Subscription"}
            </button>
          )}
          <p className="text-dimmed text-sm account__portal-hint">
            {hasPaidSub
              ? "Cancel subscription, update payment method, or view invoices via Stripe."
              : "Upgrade to unlock more addresses, alert types, and notification channels."}
          </p>
        </div>
      </div>

      {/* ── Change Password Section ──────────────── */}
      <div className="section">
        <h2 className="account__section-title">Change Password</h2>

        {passwordMsg && <div className="alert alert--success mb-md">{passwordMsg}</div>}
        {passwordErr && <div className="alert alert--error mb-md">{passwordErr}</div>}

        <form onSubmit={handlePasswordChange} className="account__password-form">
          <div className="form-field">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>
          <div className="form-field form-field--last">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>
          <button type="submit" disabled={changingPassword} className="btn btn--primary">
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
