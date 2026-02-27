package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/kjannette/koin-ping/backend-go/internal/models"
	"github.com/kjannette/koin-ping/backend-go/internal/protocols/ethereum"
)

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "koin-ping-backend",
	})
}

type StatusHandler struct {
	eth         ethereum.EthereumObserver
	checkpoints *models.CheckpointModel
}

func NewStatusHandler(eth ethereum.EthereumObserver, checkpoints *models.CheckpointModel) *StatusHandler {
	return &StatusHandler{eth: eth, checkpoints: checkpoints}
}

func (h *StatusHandler) SystemStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	status := "healthy"

	if h.eth == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"latestBlock":      0,
			"lag":              0,
			"trackedAddresses": 0,
			"status":           "no_rpc",
			"timestamp":        time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	latestBlock, err := h.eth.GetLatestBlockNumber(ctx)
	if err != nil {
		log.Printf("Failed to get latest block: %v", err)
		status = "degraded"
		latestBlock = 0
	}

	lag := 0
	checkpoints, err := h.checkpoints.ListAll(ctx)
	if err != nil {
		log.Printf("Failed to list checkpoints: %v", err)
	} else if len(checkpoints) > 0 && latestBlock > 0 {
		minChecked := checkpoints[0].LastCheckedBlock
		for _, cp := range checkpoints[1:] {
			if cp.LastCheckedBlock < minChecked {
				minChecked = cp.LastCheckedBlock
			}
		}
		lag = latestBlock - minChecked
	}

	if lag > 50 {
		status = "syncing"
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"latestBlock":      latestBlock,
		"lag":              lag,
		"trackedAddresses": len(checkpoints),
		"status":           status,
		"timestamp":        time.Now().UTC().Format(time.RFC3339),
	})
}
