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

const (
	// discordHTTPTimeoutSeconds is the timeout for Discord webhook requests.
	discordHTTPTimeoutSeconds = 10

	// Alert color codes for Discord embeds.
	colorGreen  = 0x00ff00
	colorOrange = 0xff9900
	colorRed    = 0xff0000
	colorBlue   = 0x0099ff
)

// discordHTTPClient is a shared HTTP client with a timeout for Discord requests.
var discordHTTPClient = &http.Client{ //nolint:gochecknoglobals
	Timeout: discordHTTPTimeoutSeconds * time.Second,
}

// DiscordNotifier sends alert notifications via a Discord webhook.
type DiscordNotifier struct {
	WebhookURL string
}

// Send implements Notifier for Discord.
func (d *DiscordNotifier) Send(_ context.Context, message string, meta AlertMetadata) error {
	_, err := SendDiscordNotification(d.WebhookURL, message, meta)
	return err
}

type discordEmbed struct {
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Color       int            `json:"color"`
	Fields      []discordField `json:"fields"`
	Timestamp   string         `json:"timestamp"`
	Footer      discordFooter  `json:"footer"`
}

type discordField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

type discordFooter struct {
	Text string `json:"text"`
}

type discordPayload struct {
	Content *string        `json:"content"`
	Embeds  []discordEmbed `json:"embeds,omitempty"`
}

func SendDiscordNotification(webhookURL, message string, meta AlertMetadata) (bool, error) {
	fields := []discordField{
		{Name: "Address", Value: meta.AddressLabel, Inline: true},
		{Name: "Blockchain Address", Value: fmt.Sprintf("`%s`", meta.Address), Inline: false},
	}

	if meta.TxHash != "" {
		fields = append(fields, discordField{
			Name:   "Transaction",
			Value:  fmt.Sprintf("[View on Etherscan](https://etherscan.io/tx/%s)", meta.TxHash),
			Inline: false,
		})
	}

	payload := discordPayload{
		Content: nil,
		Embeds: []discordEmbed{
			{
				Title:       "Koin Ping Alert",
				Description: message,
				Color:       colorForAlertType(meta.AlertType),
				Fields:      fields,
				Timestamp:   time.Now().UTC().Format(time.RFC3339),
				Footer:      discordFooter{Text: "Koin Ping"},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, fmt.Errorf("marshal discord payload: %w", err)
	}

	resp, err := discordHTTPClient.Post(
		webhookURL, "application/json", bytes.NewReader(body),
	)
	if err != nil {
		log.Printf("Failed to send Discord notification: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Discord webhook failed: HTTP %d", resp.StatusCode)
		return false, fmt.Errorf("discord webhook failed: HTTP %d", resp.StatusCode)
	}

	return true, nil
}

func TestDiscordWebhook(webhookURL string) (bool, error) {
	payload := map[string]string{
		"content": "Koin Ping test notification - Your Discord webhook is configured correctly!",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	resp, err := discordHTTPClient.Post(
		webhookURL, "application/json", bytes.NewReader(body),
	)
	if err != nil {
		log.Printf("Discord webhook test failed: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}

func colorForAlertType(alertType string) int {
	switch alertType {
	case "incoming_tx":
		return colorGreen
	case "outgoing_tx":
		return colorOrange
	case "large_transfer":
		return colorRed
	case "balance_below":
		return colorRed
	default:
		return colorBlue
	}
}
