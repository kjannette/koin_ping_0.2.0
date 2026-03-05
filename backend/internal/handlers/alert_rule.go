package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
)

var errThresholdFormat = errors.New("unsupported threshold format")

type AlertRuleHandler struct {
	alertRules *models.AlertRuleModel
	addresses  *models.AddressModel
}

func NewAlertRuleHandler(alertRules *models.AlertRuleModel, addresses *models.AddressModel) *AlertRuleHandler {
	return &AlertRuleHandler{alertRules: alertRules, addresses: addresses}
}

func (h *AlertRuleHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	addressID, ok := parseIntParam(r.PathValue("addressId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid address ID")

		return
	}

	var body struct {
		Type      string          `json:"type"`
		Threshold json.RawMessage `json:"threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("Failed to decode alert request body: %v", err)
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")

		return
	}

	threshold, err := parseThreshold(body.Threshold)
	if err != nil {
		log.Printf("Failed to parse threshold: %v", err)
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "threshold must be a valid number")

		return
	}

	log.Printf("User %s creating alert: type=%s, addressID=%d", userID, body.Type, addressID)

	if body.Type == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Alert type is required")

		return
	}

	if !domain.IsValidAlertType(body.Type) {
		types := make([]string, len(domain.ValidAlertTypes))
		for i, t := range domain.ValidAlertTypes {
			types[i] = t.String()
		}
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"Invalid alert type. Must be one of: "+strings.Join(types, ", "))

		return
	}

	alertType := domain.AlertType(body.Type)
	if domain.IsThresholdRequired(alertType) {
		if threshold == nil || *threshold <= 0 {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
				fmt.Sprintf("Alert type '%s' requires a positive threshold value", body.Type))

			return
		}
	}

	addr, err := h.addresses.FindByID(r.Context(), addressID, &userID)
	if err != nil {
		log.Printf("Error finding address: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create alert rule")

		return
	}
	if addr == nil {
		log.Printf("Address %d not found or not owned by user", addressID)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Address not found")

		return
	}

	newAlert, err := h.alertRules.Create(r.Context(), addressID, alertType, threshold)
	if err != nil {
		log.Printf("Error creating alert rule: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create alert rule")

		return
	}

	log.Printf("Alert rule created with ID: %d", newAlert.ID)
	writeJSON(w, http.StatusCreated, newAlert)
}

func parseThreshold(raw json.RawMessage) (*float64, error) {
	if len(raw) == 0 {
		return nil, nil //nolint:nilnil
	}

	// Check null before number -- json.Unmarshal treats null as valid for float64 (sets to 0).
	if string(raw) == "null" {
		return nil, nil //nolint:nilnil
	}

	var asNumber float64
	if err := json.Unmarshal(raw, &asNumber); err == nil {
		return &asNumber, nil
	}

	var asString string
	if err := json.Unmarshal(raw, &asString); err == nil {
		asString = strings.TrimSpace(asString)
		if asString == "" {
			return nil, nil //nolint:nilnil
		}
		parsed, parseErr := strconv.ParseFloat(asString, 64)
		if parseErr != nil {
			return nil, parseErr
		}

		return &parsed, nil
	}

	return nil, errThresholdFormat
}

// ListByAddress handles GET requests to list alert rules for an address.
func (h *AlertRuleHandler) ListByAddress(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	addressID, ok := parseIntParam(r.PathValue("addressId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid address ID")

		return
	}

	log.Printf("User %s listing alerts for address ID: %d", userID, addressID)

	addr, err := h.addresses.FindByID(r.Context(), addressID, &userID)
	if err != nil {
		log.Printf("Error finding address: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list alerts")

		return
	}
	if addr == nil {
		log.Printf("Address %d not found or not owned by user", addressID)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Address not found")

		return
	}

	alerts, err := h.alertRules.ListByAddress(r.Context(), addressID)
	if err != nil {
		log.Printf("Error listing alerts: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list alerts")

		return
	}

	if alerts == nil {
		alerts = []domain.AlertRule{}
	}

	log.Printf("Found %d alert rules", len(alerts))
	writeJSON(w, http.StatusOK, alerts)
}

// UpdateStatus handles PATCH requests to enable or disable an alert rule.
func (h *AlertRuleHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	alertID, ok := parseIntParam(r.PathValue("alertId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid alert ID")

		return
	}

	var body struct {
		Enabled *bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("Failed to decode update request body: %v", err)
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")

		return
	}

	log.Printf("User %s updating alert ID: %d", userID, alertID)

	if body.Enabled == nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "enabled must be a boolean value")

		return
	}

	alert, err := h.alertRules.FindByID(r.Context(), alertID, &userID)
	if err != nil {
		log.Printf("Error finding alert: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update alert")

		return
	}
	if alert == nil {
		log.Printf("Alert %d not found or not owned by user", alertID)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Alert rule not found")

		return
	}

	updated, err := h.alertRules.UpdateEnabled(r.Context(), alertID, *body.Enabled)
	if err != nil {
		log.Printf("Error updating alert: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update alert")

		return
	}

	log.Printf("Alert %d updated: enabled=%v", alertID, *body.Enabled)
	writeJSON(w, http.StatusOK, updated)
}

// Remove handles DELETE requests to remove an alert rule.
func (h *AlertRuleHandler) Remove(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	alertID, ok := parseIntParam(r.PathValue("alertId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid alert ID")

		return
	}

	log.Printf("User %s deleting alert ID: %d", userID, alertID)

	alert, err := h.alertRules.FindByID(r.Context(), alertID, &userID)
	if err != nil {
		log.Printf("Error finding alert: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete alert")

		return
	}
	if alert == nil {
		log.Printf("Alert %d not found or not owned by user", alertID)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Alert rule not found")

		return
	}

	if _, err := h.alertRules.Remove(r.Context(), alertID); err != nil {
		log.Printf("Error deleting alert: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete alert")

		return
	}

	log.Printf("Alert %d deleted", alertID)
	w.WriteHeader(http.StatusNoContent)
}
