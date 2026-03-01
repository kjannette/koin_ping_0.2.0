package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

// StatusHandler handles the system status endpoint.
type StatusHandler struct {
	checkpoints *models.CheckpointModel
}

// NewStatusHandler creates a new StatusHandler.
func NewStatusHandler(checkpoints *models.CheckpointModel) *StatusHandler {
	return &StatusHandler{checkpoints: checkpoints}
}

// GetStatus returns real-time system status derived from checkpoint data.
func (h *StatusHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	block, checkedAt, err := h.checkpoints.GetLatestBlock(r.Context())
	if err != nil {
		log.Printf("Error querying latest block: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get system status")

		return
	}

	latestBlock := 0
	lag := 0
	status := "starting"

	if checkedAt != nil {
		lag = int(time.Since(*checkedAt).Seconds())
		if lag > 600 { //nolint:mnd
			status = "idle"
		} else {
			status = "active"
		}
	}

	if block != nil {
		latestBlock = *block
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":        status,
		"latestBlock":   latestBlock,
		"lag":           lag,
		"lastCheckedAt": checkedAtStr(checkedAt),
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	})
}

func checkedAtStr(t *time.Time) string {
	if t == nil {
		return ""
	}

	return t.UTC().Format(time.RFC3339)
}

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "koin-ping-backend",
	})
}
