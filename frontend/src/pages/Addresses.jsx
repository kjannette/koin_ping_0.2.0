import { useState, useEffect } from "react";
import AddressForm from "../components/AddressForm";
import Button from "../components/Button";
import { getAddresses, createAddress, deleteAddress } from "../api/addresses";

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  async function handleDelete(addressId) {
    if (!window.confirm("Delete this address? All associated alert rules and events will also be removed.")) {
      return;
    }

    try {
      setDeletingId(addressId);
      await deleteAddress(addressId);
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to delete address:", err);
    } finally {
      setDeletingId(null);
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
          <p style={{ color: "#666" }}>
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
                  backgroundColor: "#2a2a2a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                    {addr.label || "Unlabeled"}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#999" }}>
                    {addr.address}
                  </div>
                </div>
                <Button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  style={{
                    backgroundColor: deletingId === addr.id ? "#333" : "#dc3545",
                    color: "white",
                    border: "none",
                    cursor: deletingId === addr.id ? "not-allowed" : "pointer",
                  }}
                >
                  {deletingId === addr.id ? "Deleting..." : "Delete"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
