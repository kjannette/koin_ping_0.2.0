package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

type NotificationConfigModel struct {
	pool *pgxpool.Pool
}

func NewNotificationConfigModel(pool *pgxpool.Pool) *NotificationConfigModel {
	return &NotificationConfigModel{pool: pool}
}

func (m *NotificationConfigModel) GetConfig(ctx context.Context, userID string) (*domain.NotificationConfig, error) {
	var c domain.NotificationConfig
	err := m.pool.QueryRow(ctx,
		`SELECT user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token,
		        email, slack_webhook_url, notification_enabled, created_at, updated_at
		 FROM user_notification_configs
		 WHERE user_id = $1`,
		userID,
	).Scan(&c.UserID, &c.DiscordWebhookURL, &c.TelegramChatID, &c.TelegramBotToken,
		&c.Email, &c.SlackWebhookURL, &c.NotificationEnabled, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (m *NotificationConfigModel) UpsertConfig(ctx context.Context, userID string, cfg domain.NotificationConfig) (*domain.NotificationConfig, error) {
	var c domain.NotificationConfig
	err := m.pool.QueryRow(ctx,
		`INSERT INTO user_notification_configs
		   (user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token,
		    email, slack_webhook_url, notification_enabled, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		 ON CONFLICT (user_id)
		 DO UPDATE SET
		   discord_webhook_url = COALESCE($2, user_notification_configs.discord_webhook_url),
		   telegram_chat_id = COALESCE($3, user_notification_configs.telegram_chat_id),
		   telegram_bot_token = COALESCE($4, user_notification_configs.telegram_bot_token),
		   email = COALESCE($5, user_notification_configs.email),
		   slack_webhook_url = COALESCE($6, user_notification_configs.slack_webhook_url),
		   notification_enabled = $7,
		   updated_at = NOW()
		 RETURNING user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token,
		           email, slack_webhook_url, notification_enabled, created_at, updated_at`,
		userID, cfg.DiscordWebhookURL, cfg.TelegramChatID, cfg.TelegramBotToken,
		cfg.Email, cfg.SlackWebhookURL, cfg.NotificationEnabled,
	).Scan(&c.UserID, &c.DiscordWebhookURL, &c.TelegramChatID, &c.TelegramBotToken,
		&c.Email, &c.SlackWebhookURL, &c.NotificationEnabled, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (m *NotificationConfigModel) Remove(ctx context.Context, userID string) (bool, error) {
	tag, err := m.pool.Exec(ctx,
		`DELETE FROM user_notification_configs WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (m *NotificationConfigModel) ListEnabled(ctx context.Context) ([]domain.NotificationConfig, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT user_id, discord_webhook_url, telegram_chat_id, telegram_bot_token,
		        email, slack_webhook_url
		 FROM user_notification_configs
		 WHERE notification_enabled = TRUE`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []domain.NotificationConfig
	for rows.Next() {
		var c domain.NotificationConfig
		if err := rows.Scan(&c.UserID, &c.DiscordWebhookURL, &c.TelegramChatID,
			&c.TelegramBotToken, &c.Email, &c.SlackWebhookURL); err != nil {
			return nil, err
		}
		c.NotificationEnabled = true
		configs = append(configs, c)
	}
	return configs, rows.Err()
}
