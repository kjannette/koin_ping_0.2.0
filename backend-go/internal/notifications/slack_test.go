package notifications

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendSlackNotification(t *testing.T) {
	var receivedPayload slackPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json content type")
		}

		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, &receivedPayload)

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	meta := AlertMetadata{
		TxHash:       "0xabc123",
		AddressLabel: "Treasury",
		AlertType:    "incoming_tx",
		Address:      "0x1234567890abcdef1234567890abcdef12345678",
	}

	sent, err := SendSlackNotification(server.URL, "Incoming transaction: 5.5 ETH received", meta)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !sent {
		t.Fatal("expected sent to be true")
	}

	if len(receivedPayload.Blocks) < 3 {
		t.Fatalf("expected at least 3 blocks, got %d", len(receivedPayload.Blocks))
	}
	if receivedPayload.Blocks[0].Type != "header" {
		t.Errorf("first block should be header, got %s", receivedPayload.Blocks[0].Type)
	}
}

func TestSendSlackNotification_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	sent, err := SendSlackNotification(server.URL, "test", AlertMetadata{})
	if err == nil {
		t.Fatal("expected error for server error response")
	}
	if sent {
		t.Fatal("expected sent to be false")
	}
}

func TestSendSlackNotification_NoTxHash(t *testing.T) {
	var receivedPayload slackPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, &receivedPayload)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	meta := AlertMetadata{
		AddressLabel: "Treasury",
		AlertType:    "balance_below",
		Address:      "0x1234567890abcdef1234567890abcdef12345678",
	}

	sent, err := SendSlackNotification(server.URL, "Balance dropped below threshold", meta)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !sent {
		t.Fatal("expected sent to be true")
	}

	for _, block := range receivedPayload.Blocks {
		if block.Text != nil && block.Type == "section" {
			if block.Text.Text == "*Transaction:*" {
				t.Error("should not include transaction block when TxHash is empty")
			}
		}
	}
}

func TestTestSlackWebhook(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	ok, err := TestSlackWebhook(server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatal("expected ok to be true")
	}
}

func TestEmojiForAlertType(t *testing.T) {
	tests := map[string]string{
		"incoming_tx":    "📥",
		"outgoing_tx":    "📤",
		"large_transfer": "🚨",
		"balance_below":  "⚠️",
		"unknown":        "🔔",
	}
	for alertType, want := range tests {
		if got := emojiForAlertType(alertType); got != want {
			t.Errorf("emojiForAlertType(%q) = %q, want %q", alertType, got, want)
		}
	}
}
