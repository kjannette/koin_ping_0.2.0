package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type EmailNotifier struct {
	APIKey string
	From   string
	To     string
}

func (e *EmailNotifier) Send(_ context.Context, message string, meta AlertMetadata) error {
	_, err := SendEmailNotification(e.APIKey, e.From, e.To, message, meta)
	return err
}

const emailHTTPTimeoutSeconds = 10

var emailHTTPClient = &http.Client{ //nolint:gochecknoglobals
	Timeout: emailHTTPTimeoutSeconds * time.Second,
}

type resendPayload struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

func SendEmailNotification(apiKey, fromAddress, toAddress, message string, meta AlertMetadata) (bool, error) {
	if apiKey == "" {
		log.Printf("Skipping email notification: RESEND_API_KEY not configured")
		return false, nil
	}

	subject := fmt.Sprintf("Koin Ping Alert: %s", alertTypeLabel(meta.AlertType))

	txLink := ""
	if meta.TxHash != "" {
		txLink = fmt.Sprintf(
			`<p><a href="https://etherscan.io/tx/%s">View on Etherscan</a></p>`,
			meta.TxHash,
		)
	}

	html := fmt.Sprintf(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Koin Ping Alert</h2>
  <p style="font-size: 16px;">%s</p>
  <table style="margin: 16px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 4px 12px 4px 0; color: #666;">Address</td>
      <td style="padding: 4px 0;">%s</td>
    </tr>
    <tr>
      <td style="padding: 4px 12px 4px 0; color: #666;">Blockchain</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 13px;">%s</td>
    </tr>
  </table>
  %s
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #999;">Sent by Koin Ping</p>
</div>`,
		message, meta.AddressLabel, meta.Address, txLink)

	payload := resendPayload{
		From:    fromAddress,
		To:      toAddress,
		Subject: subject,
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, fmt.Errorf("marshal email payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return false, fmt.Errorf("create email request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := emailHTTPClient.Do(req)
	if err != nil {
		log.Printf("Failed to send email notification: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		err := fmt.Errorf("resend API failed: HTTP %d", resp.StatusCode)
		log.Printf("Resend API failed: HTTP %d", resp.StatusCode)
		if isPermanentStatusCode(resp.StatusCode) {
			return false, &PermanentError{Err: err}
		}
		return false, err
	}

	return true, nil
}

func TestEmailNotification(apiKey, fromAddress, toAddress string) (bool, error) {
	if apiKey == "" {
		return false, fmt.Errorf("email not configured: RESEND_API_KEY not set") //nolint:err113
	}

	payload := resendPayload{
		From:    fromAddress,
		To:      toAddress,
		Subject: "Koin Ping — Test Notification",
		HTML:    `<p>Your email alerts are configured correctly!</p><p style="font-size:12px;color:#999;">Sent by Koin Ping</p>`,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := emailHTTPClient.Do(req)
	if err != nil {
		log.Printf("Email test failed: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}

func alertTypeLabel(alertType string) string {
	switch alertType {
	case "incoming_tx":
		return "Incoming Transaction"
	case "outgoing_tx":
		return "Outgoing Transaction"
	case "large_transfer":
		return "Large Transfer"
	case "balance_below":
		return "Balance Below Threshold"
	default:
		return "Alert"
	}
}
