package domain

import "time"

type Address struct {
	ID        int       `json:"id"`
	UserID    string    `json:"user_id"`    //nolint:tagliatelle
	Address   string    `json:"address"`
	Label     *string   `json:"label"`
	CreatedAt time.Time `json:"created_at"` //nolint:tagliatelle
}

type AlertType string

func (a AlertType) String() string { return string(a) }

const (
	AlertIncomingTx    AlertType = "incoming_tx"
	AlertOutgoingTx    AlertType = "outgoing_tx"
	AlertLargeTransfer AlertType = "large_transfer"
	AlertBalanceBelow  AlertType = "balance_below"
)

var ValidAlertTypes = []AlertType{ //nolint:gochecknoglobals
	AlertIncomingTx,
	AlertOutgoingTx,
	AlertLargeTransfer,
	AlertBalanceBelow,
}

// ThresholdRequiredTypes lists alert types that require a threshold value.
var ThresholdRequiredTypes = []AlertType{ //nolint:gochecknoglobals
	AlertLargeTransfer,
	AlertBalanceBelow,
}

// IsValidAlertType returns true if the given string matches a known AlertType.
func IsValidAlertType(t string) bool {
	for _, v := range ValidAlertTypes {
		if string(v) == t {
			return true
		}
	}

	return false
}

// IsThresholdRequired returns true if the given AlertType requires a threshold.
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
	AddressID int       `json:"address_id"` //nolint:tagliatelle
	Type      AlertType `json:"type"`
	Threshold *float64  `json:"threshold"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"` //nolint:tagliatelle
}

type AlertEvent struct {
	ID           int       `json:"id"`
	AlertRuleID  int       `json:"alert_rule_id"`   //nolint:tagliatelle
	Message      string    `json:"message"`
	AddressLabel *string   `json:"address_label"`   //nolint:tagliatelle
	TxHash       *string   `json:"tx_hash"`         //nolint:tagliatelle
	Timestamp    time.Time `json:"timestamp"`
}

type AddressCheckpoint struct {
	AddressID        int       `json:"address_id"`         //nolint:tagliatelle
	LastCheckedBlock int       `json:"last_checked_block"` //nolint:tagliatelle
	LastCheckedAt    time.Time `json:"last_checked_at"`    //nolint:tagliatelle
}

// CheckpointDetail combines checkpoint and address info for reporting.
type CheckpointDetail struct {
	AddressID        int       `json:"address_id"`         //nolint:tagliatelle
	Address          string    `json:"address"`
	Label            *string   `json:"label"`
	LastCheckedBlock int       `json:"last_checked_block"` //nolint:tagliatelle
	LastCheckedAt    time.Time `json:"last_checked_at"`    //nolint:tagliatelle
}

// NotificationConfig holds a user's notification preferences.
type NotificationConfig struct {
	UserID              string     `json:"user_id"`              //nolint:tagliatelle
	DiscordWebhookURL   *string    `json:"discord_webhook_url"`  //nolint:tagliatelle
	TelegramChatID      *string    `json:"telegram_chat_id"`     //nolint:tagliatelle
	TelegramBotToken    *string    `json:"telegram_bot_token"`   //nolint:tagliatelle
	Email               *string    `json:"email"`
	SlackWebhookURL     *string    `json:"slack_webhook_url"`    //nolint:tagliatelle
	NotificationEnabled bool       `json:"notification_enabled"` //nolint:tagliatelle
	CreatedAt           *time.Time `json:"created_at,omitempty"` //nolint:tagliatelle
	UpdatedAt           *time.Time `json:"updated_at,omitempty"` //nolint:tagliatelle
}

// NormalizedTx is a blockchain transaction normalized for internal use.
type NormalizedTx struct {
	Hash           string  `json:"hash"`
	From           string  `json:"from"`
	To             *string `json:"to"`
	Value          string  `json:"value"` // Wei as string for precision
	BlockNumber    int     `json:"block_number"`    //nolint:tagliatelle
	BlockTimestamp int64   `json:"block_timestamp"` //nolint:tagliatelle
}

type Direction string

// String implements fmt.Stringer.
func (d Direction) String() string { return string(d) }

const (
	DirectionIncoming Direction = "incoming"
	DirectionOutgoing Direction = "outgoing"
)

type ObservedTx struct {
	NormalizedTx
	AddressID int       `json:"address_id"` //nolint:tagliatelle
	Direction Direction `json:"direction"`
}
