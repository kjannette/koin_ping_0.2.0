import { useState } from "react";
import Input from "./Input";
import Button from "./Button";

const ALERT_TYPES = [
    { value: "incoming_tx", label: "Incoming transaction" },
    { value: "outgoing_tx", label: "Outgoing transaction" },
    { value: "large_transfer", label: "Large transfer" },
    { value: "balance_below", label: "Balance below threshold" },
];

export default function AlertForm({ onSubmit }) {
    const [type, setType] = useState("incoming_tx");
    const [threshold, setThreshold] = useState("");

    const needsThreshold =
        type === "large_transfer" || type === "balance_below";

    const canSubmit = needsThreshold
        ? threshold.trim() !== "" &&
          !isNaN(Number(threshold)) &&
          Number(threshold) > 0
        : true;

    function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;

        onSubmit({
            type,
            threshold: needsThreshold ? Number(threshold) : undefined,
        });

        setThreshold("");
    }

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
                {ALERT_TYPES.map((opt) => (
                    <label key={opt.value} style={{ display: "block" }}>
                        <input
                            type="radio"
                            name="alertType"
                            value={opt.value}
                            checked={type === opt.value}
                            onChange={() => setType(opt.value)}
                        />{" "}
                        {opt.label}
                    </label>
                ))}
            </div>

            {needsThreshold && (
                <Input
                    label="Amount (ETH)"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={threshold}
                    onChange={setThreshold}
                    placeholder="e.g. 10"
                />
            )}

            <Button type="submit" disabled={!canSubmit}>
                Create Alert
            </Button>
        </form>
    );
}
