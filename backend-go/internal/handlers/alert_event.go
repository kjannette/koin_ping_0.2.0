package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

// AlertEventHandler handles HTTP requests for alert event history.
type AlertEventHandler struct {
	alertEvents *models.AlertEventModel
}

// NewAlertEventHandler creates a new AlertEventHandler.
func NewAlertEventHandler(alertEvents *models.AlertEventModel) *AlertEventHandler {
	return &AlertEventHandler{alertEvents: alertEvents}
}

// List handles GET requests to list recent alert events for the current user.
func (h *AlertEventHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil {
			limit = n
		}
	}

	log.Printf("User %s listing alert events (limit: %d)", userID, limit)

	if limit < 1 || limit > 100 {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Limit must be between 1 and 100")

		return
	}

	events, err := h.alertEvents.ListRecentByUser(r.Context(), userID, limit)
	if err != nil {
		log.Printf("Error listing alert events: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list alert events")

		return
	}

	log.Printf("Found %d alert events for user", len(events))

	// MVP scaffolding: return mock data if DB is empty
	if len(events) == 0 {
		events = mockEvents(limit)
	}

	writeJSON(w, http.StatusOK, events)
}

func mockEvents(limit int) []domain.AlertEvent {
	label1 := "Treasury Wallet"
	label2 := "Cold Storage"

	mocks := []domain.AlertEvent{
		{
			ID:           1,
			AlertRuleID:  1,
			Message:      "Incoming transaction detected: 5.5 ETH received",
			AddressLabel: &label1,
			Timestamp:    time.Now().Add(-2 * time.Hour),
		},
		{
			ID:           2,           //nolint:mnd
			AlertRuleID:  2,           //nolint:mnd
			Message:      "Balance dropped below threshold: Current balance 8.2 ETH",
			AddressLabel: &label1,
			Timestamp:    time.Now().Add(-5 * time.Hour),
		},
		{
			ID:           3,           //nolint:mnd
			AlertRuleID:  3,           //nolint:mnd
			Message:      "Outgoing transaction detected: 2.0 ETH sent",
			AddressLabel: &label2,
			Timestamp:    time.Now().Add(-24 * time.Hour),
		},
	}

	if limit < len(mocks) {
		return mocks[:limit]
	}

	return mocks
}
