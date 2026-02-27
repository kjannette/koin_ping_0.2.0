package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type slackBlock struct {
	Type     string      `json:"type"`
	Text     *slackText  `json:"text,omitempty"`
	Fields   []slackText `json:"fields,omitempty"`
	Elements []slackText `json:"elements,omitempty"`
}

type slackText struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type slackPayload struct {
	Blocks []slackBlock `json:"blocks"`
}

func SendSlackNotification(webhookURL, message string, meta AlertMetadata) (bool, error) {
	etherscanLink := ""
	if meta.TxHash != "" {
		etherscanLink = fmt.Sprintf("<%s|View on Etherscan>", "https://etherscan.io/tx/"+meta.TxHash)
	}

	blocks := []slackBlock{
		{
			Type: "header",
			Text: &slackText{Type: "plain_text", Text: emojiForAlertType(meta.AlertType) + " Koin Ping Alert"},
		},
		{
			Type: "section",
			Text: &slackText{Type: "mrkdwn", Text: message},
		},
		{
			Type: "section",
			Fields: []slackText{
				{Type: "mrkdwn", Text: fmt.Sprintf("*Address:*\n%s", meta.AddressLabel)},
				{Type: "mrkdwn", Text: fmt.Sprintf("*Blockchain Address:*\n`%s`", meta.Address)},
			},
		},
	}

	if etherscanLink != "" {
		blocks = append(blocks, slackBlock{
			Type: "section",
			Text: &slackText{Type: "mrkdwn", Text: fmt.Sprintf("*Transaction:* %s", etherscanLink)},
		})
	}

	blocks = append(blocks, slackBlock{
		Type: "context",
		Elements: []slackText{
			{Type: "mrkdwn", Text: fmt.Sprintf("Koin Ping | %s", time.Now().UTC().Format(time.RFC3339))},
		},
	})

	payload := slackPayload{Blocks: blocks}
	body, err := json.Marshal(payload)
	if err != nil {
		return false, fmt.Errorf("marshal slack payload: %w", err)
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body))
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
		Blocks: []slackBlock{
			{
				Type: "section",
				Text: &slackText{
					Type: "mrkdwn",
					Text: "Koin Ping test notification — Your Slack webhook is configured correctly!",
				},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("Slack webhook test failed: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}

func emojiForAlertType(alertType string) string {
	switch alertType {
	case "incoming_tx":
		return "📥"
	case "outgoing_tx":
		return "📤"
	case "large_transfer":
		return "🚨"
	case "balance_below":
		return "⚠️"
	default:
		return "🔔"
	}
}
