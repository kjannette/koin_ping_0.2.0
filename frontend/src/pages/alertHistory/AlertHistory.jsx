import { useState, useEffect } from "react";
import { getAlertEvents } from "../../api/alertEvents";
import "./AlertHistory.css";

export default function AlertHistory() {
  const [alertEvents, setAlertEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAlertEvents() {
      try {
        setLoading(true);
        const data = await getAlertEvents();
        setAlertEvents(data);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch alert events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlertEvents();
  }, []);

  if (loading) {
    return <div className="page">Loading...</div>;
  }

  if (error) {
    return (
      <div className="page text-error">Error: {error}</div>
    );
  }

  return (
    <div className="page">
      <h1>Recent Alert Events</h1>

      {alertEvents.length === 0 ? (
        <p className="text-dimmed">No alerts yet</p>
      ) : (
        <ul className="list-unstyled">
          {alertEvents.map((event) => (
            <li key={event.id} className="alert-history__item">
              <div className="mb-sm">{event.message}</div>
              {event.address_label && (
                <div className="text-sm text-dimmed">
                  Address: {event.address_label}
                </div>
              )}
              <small className="text-muted">
                {formatTimestamp(event.timestamp)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
