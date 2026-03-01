package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const slackHTTPTimeoutSeconds = 10

var slackHTTPClient = &http.Client{ //nolint:gochecknoglobals
	Timeout: slackHTTPTimeoutSeconds * time.Second,
}

type slackAttachment struct {
	Color  string        `json:"color"`
	Title  string        `json:"title"`
	Text   string        `json:"text"`
	Fields []slackField  `json:"fields"`
	Footer string        `json:"footer"`
	Ts     int64         `json:"ts"`
}

type slackField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

type slackPayload struct {
	Text        string            `json:"text,omitempty"`
	Attachments []slackAttachment `json:"attachments,omitempty"`
}

func SendSlackNotification(webhookURL, message string, meta AlertMetadata) (bool, error) {
	fields := []slackField{
		{Title: "Address", Value: meta.AddressLabel, Short: true},
		{Title: "Blockchain Address", Value: fmt.Sprintf("`%s`", meta.Address), Short: false},
	}

	if meta.TxHash != "" {
		fields = append(fields, slackField{
			Title: "Transaction",
			Value: fmt.Sprintf("<https://etherscan.io/tx/%s|View on Etherscan>", meta.TxHash),
			Short: false,
		})
	}

	payload := slackPayload{
		Attachments: []slackAttachment{
			{
				Color:  slackColorForAlertType(meta.AlertType),
				Title:  "Koin Ping Alert",
				Text:   message,
				Fields: fields,
				Footer: "Koin Ping",
				Ts:     time.Now().Unix(),
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, fmt.Errorf("marshal slack payload: %w", err)
	}

	resp, err := slackHTTPClient.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("Failed to send Slack notification: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Slack webhook failed: HTTP %d", resp.StatusCode)
		return false, fmt.Errorf("slack webhook failed: HTTP %d", resp.StatusCode)
	}

	return true, nil
}

func TestSlackWebhook(webhookURL string) (bool, error) {
	payload := slackPayload{
		Text: "Koin Ping test notification — Your Slack alerts are configured correctly!",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	resp, err := slackHTTPClient.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("Slack webhook test failed: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}

func slackColorForAlertType(alertType string) string {
	switch alertType {
	case "incoming_tx":
		return "#00ff00"
	case "outgoing_tx":
		return "#ff9900"
	case "large_transfer", "balance_below":
		return "#ff0000"
	default:
		return "#0099ff"
	}
}
