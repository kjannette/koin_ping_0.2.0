package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/kjannette/koin-ping/backend/internal/config"
	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/middleware"
	"github.com/kjannette/koin-ping/backend/internal/models"
	"github.com/kjannette/koin-ping/backend/internal/notifications"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type NotificationConfigHandler struct {
	configs *models.NotificationConfigModel
	cfg     *config.Config
}

func NewNotificationConfigHandler(configs *models.NotificationConfigModel, cfg *config.Config) *NotificationConfigHandler {
	return &NotificationConfigHandler{configs: configs, cfg: cfg}
}

func (h *NotificationConfigHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	log.Printf("User %s getting notification config", userID)

	cfg, err := h.configs.GetConfig(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting notification config: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get notification config")
		return
	}

	if cfg == nil {
		writeJSON(w, http.StatusOK, domain.NotificationConfig{
			UserID:              userID,
			NotificationEnabled: true,
		})
		return
	}

	log.Println("Config found")
	writeJSON(w, http.StatusOK, cfg)
}

func (h *NotificationConfigHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		DiscordWebhookURL   *string `json:"discord_webhook_url"`
		TelegramChatID      *string `json:"telegram_chat_id"`
		TelegramBotToken    *string `json:"telegram_bot_token"`
		Email               *string `json:"email"`
		SlackWebhookURL     *string `json:"slack_webhook_url"`
		NotificationEnabled *bool   `json:"notification_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("Failed to decode notification config request body: %v", err)
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	log.Printf("User %s updating notification config", userID)

	if body.DiscordWebhookURL == nil && body.TelegramChatID == nil &&
		body.TelegramBotToken == nil && body.Email == nil &&
		body.SlackWebhookURL == nil && body.NotificationEnabled == nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"At least one configuration field must be provided")
		return
	}

	if body.DiscordWebhookURL != nil && *body.DiscordWebhookURL != "" &&
		!strings.HasPrefix(*body.DiscordWebhookURL, "https://discord.com/api/webhooks/") {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"Invalid Discord webhook URL format")
		return
	}

	if body.SlackWebhookURL != nil && *body.SlackWebhookURL != "" &&
		!strings.HasPrefix(*body.SlackWebhookURL, "https://hooks.slack.com/") {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"Invalid Slack webhook URL format")
		return
	}

	if body.Email != nil && *body.Email != "" && !emailRe.MatchString(*body.Email) {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR",
			"Invalid email address format")
		return
	}

	enabled := true
	if body.NotificationEnabled != nil {
		enabled = *body.NotificationEnabled
	}

	cfg := domain.NotificationConfig{
		DiscordWebhookURL:   body.DiscordWebhookURL,
		TelegramChatID:      body.TelegramChatID,
		TelegramBotToken:    body.TelegramBotToken,
		Email:               body.Email,
		SlackWebhookURL:     body.SlackWebhookURL,
		NotificationEnabled: enabled,
	}

	updated, err := h.configs.UpsertConfig(r.Context(), userID, cfg)
	if err != nil {
		log.Printf("Error updating notification config: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR",
			"Failed to update notification configuration")
		return
	}

	log.Println("Notification config updated")
	writeJSON(w, http.StatusOK, updated)
}

func (h *NotificationConfigHandler) DeleteConfig(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	log.Printf("User %s deleting notification config", userID)

	deleted, err := h.configs.Remove(r.Context(), userID)
	if err != nil {
		log.Printf("Error deleting notification config: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR",
			"Failed to delete notification configuration")
		return
	}

	if !deleted {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "No notification configuration found")
		return
	}

	log.Println("Notification config deleted")
	w.WriteHeader(http.StatusNoContent)
}

// TestChannels sends a test message to all configured notification channels.
func (h *NotificationConfigHandler) TestChannels(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	log.Printf("User %s testing notification channels", userID)

	cfg, err := h.configs.GetConfig(r.Context(), userID)
	if err != nil {
		log.Printf("Error getting notification config for test: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get notification config")
		return
	}

	if cfg == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "No notification configuration found")
		return
	}

	type channelResult struct {
		Channel string `json:"channel"`
		Success bool   `json:"success"`
		Error   string `json:"error,omitempty"`
	}

	var results []channelResult

	if cfg.DiscordWebhookURL != nil && *cfg.DiscordWebhookURL != "" {
		ok, testErr := notifications.TestDiscordWebhook(*cfg.DiscordWebhookURL)
		res := channelResult{Channel: "discord", Success: ok}
		if testErr != nil {
			res.Error = testErr.Error()
		}
		results = append(results, res)
	}

	if cfg.TelegramBotToken != nil && *cfg.TelegramBotToken != "" &&
		cfg.TelegramChatID != nil && *cfg.TelegramChatID != "" {
		ok, testErr := notifications.TestTelegramWebhook(*cfg.TelegramBotToken, *cfg.TelegramChatID)
		res := channelResult{Channel: "telegram", Success: ok}
		if testErr != nil {
			res.Error = testErr.Error()
		}
		results = append(results, res)
	}

	if cfg.SlackWebhookURL != nil && *cfg.SlackWebhookURL != "" {
		ok, testErr := notifications.TestSlackWebhook(*cfg.SlackWebhookURL)
		res := channelResult{Channel: "slack", Success: ok}
		if testErr != nil {
			res.Error = testErr.Error()
		}
		results = append(results, res)
	}

	if cfg.Email != nil && *cfg.Email != "" {
		ok, testErr := notifications.TestEmailNotification(
			h.cfg.ResendAPIKey, h.cfg.EmailFrom, *cfg.Email,
		)
		res := channelResult{Channel: "email", Success: ok}
		if testErr != nil {
			res.Error = testErr.Error()
		}
		results = append(results, res)
	}

	if len(results) == 0 {
		writeError(w, http.StatusBadRequest, "NO_CHANNELS",
			"No notification channels are configured")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"results": results})
}
