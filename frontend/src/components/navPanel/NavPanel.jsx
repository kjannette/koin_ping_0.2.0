import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./NavPanel.css";

const navLinks = [
  { to: "/addresses", label: "Addresses" },
  { to: "/alerts", label: "Configure Alerts" },
  { to: "/alertevents", label: "Alert Event History" },
];

export default function NavPanel({ isOpen, onClose }) {
  const { logout } = useAuth();
  const location = useLocation();

  const handleNavClick = () => {
    onClose();
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      <div
        className={`nav-panel__overlay${isOpen ? " nav-panel__overlay--visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`nav-panel${isOpen ? " nav-panel--open" : ""}`}>
        <nav className="nav-panel__nav">
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`nav-panel__link${isActive ? " nav-panel__link--active" : ""}`}
                onClick={handleNavClick}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <button onClick={handleLogout} className="nav-panel__logout">
          Logout
        </button>
      </aside>
    </>
  );
}
