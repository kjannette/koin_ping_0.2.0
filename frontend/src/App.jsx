import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Addresses from "./pages/Addresses";
import Alerts from "./pages/Alerts";
import AlertHistory from "./pages/AlertHistory";

export default function App() {
    const { currentUser, logout } = useAuth();

    // Show login/signup routes if not authenticated
    if (!currentUser) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    // Show main app if authenticated
    return (
        <div style={{ padding: "1rem" }}>
            <nav
                style={{
                    marginBottom: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <Link to="/addresses">Addresses</Link>
                    {" | "}
                    <Link to="/alerts">Alerts</Link>
                    {" | "}
                    <Link to="/history">History</Link>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                    }}
                >
                    <span style={{ fontSize: "0.9rem", color: "#999" }}>
                        {currentUser.email}
                    </span>
                    <button
                        onClick={logout}
                        style={{
                            padding: "0.5rem 1rem",
                            fontSize: "0.9rem",
                            backgroundColor: "#333",
                            color: "white",
                            border: "1px solid #555",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <Routes>
                <Route path="/" element={<Addresses />} />
                <Route path="/addresses" element={<Addresses />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/history" element={<AlertHistory />} />
                <Route path="*" element={<Navigate to="/addresses" />} />
            </Routes>
        </div>
    );
}
