import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";

const navLinks = [
  { to: "/addresses", label: "Addresses" },
  { to: "/alerts", label: "Configure Alerts" },
  { to: "/alertevents", label: "Alert Event History" },
];

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="flex flex--center gap-sm">
        <span className="navbar__brand">Koin Ping</span>
        <div className="navbar__links">
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`navbar__link ${isActive ? "navbar__link--active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex--center gap-lg">
        <span className="navbar__user">{currentUser.email}</span>
        <button onClick={logout} className="navbar__logout">
          Logout
        </button>
      </div>
    </nav>
  );
}
