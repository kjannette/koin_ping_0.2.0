import "./Input.css";

export default function Input({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    step,
    min,
    disabled = false,
    required = false,
    className = "",
}) {
    return (
        <label className={`form-field ${className}`}>
            <div className="input__label">{label}</div>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                step={step}
                min={min}
                disabled={disabled}
                required={required}
                onChange={(e) => onChange(e.target.value)}
                className="input__control"
            />
        </label>
    );
}
