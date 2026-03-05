import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NavPanel from "./navPanel/NavPanel";
import "./Navbar.css";

const navLinks = [
  { to: "/addresses", label: "Addresses" },
  { to: "/alerts", label: "Configure Alerts" },
  { to: "/alertevents", label: "Alert Event History" },
];

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <>
      <nav className="navbar">
        <div className="navbar__left">
          <div className="navbar__brand-group">
            <span className="navbar__brand">Koin Ping</span>
            <Link to="/account" className="navbar__user-link navbar__user-link--mobile">
              {currentUser.email}
            </Link>
          </div>
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

        <div className="navbar__right">
          <Link to="/account" className="navbar__user navbar__user-link navbar__user-link--desktop">
            {currentUser.email}
          </Link>
          <button onClick={logout} className="navbar__logout">
            Logout
          </button>
          <button
            className="navbar__hamburger"
            onClick={() => setIsNavPanelOpen(true)}
            aria-label="Open navigation menu"
          >
            <span className="navbar__hamburger-bar" />
            <span className="navbar__hamburger-bar" />
            <span className="navbar__hamburger-bar" />
          </button>
        </div>
      </nav>

      <NavPanel
        isOpen={isNavPanelOpen}
        onClose={() => setIsNavPanelOpen(false)}
      />
    </>
  );
}
