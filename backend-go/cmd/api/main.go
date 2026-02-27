package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/kjannette/koin-ping/backend-go/internal/config"
	"github.com/kjannette/koin-ping/backend-go/internal/database"
	"github.com/kjannette/koin-ping/backend-go/internal/firebase"
	"github.com/kjannette/koin-ping/backend-go/internal/handlers"
	"github.com/kjannette/koin-ping/backend-go/internal/middleware"
	"github.com/kjannette/koin-ping/backend-go/internal/models"
)

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
	defer database.Close()

	if err := firebase.Init(cfg.FirebaseProjectID); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	addressModel := models.NewAddressModel(pool)
	alertRuleModel := models.NewAlertRuleModel(pool)
	alertEventModel := models.NewAlertEventModel(pool)
	notifConfigModel := models.NewNotificationConfigModel(pool)

	addressHandler := handlers.NewAddressHandler(addressModel)
	alertRuleHandler := handlers.NewAlertRuleHandler(alertRuleModel, addressModel)
	alertEventHandler := handlers.NewAlertEventHandler(alertEventModel)
	notifConfigHandler := handlers.NewNotificationConfigHandler(notifConfigModel)

	mux := http.NewServeMux()
	b := cfg.APIBasePath // e.g. "/v1"

	// Public routes
	mux.HandleFunc("GET "+b+"/health", handlers.HealthCheck)
	mux.HandleFunc("GET "+b+"/status", handlers.SystemStatus)

	// Authenticated routes — addresses
	mux.Handle("POST "+b+"/addresses", middleware.Authenticate(http.HandlerFunc(addressHandler.Create)))
	mux.Handle("GET "+b+"/addresses", middleware.Authenticate(http.HandlerFunc(addressHandler.List)))
	mux.Handle("DELETE "+b+"/addresses/{addressId}", middleware.Authenticate(http.HandlerFunc(addressHandler.Remove)))

	// Authenticated routes — alert rules
	mux.Handle("POST "+b+"/addresses/{addressId}/alerts", middleware.Authenticate(http.HandlerFunc(alertRuleHandler.Create)))
	mux.Handle("GET "+b+"/addresses/{addressId}/alerts", middleware.Authenticate(http.HandlerFunc(alertRuleHandler.ListByAddress)))
	mux.Handle("PATCH "+b+"/alerts/{alertId}", middleware.Authenticate(http.HandlerFunc(alertRuleHandler.UpdateStatus)))
	mux.Handle("DELETE "+b+"/alerts/{alertId}", middleware.Authenticate(http.HandlerFunc(alertRuleHandler.Remove)))

	// Authenticated routes — alert events
	mux.Handle("GET "+b+"/alert-events", middleware.Authenticate(http.HandlerFunc(alertEventHandler.List)))

	// Authenticated routes — notification config
	mux.Handle("GET "+b+"/notification-config", middleware.Authenticate(http.HandlerFunc(notifConfigHandler.GetConfig)))
	mux.Handle("PUT "+b+"/notification-config", middleware.Authenticate(http.HandlerFunc(notifConfigHandler.UpdateConfig)))
	mux.Handle("DELETE "+b+"/notification-config", middleware.Authenticate(http.HandlerFunc(notifConfigHandler.DeleteConfig)))

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Server running on port %d", cfg.Port)
	log.Printf("API base path: %s", cfg.APIBasePath)
	log.Printf("Environment: %s", cfg.NodeEnv)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
		os.Exit(1)
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
