import { useState, useEffect } from "react";
import AddressForm from "../../components/AddressForm";
import { getAddresses, createAddress, deleteAddress, updateAddress } from "../../api/addresses";
import "./Addresses.css";

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");

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
    <div className="page">
      <h1>Add Addresses to Track</h1>

      <div className="mb-xl">
        <AddressForm onSubmit={handleAddressSubmit} />
      </div>

      <div>
        <h2>Existing Tracked Addresses</h2>
        {loading && <p>Loading addresses...</p>}
        {error && <p className="text-error">Error: {error}</p>}
        {!loading && !error && addresses.length === 0 && (
          <p className="text-dimmed">
            No addresses tracked yet. Add one above to get started.
          </p>
        )}
        {addresses.length > 0 && (
          <ul className="list-unstyled">
            {addresses.map((addr, index) => (
              <li key={addr.id || index} className="list-item--card">
                <div className="flex flex--between flex--center">
                  <div>
                    {editingId === addr.id ? (
                      <div className="flex flex--center gap-sm mb-sm">
                        <input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Label (optional)"
                          className="address__edit-input"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(addr.id);
                            if (e.key === "Escape") handleEditCancel();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSave(addr.id)}
                          className="btn btn--primary btn--sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="btn btn--ghost btn--sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex--center gap-sm mb-sm">
                        <span className="text-bold">
                          {addr.label || "Unlabeled"}
                        </span>
                        <button
                          onClick={() => handleEditStart(addr)}
                          className="address__edit-link"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    <div className="text-mono text-sm text-muted">
                      {addr.address}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(addr.id, addr.label)}
                    className="address__remove"
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
