package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/kjannette/koin-ping/backend/internal/config"
	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
)

type AccountHandler struct {
	users     *models.UserModel
	addresses *models.AddressModel
	cfg       *config.Config
}

func NewAccountHandler(users *models.UserModel, addresses *models.AddressModel, cfg *config.Config) *AccountHandler {
	return &AccountHandler{users: users, addresses: addresses, cfg: cfg}
}

type accountResponse struct {
	UserID             string            `json:"user_id"`
	Email              string            `json:"email"`
	UserName           string            `json:"user_name"`
	SubscriptionStatus string            `json:"subscription_status"`
	SubscriptionTier   string            `json:"subscription_tier"`
	SubscriptionPlan   string            `json:"subscription_plan"`
	TierLimits         domain.TierLimits `json:"tier_limits"`
	AddressCount       int               `json:"address_count"`
	MemberSince        *string           `json:"member_since,omitempty"`
	NextBillingDate    *string           `json:"next_billing_date,omitempty"`
	CancelAtPeriodEnd  bool              `json:"cancel_at_period_end"`
	PeriodEndDate      *string           `json:"period_end_date,omitempty"`
}

var tierPlanLabels = map[domain.SubscriptionTier]string{ //nolint:gochecknoglobals
	domain.TierFree:    "Free Trial",
	domain.TierPremium: "Premium / $1.99 mo",
	domain.TierPro:     "Pro / $11.99 mo",
}

func (h *AccountHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	email := middleware.GetUserEmail(r.Context())

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		log.Printf("Account: failed to get user %s: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load user")
		return
	}

	addrCount, err := h.addresses.CountByUser(r.Context(), userID)
	if err != nil {
		log.Printf("Account: failed to count addresses for %s: %v", userID, err)
		addrCount = 0
	}

	planLabel := tierPlanLabels[user.SubscriptionTier]
	if planLabel == "" {
		planLabel = "Free Trial"
	}

	resp := accountResponse{
		UserID:             user.ID,
		Email:              email,
		UserName:           email,
		SubscriptionStatus: user.SubscriptionStatus,
		SubscriptionTier:   string(user.SubscriptionTier),
		SubscriptionPlan:   planLabel,
		TierLimits:         domain.GetTierLimits(user.SubscriptionTier),
		AddressCount:       addrCount,
	}

	if user.SubscriptionCreatedAt != nil {
		t := user.SubscriptionCreatedAt.Format(time.DateOnly)
		resp.MemberSince = &t
	}

	resp.NextBillingDate = nil
	resp.CancelAtPeriodEnd = false
	resp.PeriodEndDate = nil

	writeJSON(w, http.StatusOK, resp)
}
