package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/kjannette/koin-ping/backend/internal/models"
)

const (
	resendAPIURL          = "https://api.resend.com/emails"
	emailHTTPTimeout      = 10 * time.Second
	defaultDigestMaxItems = 50
)

var digestHTTPClient = &http.Client{Timeout: emailHTTPTimeout} //nolint:gochecknoglobals

// handles email setup and digest sending via Resend.
type EmailDigestService struct {
	apiKey      string
	fromAddress string
	alertEvents *models.AlertEventModel
	notifCfgs   *models.NotificationConfigModel
}

func NewEmailDigestService(
	apiKey, fromAddress string,
	alertEvents *models.AlertEventModel,
	notifCfgs *models.NotificationConfigModel,
) *EmailDigestService {
	return &EmailDigestService{
		apiKey:      apiKey,
		fromAddress: fromAddress,
		alertEvents: alertEvents,
		notifCfgs:   notifCfgs,
	}
}

// Configured returns true when the Resend API key is present.
func (s *EmailDigestService) Configured() bool {
	return s.apiKey != ""
}

// SetupEmail validates the email works by sending a welcome/confirmation
// message via Resend. Called when a user saves their email in notification settings.
func (s *EmailDigestService) SetupEmail(toAddress string) error {
	if !s.Configured() {
		return fmt.Errorf("email service not configured: RESEND_API_KEY not set") //nolint:err113
	}

	html := `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome to Koin Ping Email Alerts</h2>
  <p>Your email has been successfully configured for alert notifications.</p>
  <p>You will receive alert digests at this address when events are triggered
     on your watched addresses.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #999;">Sent by Koin Ping</p>
</div>`

	return s.send(toAddress, "Koin Ping — Email Alerts Configured", html)
}

func (s *EmailDigestService) SendDigest(ctx context.Context, userID, toAddress string) error {
	if !s.Configured() {
		return fmt.Errorf("email service not configured: RESEND_API_KEY not set") //nolint:err113
	}

	events, err := s.alertEvents.ListRecentByUser(ctx, userID, defaultDigestMaxItems)
	if err != nil {
		return fmt.Errorf("fetch alert events: %w", err)
	}

	if len(events) == 0 {
		log.Printf("No recent alerts for user %s — skipping digest", userID)
		return nil
	}

	var rows string
	for _, e := range events {
		label := "—"
		if e.AddressLabel != nil {
			label = *e.AddressLabel
		}
		txLink := "—"
		if e.TxHash != nil {
			txLink = fmt.Sprintf(
				`<a href="https://etherscan.io/tx/%s" style="color:#0066cc;">%s…</a>`,
				*e.TxHash, (*e.TxHash)[:10],
			)
		}
		rows += fmt.Sprintf(`
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #eee;">%s</td>
        <td style="padding:6px 8px; border-bottom:1px solid #eee;">%s</td>
        <td style="padding:6px 8px; border-bottom:1px solid #eee;">%s</td>
        <td style="padding:6px 8px; border-bottom:1px solid #eee; font-size:12px; color:#666;">%s</td>
      </tr>`,
			label, e.Message, txLink,
			e.Timestamp.Format("Jan 2 15:04 UTC"),
		)
	}

	html := fmt.Sprintf(`
<div style="font-family: sans-serif; max-width: 700px; margin: 0 auto;">
  <h2 style="color: #333;">Koin Ping — Alert Digest</h2>
  <p>Here are your recent alerts (%d total):</p>
  <table style="width:100%%; border-collapse:collapse; font-size:14px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px; text-align:left;">Address</th>
        <th style="padding:8px; text-align:left;">Alert</th>
        <th style="padding:8px; text-align:left;">Tx</th>
        <th style="padding:8px; text-align:left;">Time</th>
      </tr>
    </thead>
    <tbody>%s</tbody>
  </table>
  <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
  <p style="font-size:12px; color:#999;">Sent by Koin Ping</p>
</div>`, len(events), rows)

	subject := fmt.Sprintf("Koin Ping Digest — %d alerts", len(events))

	return s.send(toAddress, subject, html)
}

func (s *EmailDigestService) SendDigestsForAllUsers(ctx context.Context) (int, error) {
	if !s.Configured() {
		return 0, nil
	}

	configs, err := s.notifCfgs.ListEnabled(ctx)
	if err != nil {
		return 0, fmt.Errorf("list enabled configs: %w", err)
	}

	sent := 0
	for _, cfg := range configs {
		if cfg.Email == nil || *cfg.Email == "" {
			continue
		}
		if err := s.SendDigest(ctx, cfg.UserID, *cfg.Email); err != nil {
			log.Printf("Failed to send digest to user %s: %v", cfg.UserID, err)
			continue
		}
		sent++
	}

	return sent, nil
}

type resendEmailPayload struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

func (s *EmailDigestService) send(to, subject, html string) error {
	payload := resendEmailPayload{
		From:    s.fromAddress,
		To:      to,
		Subject: subject,
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := digestHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("send email via Resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Resend API returned HTTP %d", resp.StatusCode) //nolint:err113
	}

	return nil
}
