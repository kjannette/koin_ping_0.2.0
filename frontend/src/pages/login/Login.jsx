import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/Input";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/addresses");
    } catch (err) {
      setError("Failed to log in: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="login-bg-video"
      >
        <source src="/koin_spin.mp4" type="video/mp4" />
      </video>

      <div className="login-card login-card-fadein">
        <h1 className="login-heading">
          <span className="login-brand">Koin Ping</span> - Login
        </h1>

        <div className="login-interactive-fadein">
          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              disabled={loading}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              disabled={loading}
              required
              className="form-field--last"
            />

            <button type="submit" disabled={loading} className="btn btn--primary login-button">
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="login-footer">
            <p className="text-muted">
              Don't have an account?{" "}
              <Link to="/signup" className="login-signup-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
