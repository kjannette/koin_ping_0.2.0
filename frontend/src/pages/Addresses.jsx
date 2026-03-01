import { useState, useEffect } from "react";
import AddressForm from "../components/AddressForm";
import { getAddresses, createAddress } from "../api/addresses";

export default function Addresses() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            // Append new address to state
            setAddresses((prev) => [...prev, newAddress]);
            setError(null); // Clear any previous errors
        } catch (err) {
            setError(err.message);
            console.error("Failed to create address:", err);
        }
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
                                <div
                                    style={{
                                        fontWeight: "bold",
                                        marginBottom: "0.25rem",
                                    }}
                                >
                                    {addr.label || "Unlabeled"}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: "1.035rem",
                                        color: "#b3b3b3",
                                    }}
                                >
                                    {addr.address}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
