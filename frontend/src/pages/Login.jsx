/**
 * Login Page
 *
 * Allows existing users to sign in with email and password
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        // Validation
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setError("");
            setLoading(true);
            await login(email, password);
            navigate("/addresses"); // Redirect to main app
        } catch (err) {
            setError("Failed to log in: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                maxWidth: "400px",
                margin: "4rem auto",
                padding: "2rem",
                border: "1px solid #333",
                borderRadius: "8px",
            }}
        >
            <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>
                Koin Ping - Login
            </h1>

            {error && (
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
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "0.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #444",
                            borderRadius: "4px",
                            color: "white",
                        }}
                        required
                    />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "0.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #444",
                            borderRadius: "4px",
                            color: "white",
                        }}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "0.75rem",
                        fontSize: "1rem",
                        backgroundColor: loading ? "#333" : "#0066cc",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Logging in..." : "Log In"}
                </button>
            </form>

            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                <p style={{ color: "#999" }}>
                    Don't have an account?{" "}
                    <Link
                        to="/signup"
                        style={{ color: "#0066cc", textDecoration: "none" }}
                    >
                        Sign up here
                    </Link>
                </p>
            </div>
        </div>
    );
}
