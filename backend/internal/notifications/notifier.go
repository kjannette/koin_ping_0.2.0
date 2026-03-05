package notifications

import "context"

// AlertMetadata holds context about the alert being sent.
type AlertMetadata struct {
	TxHash       string
	AddressLabel string
	AlertType    string
	Address      string
}

type Notifier interface {
	Send(ctx context.Context, message string, meta AlertMetadata) error
}
