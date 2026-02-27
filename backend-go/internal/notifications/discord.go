package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type AlertMetadata struct {
	TxHash       string
	AddressLabel string
	AlertType    string
	Address      string
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

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body))
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

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body))
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
		return 0x00ff00 // Green
	case "outgoing_tx":
		return 0xff9900 // Orange
	case "large_transfer":
		return 0xff0000 // Red
	case "balance_below":
		return 0xff0000 // Red
	default:
		return 0x0099ff // Blue
	}
}
