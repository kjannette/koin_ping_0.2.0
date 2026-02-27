package notifications

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendDiscordNotification(t *testing.T) {
	var receivedPayload discordPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}

		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, &receivedPayload)

		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	meta := AlertMetadata{
		TxHash:       "0xabc123",
		AddressLabel: "Treasury",
		AlertType:    "incoming_tx",
		Address:      "0x1234567890abcdef1234567890abcdef12345678",
	}

	sent, err := SendDiscordNotification(server.URL, "Incoming transaction: 5.5 ETH received", meta)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !sent {
		t.Fatal("expected sent to be true")
	}

	if len(receivedPayload.Embeds) != 1 {
		t.Fatalf("expected 1 embed, got %d", len(receivedPayload.Embeds))
	}
	embed := receivedPayload.Embeds[0]
	if embed.Title != "Koin Ping Alert" {
		t.Errorf("title = %q, want %q", embed.Title, "Koin Ping Alert")
	}
	if embed.Color != 0x00ff00 {
		t.Errorf("color = %x, want %x (green for incoming_tx)", embed.Color, 0x00ff00)
	}
	if len(embed.Fields) != 3 {
		t.Errorf("expected 3 fields (address, blockchain address, tx), got %d", len(embed.Fields))
	}
}

func TestSendDiscordNotification_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()

	sent, err := SendDiscordNotification(server.URL, "test", AlertMetadata{})
	if err == nil {
		t.Fatal("expected error for bad response")
	}
	if sent {
		t.Fatal("expected sent to be false")
	}
}

func TestTestDiscordWebhook(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	ok, err := TestDiscordWebhook(server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatal("expected ok to be true")
	}
}

func TestColorForAlertType(t *testing.T) {
	tests := map[string]int{
		"incoming_tx":    0x00ff00,
		"outgoing_tx":    0xff9900,
		"large_transfer": 0xff0000,
		"balance_below":  0xff0000,
		"unknown":        0x0099ff,
	}
	for alertType, want := range tests {
		if got := colorForAlertType(alertType); got != want {
			t.Errorf("colorForAlertType(%q) = %x, want %x", alertType, got, want)
		}
	}
}
