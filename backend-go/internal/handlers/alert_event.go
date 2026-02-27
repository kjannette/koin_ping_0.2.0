package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

type AlertEventHandler struct {
	alertEvents *models.AlertEventModel
}

func NewAlertEventHandler(alertEvents *models.AlertEventModel) *AlertEventHandler {
	return &AlertEventHandler{alertEvents: alertEvents}
}

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

	writeJSON(w, http.StatusOK, events)
}
