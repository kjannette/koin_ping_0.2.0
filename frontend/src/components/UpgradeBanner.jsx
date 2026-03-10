import { useNavigate } from "react-router-dom";
import "./UpgradeBanner.css";

export default function UpgradeBanner({ message, linkTo = "/account" }) {
  const navigate = useNavigate();

  return (
    <div className="upgrade-banner">
      <span className="upgrade-banner__message">{message}</span>
      <button
        className="upgrade-banner__link"
        onClick={() => navigate(linkTo)}
      >
        Upgrade
      </button>
    </div>
  );
}
