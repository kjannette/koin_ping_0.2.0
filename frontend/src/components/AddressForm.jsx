import { useState } from "react";
import Input from "./Input";
import Button from "./Button";

export default function AddressForm({ onSubmit }) {
    const [address, setAddress] = useState("");
    const [label, setLabel] = useState("");

    const canSubmit = address.trim().length > 0;

    function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;

        onSubmit({
            address: address.trim(),
            label: label.trim(),
        });

        setAddress("");
        setLabel("");
    }

    return (
        <form onSubmit={handleSubmit}>
            <Input
                label="Blockchain Address"
                value={address}
                onChange={setAddress}
                placeholder="0x..."
            />

            <Input
                label="Label (optional)"
                value={label}
                onChange={setLabel}
                placeholder="Treasury, Cold Wallet, etc."
            />

            <Button type="submit" disabled={!canSubmit} className="mt-md">
                Add Address
            </Button>
        </form>
    );
}
