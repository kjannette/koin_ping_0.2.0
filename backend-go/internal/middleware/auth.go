// Package middleware provides HTTP middleware for authentication and context injection.
package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	fbauth "github.com/kjannette/koin-ping/backend-go/internal/firebase"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	UserEmailKey contextKey = "user_email"
)

type errorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

// Authenticate verifies the Firebase ID token and auto-provisions a local user
// record. The local user UUID (not the Firebase UID) is placed into context so
// all downstream handlers use it as the canonical user identifier.
func Authenticate(userModel *models.UserModel) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				log.Println("No Authorization header or invalid format")
				writeJSON(w, http.StatusUnauthorized, errorResponse{
					Error:   "UNAUTHORIZED",
					Message: "No authentication token provided",
				})
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == "" {
				log.Println("Empty token")
				writeJSON(w, http.StatusUnauthorized, errorResponse{
					Error:   "UNAUTHORIZED",
					Message: "Invalid token format",
				})
				return
			}

			log.Println("Verifying Firebase token...")
			decoded, err := fbauth.Auth().VerifyIDToken(r.Context(), token)
			if err != nil {
				log.Printf("Token verification failed: %v", err)

				errMsg := err.Error()
				if strings.Contains(errMsg, "expired") {
					writeJSON(w, http.StatusUnauthorized, errorResponse{
						Error:   "TOKEN_EXPIRED",
						Message: "Authentication token has expired",
					})
					return
				}

				writeJSON(w, http.StatusUnauthorized, errorResponse{
					Error:   "UNAUTHORIZED",
					Message: "Failed to verify authentication token",
				})
				return
			}

			firebaseUID := decoded.UID
			email, _ := decoded.Claims["email"].(string)

			user, err := userModel.FindOrCreateByFirebaseUID(r.Context(), firebaseUID, email)
			if err != nil {
				log.Printf("Failed to provision local user for Firebase UID %s: %v", firebaseUID, err)
				writeJSON(w, http.StatusInternalServerError, errorResponse{
					Error:   "INTERNAL_ERROR",
					Message: "Failed to initialize user account",
				})
				return
			}

			log.Printf("Token verified! User UUID: %s, Email: %s", user.ID, email)

			ctx := context.WithValue(r.Context(), UserIDKey, user.ID)
			ctx = context.WithValue(ctx, UserEmailKey, email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireSubscription blocks requests from users without an active subscription.
// Must be applied after Authenticate.
func RequireSubscription(userModel *models.UserModel) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == "" {
				writeJSON(w, http.StatusUnauthorized, errorResponse{
					Error:   "UNAUTHORIZED",
					Message: "Authentication required",
				})
				return
			}

			user, err := userModel.GetByID(r.Context(), userID)
			if err != nil || user == nil {
				log.Printf("RequireSubscription: failed to load user %s: %v", userID, err)
				writeJSON(w, http.StatusInternalServerError, errorResponse{
					Error:   "INTERNAL_ERROR",
					Message: "Failed to verify subscription",
				})
				return
			}

			if user.SubscriptionStatus != "active" && user.SubscriptionStatus != "trialing" {
				writeJSON(w, http.StatusForbidden, errorResponse{
					Error:   "SUBSCRIPTION_REQUIRED",
					Message: "An active subscription is required to use this feature",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}

func GetUserEmail(ctx context.Context) string {
	if v, ok := ctx.Value(UserEmailKey).(string); ok {
		return v
	}
	return ""
}
