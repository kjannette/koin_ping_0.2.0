package handlers

import (
	"log"
	"net/http"

	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
	"github.com/kjannette/koin-ping/backend/internal/services"
)

type EmailDigestHandler struct {
	digestSvc *services.EmailDigestService
	configs   *models.NotificationConfigModel
}

func NewEmailDigestHandler(
	digestSvc *services.EmailDigestService,
	configs *models.NotificationConfigModel,
) *EmailDigestHandler {
	return &EmailDigestHandler{digestSvc: digestSvc, configs: configs}
}

// SetupEmail reads the user's email from their notification config and sends
// a confirmation message via Resend to verify the integration works.
func (h *EmailDigestHandler) SetupEmail(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if !h.digestSvc.Configured() {
		writeError(w, http.StatusServiceUnavailable, "EMAIL_NOT_CONFIGURED",
			"Email service is not configured on the server")
		return
	}

	cfg, err := h.configs.GetConfig(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting notification config for email setup: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR",
			"Failed to load notification config")
		return
	}

	if cfg == nil || cfg.Email == nil || *cfg.Email == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"Save an email address in notification settings first")
		return
	}

	if err := h.digestSvc.SetupEmail(*cfg.Email); err != nil {
		log.Printf("Email setup failed for user %s: %v", userID, err)
		writeError(w, http.StatusBadGateway, "EMAIL_SEND_FAILED",
			"Failed to send confirmation email — check server email config")
		return
	}

	log.Printf("Email setup confirmation sent to user %s (%s)", userID, *cfg.Email)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"email":   *cfg.Email,
		"message": "Confirmation email sent",
	})
}

// SendDigest compiles and sends a digest of recent alerts to the user's email.
func (h *EmailDigestHandler) SendDigest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if !h.digestSvc.Configured() {
		writeError(w, http.StatusServiceUnavailable, "EMAIL_NOT_CONFIGURED",
			"Email service is not configured on the server")
		return
	}

	cfg, err := h.configs.GetConfig(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting notification config for digest: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR",
			"Failed to load notification config")
		return
	}

	if cfg == nil || cfg.Email == nil || *cfg.Email == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"No email address configured")
		return
	}

	if err := h.digestSvc.SendDigest(r.Context(), userID, *cfg.Email); err != nil {
		log.Printf("Digest send failed for user %s: %v", userID, err)
		writeError(w, http.StatusBadGateway, "DIGEST_SEND_FAILED",
			"Failed to send digest email")
		return
	}

	log.Printf("Digest sent to user %s (%s)", userID, *cfg.Email)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"email":   *cfg.Email,
		"message": "Digest email sent",
	})
}
