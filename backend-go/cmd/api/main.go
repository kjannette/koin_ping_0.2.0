// Package main is the entry point for the API server.
package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/joho/godotenv"
	"github.com/kjannette/koin-ping/backend-go/internal/config"
	"github.com/kjannette/koin-ping/backend-go/internal/database"
	"github.com/kjannette/koin-ping/backend-go/internal/firebase"
	"github.com/kjannette/koin-ping/backend-go/internal/handlers"
	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
	"github.com/kjannette/koin-ping/backend-go/internal/services"
)

const (
	// max duration to read a request.
	serverReadTimeoutSeconds = 5
	// maxiduration to write a response.
	serverWriteTimeoutSeconds = 10
)

//nolint:funlen
func main() {
	_ = godotenv.Load() // .env is optional; env vars can also be set externally

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	pool, err := database.Connect(cfg.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := firebase.Init(cfg.FirebaseProjectID); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	defer database.Close()

	addressModel := models.NewAddressModel(pool)
	alertRuleModel := models.NewAlertRuleModel(pool)
	alertEventModel := models.NewAlertEventModel(pool)
	checkpointModel := models.NewCheckpointModel(pool)
	notifConfigModel := models.NewNotificationConfigModel(pool)

	emailDigestSvc := services.NewEmailDigestService(
		cfg.ResendAPIKey, cfg.EmailFrom, alertEventModel, notifConfigModel,
	)

	addressHandler := handlers.NewAddressHandler(addressModel)
	alertRuleHandler := handlers.NewAlertRuleHandler(alertRuleModel, addressModel)
	alertEventHandler := handlers.NewAlertEventHandler(alertEventModel)
	notifConfigHandler := handlers.NewNotificationConfigHandler(notifConfigModel, cfg)
	emailDigestHandler := handlers.NewEmailDigestHandler(emailDigestSvc, notifConfigModel)
	statusHandler := handlers.NewStatusHandler(checkpointModel)

	mux := http.NewServeMux()
	b := cfg.APIBasePath // e.g. "/v1"

	// Public routes
	mux.HandleFunc("GET "+b+"/health", handlers.HealthCheck)
	mux.HandleFunc("GET "+b+"/status", statusHandler.GetStatus)

	// Authenticated routes — addresses
	mux.Handle("POST "+b+"/addresses",
		middleware.Authenticate(http.HandlerFunc(addressHandler.Create)))
	mux.Handle("GET "+b+"/addresses",
		middleware.Authenticate(http.HandlerFunc(addressHandler.List)))
	mux.Handle("DELETE "+b+"/addresses/{addressId}",
		middleware.Authenticate(http.HandlerFunc(addressHandler.Remove)))
	mux.Handle("PATCH "+b+"/addresses/{addressId}",
		middleware.Authenticate(http.HandlerFunc(addressHandler.UpdateLabel)))

	// Authenticated routes for alert rules
	mux.Handle("POST "+b+"/addresses/{addressId}/alerts",
		middleware.Authenticate(http.HandlerFunc(alertRuleHandler.Create)))
	mux.Handle("GET "+b+"/addresses/{addressId}/alerts",
		middleware.Authenticate(http.HandlerFunc(alertRuleHandler.ListByAddress)))
	mux.Handle("PATCH "+b+"/alerts/{alertId}",
		middleware.Authenticate(http.HandlerFunc(alertRuleHandler.UpdateStatus)))
	mux.Handle("DELETE "+b+"/alerts/{alertId}",
		middleware.Authenticate(http.HandlerFunc(alertRuleHandler.Remove)))

	// Authenticated routes — alert events
	mux.Handle("GET "+b+"/alert-events",
		middleware.Authenticate(http.HandlerFunc(alertEventHandler.List)))

	// Authenticated routes — notification config
	mux.Handle("GET "+b+"/notification-config",
		middleware.Authenticate(http.HandlerFunc(notifConfigHandler.GetConfig)))
	mux.Handle("PUT "+b+"/notification-config",
		middleware.Authenticate(http.HandlerFunc(notifConfigHandler.UpdateConfig)))
	mux.Handle("DELETE "+b+"/notification-config",
		middleware.Authenticate(http.HandlerFunc(notifConfigHandler.DeleteConfig)))
	mux.Handle("POST "+b+"/notification-config/test",
		middleware.Authenticate(http.HandlerFunc(notifConfigHandler.TestChannels)))

	// Authenticated routes — email digest
	mux.Handle("POST "+b+"/email/setup",
		middleware.Authenticate(http.HandlerFunc(emailDigestHandler.SetupEmail)))
	mux.Handle("POST "+b+"/email/digest",
		middleware.Authenticate(http.HandlerFunc(emailDigestHandler.SendDigest)))

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Server running on port %d", cfg.Port)
	log.Printf("API base path: %s", cfg.APIBasePath)
	log.Printf("Environment: %s", cfg.NodeEnv)

	server := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  serverReadTimeoutSeconds * time.Second,
		WriteTimeout: serverWriteTimeoutSeconds * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)

			return
		}

		next.ServeHTTP(w, r)
	})
}
