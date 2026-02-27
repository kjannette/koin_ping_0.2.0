export default function Input({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    step,
    min,
    disabled = false,
  }) {
    return (
      <label style={{ display: "block", marginBottom: "1rem" }}>
        <div style={{ marginBottom: "0.25rem", fontSize: "0.9rem" }}>
          {label}
        </div>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          step={step}
          min={min}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontSize: "1rem",
          }}
        />
      </label>
    );
  }
  