export default function Button({
    children,
    onClick,
    disabled = false,
    type = "button",
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "0.5rem 1rem",
                fontSize: "1rem",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
            }}
        >
            {children}
        </button>
    );
}
