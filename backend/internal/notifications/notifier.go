package notifications

import (
	"context"
	"errors"
	"net/http"
)

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

// PermanentError wraps errors that should not be retried (e.g. 401, 403, 404).
type PermanentError struct{ Err error }

func (e *PermanentError) Error() string { return e.Err.Error() }
func (e *PermanentError) Unwrap() error { return e.Err }

func IsPermanent(err error) bool {
	var p *PermanentError
	return errors.As(err, &p)
}

func isPermanentStatusCode(code int) bool {
	return code == http.StatusUnauthorized ||
		code == http.StatusForbidden ||
		code == http.StatusNotFound ||
		code == http.StatusMethodNotAllowed ||
		code == http.StatusGone
}
