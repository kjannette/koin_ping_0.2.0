package notifications

import "context"

// AlertMetadata holds context about the alert being sent.
type AlertMetadata struct {
	TxHash       string
	AddressLabel string
	AlertType    string
	Address      string
}

// Notifier is the interface implemented by all notification channels.
type Notifier interface {
	Send(ctx context.Context, message string, meta AlertMetadata) error
}
