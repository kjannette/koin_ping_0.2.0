import "./TierPicker.css";

const TIERS = [
  {
    id: "free",
    name: "Free Trial Access",
    price: "$0",
    period: "",
    features: [
      "Monitor 1 blockchain address",
      "Daily email digest alert",
      "1 transaction alert type per monitored address",
    ],
    disabledFeatures: [
      "Real-time Discord alerts",
      "Real-time Telegram alerts",
      "Real-time Slack alerts",
    ],
  },
  {
    id: "premium",
    name: "Premium Access",
    price: "$1.99",
    period: "/month",
    features: [
      "Monitor 3 blockchain addresses",
      "Daily email digest alert",
      "Real-time Discord alerts",
      "Real-time Telegram alerts",
      "2 transaction alert types per monitored address",
    ],
    disabledFeatures: [
      "Real-time Slack alerts",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro Access",
    price: "$11.99",
    period: "/month",
    features: [
      "Monitor unlimited blockchain addresses",
      "Daily email digest alert",
      "Real-time Discord alerts",
      "Real-time Telegram alerts",
      "Real-time Slack alerts",
      "Unlimited transaction alert types per monitored address",
    ],
    disabledFeatures: [],
  },
];

export default function TierPicker({ onSelect, selectedTier }) {
  return (
    <div className="tier-picker">
      {TIERS.map((tier) => (
        <div
          key={tier.id}
          className={`tier-picker__card${tier.highlighted ? " tier-picker__card--highlighted" : ""}${selectedTier === tier.id ? " tier-picker__card--selected" : ""}`}
        >
          {tier.highlighted && (
            <div className="tier-picker__badge">Most Popular</div>
          )}
          <h3 className="tier-picker__name">{tier.name}</h3>
          <div className="tier-picker__price">
            <span className="tier-picker__amount">{tier.price}</span>
            {tier.period && (
              <span className="tier-picker__period">{tier.period}</span>
            )}
          </div>
          <ul className="tier-picker__features">
            {tier.features.map((f) => (
              <li key={f} className="tier-picker__feature">
                <span className="tier-picker__check">&#10003;</span> {f}
              </li>
            ))}
            {tier.disabledFeatures.map((f) => (
              <li key={f} className="tier-picker__feature tier-picker__feature--disabled">
                <span className="tier-picker__dash">&mdash;</span> {f}
              </li>
            ))}
          </ul>
          <button
            className={`btn tier-picker__btn${selectedTier === tier.id ? " tier-picker__btn--selected" : ""}`}
            onClick={() => onSelect(tier.id)}
          >
            {selectedTier === tier.id ? "Selected" : "Select"}
          </button>
        </div>
      ))}
    </div>
  );
}
