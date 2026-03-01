import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { to: "/addresses", label: "Addresses" },
  { to: "/alerts", label: "Configure Alerts" },
  { to: "/history", label: "Alert History" },
];

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem 2rem",
      marginBottom: "1.5rem",
      backgroundColor: "#1a1a1a",
      borderBottom: "1px solid #333",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "#fff",
          marginRight: "2rem",
          letterSpacing: "0.5px",
        }}>
          Koin Ping
        </span>

        <div style={{ display: "flex", gap: "0.25rem" }}>
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "1.425rem",
                  fontWeight: isActive ? 600 : 200,
                  color: isActive ? "#fff" : "#999",
                  backgroundColor: isActive ? "#333" : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <span style={{ fontSize: "1.275rem", color: "#777" }}>
          {currentUser.email}
        </span>
        <button
          onClick={logout}
          style={{
            padding: "0.4rem 1rem",
            fontSize: "1.275rem",
            fontWeight: 400,
            backgroundColor: "transparent",
            color: "#999",
            border: "1px solid #444",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
