import { useState, useEffect } from "react";
import AddressForm from "../components/AddressForm";
import { getAddresses, createAddress, deleteAddress, updateAddress } from "../api/addresses";

export default function Addresses() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState("");

    // Load addresses on mount
    useEffect(() => {
        async function fetchAddresses() {
            try {
                setLoading(true);
                const data = await getAddresses();
                setAddresses(data);
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch addresses:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAddresses();
    }, []);

    // Handle new address submission
    async function handleAddressSubmit(data) {
        try {
            const newAddress = await createAddress(data);
            setAddresses((prev) => [...prev, newAddress]);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to create address:", err);
        }
    }

    async function handleDelete(id, label) {
        const displayName = label || "this address";
        if (!window.confirm(`Remove "${displayName}"? This will also delete all associated alert rules.`)) {
            return;
        }
        try {
            await deleteAddress(id);
            setAddresses((prev) => prev.filter((a) => a.id !== id));
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to delete address:", err);
        }
    }

    function handleEditStart(addr) {
        setEditingId(addr.id);
        setEditLabel(addr.label ?? "");
    }

    async function handleEditSave(id) {
        try {
            const updated = await updateAddress(id, { label: editLabel || null });
            setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)));
            setEditingId(null);
            setEditLabel("");
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error("Failed to update address:", err);
        }
    }

    function handleEditCancel() {
        setEditingId(null);
        setEditLabel("");
    }

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
            <h1>Tracked Addresses</h1>

            <div style={{ marginBottom: "2rem" }}>
                <AddressForm onSubmit={handleAddressSubmit} />
            </div>

            <div>
                <h2>Existing Addresses</h2>
                {loading && <p>Loading addresses...</p>}
                {error && <p style={{ color: "red" }}>Error: {error}</p>}
                {!loading && !error && addresses.length === 0 && (
                    <p style={{ color: "#808080" }}>
                        No addresses tracked yet. Add one above to get started.
                    </p>
                )}
                {addresses.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {addresses.map((addr, index) => (
                            <li
                                key={addr.id || index}
                                style={{
                                    padding: "1rem",
                                    marginBottom: "0.5rem",
                                    border: "1px solid #444",
                                    borderRadius: "4px",
                                    backgroundColor: "#333",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ flex: 1 }}>
                                        {editingId === addr.id ? (
                                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                                                <input
                                                    value={editLabel}
                                                    onChange={(e) => setEditLabel(e.target.value)}
                                                    placeholder="Label (optional)"
                                                    style={{
                                                        background: "#444",
                                                        border: "1px solid #666",
                                                        borderRadius: "3px",
                                                        color: "#fff",
                                                        padding: "0.25rem 0.5rem",
                                                        fontSize: "0.9rem",
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleEditSave(addr.id);
                                                        if (e.key === "Escape") handleEditCancel();
                                                    }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleEditSave(addr.id)}
                                                    style={{ cursor: "pointer", padding: "0.25rem 0.6rem", fontSize: "0.85rem" }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleEditCancel}
                                                    style={{ cursor: "pointer", padding: "0.25rem 0.6rem", fontSize: "0.85rem", background: "transparent", color: "#aaa", border: "1px solid #555" }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                                <span style={{ fontWeight: "bold" }}>
                                                    {addr.label || "Unlabeled"}
                                                </span>
                                                <button
                                                    onClick={() => handleEditStart(addr)}
                                                    style={{
                                                        cursor: "pointer",
                                                        background: "transparent",
                                                        border: "none",
                                                        color: "#6699cc",
                                                        fontSize: "0.8rem",
                                                        padding: "0",
                                                        textDecoration: "underline",
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                fontFamily: "monospace",
                                                fontSize: "1.035rem",
                                                color: "#b3b3b3",
                                            }}
                                        >
                                            {addr.address}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(addr.id, addr.label)}
                                        style={{
                                            cursor: "pointer",
                                            background: "transparent",
                                            border: "1px solid #884444",
                                            color: "#cc6666",
                                            borderRadius: "3px",
                                            padding: "0.3rem 0.7rem",
                                            fontSize: "0.85rem",
                                            marginLeft: "1rem",
                                            flexShrink: 0,
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
