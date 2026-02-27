package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

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
		Type      string   `json:"type"`
		Threshold *float64 `json:"threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	log.Printf("User %s creating alert for address ID: %d", userID, addressID)

	if body.Type == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Alert type is required")
		return
	}

	if !domain.IsValidAlertType(body.Type) {
		types := make([]string, len(domain.ValidAlertTypes))
		for i, t := range domain.ValidAlertTypes {
			types[i] = string(t)
		}
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			fmt.Sprintf("Invalid alert type. Must be one of: %s", strings.Join(types, ", ")))
		return
	}

	alertType := domain.AlertType(body.Type)
	if domain.IsThresholdRequired(alertType) {
		if body.Threshold == nil || *body.Threshold <= 0 {
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

	newAlert, err := h.alertRules.Create(r.Context(), addressID, alertType, body.Threshold)
	if err != nil {
		log.Printf("Error creating alert rule: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create alert rule")
		return
	}

	log.Printf("Alert rule created with ID: %d", newAlert.ID)
	writeJSON(w, http.StatusCreated, newAlert)
}

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
