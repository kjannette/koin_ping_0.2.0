package handlers

import (
	"net/http"
	"time"
)

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "koin-ping-backend",
	})
}

func SystemStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"latestBlock": 0,
		"lag":         0,
		"status":      "healthy",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	})
}
