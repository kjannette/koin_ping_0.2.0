package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/kjannette/koin-ping/backend/internal/config"
	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
)

type AccountHandler struct {
	users *models.UserModel
	cfg   *config.Config
}

func NewAccountHandler(users *models.UserModel, cfg *config.Config) *AccountHandler {
	return &AccountHandler{users: users, cfg: cfg}
}

type accountResponse struct {
	UserID             string  `json:"user_id"`
	Email              string  `json:"email"`
	UserName           string  `json:"user_name"`
	SubscriptionStatus string  `json:"subscription_status"`
	SubscriptionPlan   string  `json:"subscription_plan"`
	MemberSince        *string `json:"member_since,omitempty"`
	NextBillingDate    *string `json:"next_billing_date,omitempty"`
	CancelAtPeriodEnd  bool    `json:"cancel_at_period_end"`
	PeriodEndDate      *string `json:"period_end_date,omitempty"`
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

	resp := accountResponse{
		UserID:             user.ID,
		Email:              email,
		UserName:           email,
		SubscriptionStatus: user.SubscriptionStatus,
		SubscriptionPlan:   "monthly/$1.99",
	}

	if user.SubscriptionCreatedAt != nil {
		t := user.SubscriptionCreatedAt.Format(time.DateOnly)
		resp.MemberSince = &t
	}

	// MOCKED: NextBillingDate, CancelAtPeriodEnd, PeriodEndDate.
	// TODO: stripe-go v82 removed Subscription.CurrentPeriodEnd / CancelAtPeriodEnd.
	// Research SubscriptionItem.CurrentPeriodEnd or use Stripe REST API directly.
	resp.NextBillingDate = nil
	resp.CancelAtPeriodEnd = false
	resp.PeriodEndDate = nil

	writeJSON(w, http.StatusOK, resp)
}
