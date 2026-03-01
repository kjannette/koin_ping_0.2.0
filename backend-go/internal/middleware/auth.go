// Package middleware provides HTTP middleware for authentication and context injection.
package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	fbauth "github.com/kjannette/koin-ping/backend-go/internal/firebase"
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
	json.NewEncoder(w).Encode(v)
}

func Authenticate(next http.Handler) http.Handler {
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

		userID := decoded.UID
		email, _ := decoded.Claims["email"].(string)

		log.Printf("Token verified! User ID: %s, Email: %s", userID, email)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserEmailKey, email)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
