package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/stripe/stripe-go/v82"
	portalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"

	"github.com/kjannette/koin-ping/backend/internal/config"
	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
)

const webhookMaxBodyBytes = 65536

type StripeHandler struct {
	users *models.UserModel
	cfg   *config.Config
}

func NewStripeHandler(users *models.UserModel, cfg *config.Config) *StripeHandler {
	stripe.Key = cfg.StripeSecretKey
	return &StripeHandler{users: users, cfg: cfg}
}

func (h *StripeHandler) priceIDForTier(tier domain.SubscriptionTier) (string, error) {
	switch tier {
	case domain.TierPremium:
		return h.cfg.StripePriceIDPremium, nil
	case domain.TierPro:
		return h.cfg.StripePriceIDPro, nil
	default:
		return "", fmt.Errorf("no Stripe price for tier %q", tier) //nolint:err113
	}
}

// CreateCheckoutSession creates a Stripe Checkout session for the selected tier.
func (h *StripeHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		Tier string `json:"tier"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	if body.Tier == "" {
		body.Tier = "premium"
	}

	tier := domain.SubscriptionTier(body.Tier)
	if tier != domain.TierPremium && tier != domain.TierPro {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Tier must be 'premium' or 'pro'")
		return
	}

	priceID, err := h.priceIDForTier(tier)
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		log.Printf("Failed to get user %s: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load user")
		return
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL:        stripe.String(h.cfg.FrontendURL + "/subscribe?payment=success&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripe.String(h.cfg.FrontendURL + "/subscribe?payment=cancelled"),
		ClientReferenceID: stripe.String(userID),
		CustomerEmail:     stripe.String(user.Email),
	}

	params.AddMetadata("tier", string(tier))

	if user.StripeCustomerID != nil && *user.StripeCustomerID != "" {
		params.Customer = user.StripeCustomerID
		params.CustomerEmail = nil
	}

	s, err := checkoutsession.New(params)
	if err != nil {
		log.Printf("Failed to create Stripe checkout session: %v", err)
		writeError(w, http.StatusInternalServerError, "STRIPE_ERROR", "Failed to create checkout session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": s.URL})
}

// GetSubscriptionStatus returns the current user's subscription state.
func (h *StripeHandler) GetSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		log.Printf("Failed to get user %s: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"subscription_status": user.SubscriptionStatus,
		"subscription_tier":   user.SubscriptionTier,
		"subscription_created_at": user.SubscriptionCreatedAt,
	})
}

// VerifyCheckoutSession retrieves a completed checkout session from Stripe,
// confirms payment, and activates the user's subscription in the database.
func (h *StripeHandler) VerifyCheckoutSession(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		SessionID string `json:"session_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.SessionID == "" {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing session_id")
		return
	}

	s, err := checkoutsession.Get(body.SessionID, nil)
	if err != nil {
		log.Printf("Failed to retrieve checkout session %s: %v", body.SessionID, err)
		writeError(w, http.StatusBadRequest, "STRIPE_ERROR", "Invalid checkout session")
		return
	}

	if s.ClientReferenceID != userID {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "Session does not belong to this user")
		return
	}

	if s.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		writeError(w, http.StatusBadRequest, "PAYMENT_INCOMPLETE", "Payment has not been completed")
		return
	}

	tier := domain.TierPremium
	if t, ok := s.Metadata["tier"]; ok && domain.IsValidTier(t) {
		tier = domain.SubscriptionTier(t)
	}

	customerID := ""
	if s.Customer != nil {
		customerID = s.Customer.ID
	}
	subscriptionID := ""
	if s.Subscription != nil {
		subscriptionID = s.Subscription.ID
	}

	if customerID != "" {
		if err := h.users.UpdateStripeCustomer(r.Context(), userID, customerID); err != nil {
			log.Printf("VerifyCheckout: failed to save customer ID: %v", err)
		}
	}
	if subscriptionID != "" && customerID != "" {
		if err := h.users.ActivateSubscription(r.Context(), customerID, subscriptionID, "active", tier); err != nil {
			log.Printf("VerifyCheckout: failed to activate subscription: %v", err)
		}
	}

	log.Printf("Checkout verified for user %s, customer %s, subscription %s, tier %s", userID, customerID, subscriptionID, tier)
	writeJSON(w, http.StatusOK, map[string]string{
		"subscription_status": "active",
		"subscription_tier":   string(tier),
	})
}

// ActivateFreeTier sets the user to the free tier without Stripe involvement.
func (h *StripeHandler) ActivateFreeTier(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if err := h.users.ActivateFreeTier(r.Context(), userID); err != nil {
		log.Printf("ActivateFreeTier: failed for user %s: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to activate free tier")
		return
	}

	log.Printf("Free tier activated for user %s", userID)
	writeJSON(w, http.StatusOK, map[string]string{
		"subscription_status": "active",
		"subscription_tier":   "free",
	})
}

// CreatePortalSession creates a Stripe Billing Portal session so the user can
// manage their subscription (cancel, update payment method, view invoices).
func (h *StripeHandler) CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		log.Printf("Portal: failed to get user %s: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load user")
		return
	}

	if user.StripeCustomerID == nil || *user.StripeCustomerID == "" {
		writeError(w, http.StatusBadRequest, "NO_CUSTOMER", "No Stripe customer on file")
		return
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  user.StripeCustomerID,
		ReturnURL: stripe.String(h.cfg.FrontendURL + "/account"),
	}

	s, err := portalsession.New(params)
	if err != nil {
		log.Printf("Portal: failed to create portal session: %v", err)
		writeError(w, http.StatusInternalServerError, "STRIPE_ERROR", "Failed to create portal session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": s.URL})
}

// HandleWebhook processes incoming Stripe webhook events.
func (h *StripeHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(io.LimitReader(r.Body, webhookMaxBodyBytes))
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sig, h.cfg.StripeWebhookSecret)
	if err != nil {
		log.Printf("Webhook signature verification failed: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		h.handleCheckoutCompleted(r, event)
	case "customer.subscription.updated":
		h.handleSubscriptionUpdated(r, event)
	case "customer.subscription.deleted":
		h.handleSubscriptionDeleted(r, event)
	default:
		log.Printf("Unhandled Stripe event type: %s", event.Type)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *StripeHandler) handleCheckoutCompleted(r *http.Request, event stripe.Event) {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		log.Printf("Error parsing checkout session: %v", err)
		return
	}

	userID := session.ClientReferenceID
	if userID == "" {
		log.Println("Checkout session missing client_reference_id")
		return
	}

	tier := domain.TierPremium
	if t, ok := session.Metadata["tier"]; ok && domain.IsValidTier(t) {
		tier = domain.SubscriptionTier(t)
	}

	customerID := ""
	if session.Customer != nil {
		customerID = session.Customer.ID
	}
	subscriptionID := ""
	if session.Subscription != nil {
		subscriptionID = session.Subscription.ID
	}

	if customerID != "" {
		if err := h.users.UpdateStripeCustomer(r.Context(), userID, customerID); err != nil {
			log.Printf("Failed to save Stripe customer ID: %v", err)
		}
	}

	if subscriptionID != "" && customerID != "" {
		if err := h.users.ActivateSubscription(r.Context(), customerID, subscriptionID, "active", tier); err != nil {
			log.Printf("Failed to activate subscription: %v", err)
		}
	}

	log.Printf("Checkout completed for user %s, customer %s, subscription %s, tier %s", userID, customerID, subscriptionID, tier)
}

func (h *StripeHandler) handleSubscriptionUpdated(r *http.Request, event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		log.Printf("Error parsing subscription update: %v", err)
		return
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}
	if customerID == "" {
		return
	}

	status := string(sub.Status)
	if err := h.users.UpdateSubscriptionStatus(r.Context(), customerID, status); err != nil {
		log.Printf("Failed to update subscription status: %v", err)
	}

	log.Printf("Subscription %s updated to %s for customer %s", sub.ID, status, customerID)
}

func (h *StripeHandler) handleSubscriptionDeleted(r *http.Request, event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		log.Printf("Error parsing subscription deletion: %v", err)
		return
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}
	if customerID == "" {
		return
	}

	if err := h.users.UpdateSubscriptionStatus(r.Context(), customerID, "canceled"); err != nil {
		log.Printf("Failed to mark subscription canceled: %v", err)
	}

	log.Printf("Subscription canceled for customer %s", customerID)
}
