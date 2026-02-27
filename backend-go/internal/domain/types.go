package domain

import "time"

type Address struct {
	ID        int       `json:"id"`
	UserID    string    `json:"user_id"`
	Address   string    `json:"address"`
	Label     *string   `json:"label"`
	CreatedAt time.Time `json:"created_at"`
}

type AlertType string

const (
	AlertIncomingTx    AlertType = "incoming_tx"
	AlertOutgoingTx    AlertType = "outgoing_tx"
	AlertLargeTransfer AlertType = "large_transfer"
	AlertBalanceBelow  AlertType = "balance_below"
)

var ValidAlertTypes = []AlertType{
	AlertIncomingTx,
	AlertOutgoingTx,
	AlertLargeTransfer,
	AlertBalanceBelow,
}

var ThresholdRequiredTypes = []AlertType{
	AlertLargeTransfer,
	AlertBalanceBelow,
}

func IsValidAlertType(t string) bool {
	for _, v := range ValidAlertTypes {
		if string(v) == t {
			return true
		}
	}
	return false
}

func IsThresholdRequired(t AlertType) bool {
	for _, v := range ThresholdRequiredTypes {
		if v == t {
			return true
		}
	}
	return false
}

type AlertRule struct {
	ID        int       `json:"id"`
	AddressID int       `json:"address_id"`
	Type      AlertType `json:"type"`
	Threshold *float64  `json:"threshold"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

type AlertEvent struct {
	ID          int       `json:"id"`
	AlertRuleID int       `json:"alert_rule_id"`
	Message     string    `json:"message"`
	AddressLabel *string  `json:"address_label"`
	TxHash      *string   `json:"tx_hash"`
	Timestamp   time.Time `json:"timestamp"`
}

type AddressCheckpoint struct {
	AddressID        int       `json:"address_id"`
	LastCheckedBlock int       `json:"last_checked_block"`
	LastCheckedAt    time.Time `json:"last_checked_at"`
}

type CheckpointDetail struct {
	AddressID        int       `json:"address_id"`
	Address          string    `json:"address"`
	Label            *string   `json:"label"`
	LastCheckedBlock int       `json:"last_checked_block"`
	LastCheckedAt    time.Time `json:"last_checked_at"`
}

type NotificationConfig struct {
	UserID              string     `json:"user_id"`
	DiscordWebhookURL   *string    `json:"discord_webhook_url"`
	SlackWebhookURL     *string    `json:"slack_webhook_url"`
	Email               *string    `json:"email"`
	NotificationEnabled bool       `json:"notification_enabled"`
	CreatedAt           *time.Time `json:"created_at,omitempty"`
	UpdatedAt           *time.Time `json:"updated_at,omitempty"`
}

type NormalizedTx struct {
	Hash           string `json:"hash"`
	From           string `json:"from"`
	To             *string `json:"to"`
	Value          string `json:"value"` // Wei as string for precision
	BlockNumber    int    `json:"block_number"`
	BlockTimestamp int64  `json:"block_timestamp"`
}

type Direction string

const (
	DirectionIncoming Direction = "incoming"
	DirectionOutgoing Direction = "outgoing"
)

type ObservedTx struct {
	NormalizedTx
	AddressID int       `json:"address_id"`
	Direction Direction `json:"direction"`
}
