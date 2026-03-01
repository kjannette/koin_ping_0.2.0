package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const telegramHTTPTimeoutSeconds = 10

var telegramHTTPClient = &http.Client{ //nolint:gochecknoglobals
	Timeout: telegramHTTPTimeoutSeconds * time.Second,
}

type telegramPayload struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode"`
}

func SendTelegramNotification(botToken, chatID, message string, meta AlertMetadata) (bool, error) {
	text := fmt.Sprintf("*Koin Ping Alert*\n\n%s\n\n*Address:* %s\n`%s`",
		escapeMarkdown(message), escapeMarkdown(meta.AddressLabel), meta.Address)

	if meta.TxHash != "" {
		text += fmt.Sprintf("\n\n[View on Etherscan](https://etherscan.io/tx/%s)", meta.TxHash)
	}

	payload := telegramPayload{
		ChatID:    chatID,
		Text:      text,
		ParseMode: "Markdown",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, fmt.Errorf("marshal telegram payload: %w", err)
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	resp, err := telegramHTTPClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("Failed to send Telegram notification: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Telegram API failed: HTTP %d", resp.StatusCode)
		return false, fmt.Errorf("telegram API failed: HTTP %d", resp.StatusCode)
	}

	return true, nil
}

func TestTelegramWebhook(botToken, chatID string) (bool, error) {
	payload := telegramPayload{
		ChatID:    chatID,
		Text:      "Koin Ping test notification — Your Telegram alerts are configured correctly!",
		ParseMode: "Markdown",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	resp, err := telegramHTTPClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("Telegram test failed: %v", err)
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}

func escapeMarkdown(s string) string {
	replacer := []struct{ old, new string }{
		{"_", "\\_"}, {"*", "\\*"}, {"[", "\\["}, {"]", "\\]"},
		{"(", "\\("}, {")", "\\)"}, {"~", "\\~"}, {"`", "\\`"},
		{">", "\\>"}, {"#", "\\#"}, {"+", "\\+"}, {"-", "\\-"},
		{"=", "\\="}, {"|", "\\|"}, {"{", "\\{"}, {"}", "\\}"},
		{".", "\\."}, {"!", "\\!"},
	}
	result := s
	for _, r := range replacer {
		result = replaceAll(result, r.old, r.new)
	}
	return result
}

func replaceAll(s, old, new string) string {
	out := ""
	for i := 0; i < len(s); i++ {
		if string(s[i]) == old {
			out += new
		} else {
			out += string(s[i])
		}
	}
	return out
}
