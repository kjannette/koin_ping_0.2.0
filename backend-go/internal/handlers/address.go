// Package handlers implements HTTP request handlers for the API.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

var ethAddressRe = regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)

// AddressHandler handles HTTP requests for address management.
type AddressHandler struct {
	addresses *models.AddressModel
}

// NewAddressHandler creates a new AddressHandler.
func NewAddressHandler(addresses *models.AddressModel) *AddressHandler {
	return &AddressHandler{addresses: addresses}
}

// Create handles POST requests to add a new tracked address.
func (h *AddressHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		Address string  `json:"address"`
		Label   *string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("Failed to decode address request body: %v", err)
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")

		return
	}

	if body.Address == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Address is required")

		return
	}

	if !ethAddressRe.MatchString(body.Address) {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid Ethereum address format")

		return
	}

	log.Printf("User %s creating address: %s", userID, body.Address)

	addr, err := h.addresses.Create(r.Context(), userID, body.Address, body.Label)
	if err != nil {
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique") {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "You are already tracking this address")

			return
		}
		log.Printf("Error creating address: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create address")

		return
	}

	log.Printf("Address created with ID: %d", addr.ID)
	writeJSON(w, http.StatusCreated, addr)
}

// List handles GET requests to list all tracked addresses for the current user.
func (h *AddressHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	log.Printf("User %s listing addresses", userID)

	addresses, err := h.addresses.ListByUser(r.Context(), userID)
	if err != nil {
		log.Printf("Error listing addresses: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list addresses")

		return
	}

	if addresses == nil {
		addresses = []domain.Address{}
	}

	log.Printf("Found %d addresses for user", len(addresses))
	writeJSON(w, http.StatusOK, addresses)
}

// Remove handles DELETE requests to remove a tracked address.
func (h *AddressHandler) Remove(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	addressID, ok := parseIntParam(r.PathValue("addressId"))
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid address ID")

		return
	}

	log.Printf("User %s deleting address ID: %d", userID, addressID)

	deleted, err := h.addresses.Remove(r.Context(), addressID, userID)
	if err != nil {
		log.Printf("Error deleting address: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete address")

		return
	}

	if !deleted {
		log.Printf("Address %d not found or not owned by user", addressID)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Address not found")

		return
	}

	log.Printf("Address %d deleted", addressID)
	w.WriteHeader(http.StatusNoContent)
}
