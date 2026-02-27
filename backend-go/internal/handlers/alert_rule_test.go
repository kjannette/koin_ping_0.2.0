package handlers

import (
	"encoding/json"
	"math"
	"testing"
)

func TestParseThreshold(t *testing.T) {
	t.Run("nil/empty raw message returns nil", func(t *testing.T) {
		val, err := parseThreshold(nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val != nil {
			t.Fatalf("expected nil, got %v", *val)
		}
	})

	t.Run("empty slice returns nil", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val != nil {
			t.Fatalf("expected nil, got %v", *val)
		}
	})

	t.Run("JSON null returns nil", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage("null"))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val != nil {
			t.Fatalf("expected nil, got %v", *val)
		}
	})

	t.Run("number 10 returns 10.0", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage("10"))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val == nil {
			t.Fatal("expected non-nil value")
		}
		if *val != 10.0 {
			t.Fatalf("expected 10.0, got %v", *val)
		}
	})

	t.Run("number 0.5 returns 0.5", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage("0.5"))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val == nil || *val != 0.5 {
			t.Fatalf("expected 0.5, got %v", val)
		}
	})

	t.Run("string '10' returns 10.0", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage(`"10"`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val == nil || *val != 10.0 {
			t.Fatalf("expected 10.0, got %v", val)
		}
	})

	t.Run("string '0.001' returns 0.001", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage(`"0.001"`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val == nil || math.Abs(*val-0.001) > 1e-9 {
			t.Fatalf("expected 0.001, got %v", val)
		}
	})

	t.Run("string with spaces '  10  ' returns 10.0", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage(`"  10  "`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val == nil || *val != 10.0 {
			t.Fatalf("expected 10.0, got %v", val)
		}
	})

	t.Run("empty string returns nil", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage(`""`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val != nil {
			t.Fatalf("expected nil, got %v", *val)
		}
	})

	t.Run("whitespace-only string returns nil", func(t *testing.T) {
		val, err := parseThreshold(json.RawMessage(`"   "`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if val != nil {
			t.Fatalf("expected nil, got %v", *val)
		}
	})

	t.Run("invalid string returns error", func(t *testing.T) {
		_, err := parseThreshold(json.RawMessage(`"abc"`))
		if err == nil {
			t.Fatal("expected error for non-numeric string")
		}
	})

	t.Run("boolean returns error", func(t *testing.T) {
		_, err := parseThreshold(json.RawMessage("true"))
		if err == nil {
			t.Fatal("expected error for boolean")
		}
	})

	t.Run("array returns error", func(t *testing.T) {
		_, err := parseThreshold(json.RawMessage("[1,2]"))
		if err == nil {
			t.Fatal("expected error for array")
		}
	})
}

func TestDecodeAlertBody(t *testing.T) {
	// Verifies that the struct used in Create handler can decode all
	// payload shapes the frontend might send.

	type alertBody struct {
		Type      string          `json:"type"`
		Threshold json.RawMessage `json:"threshold"`
	}

	tests := []struct {
		name    string
		payload string
		wantErr bool
	}{
		{
			name:    "incoming_tx without threshold",
			payload: `{"type":"incoming_tx"}`,
		},
		{
			name:    "outgoing_tx without threshold",
			payload: `{"type":"outgoing_tx"}`,
		},
		{
			name:    "large_transfer with number threshold",
			payload: `{"type":"large_transfer","threshold":10}`,
		},
		{
			name:    "large_transfer with string threshold",
			payload: `{"type":"large_transfer","threshold":"10"}`,
		},
		{
			name:    "balance_below with number threshold",
			payload: `{"type":"balance_below","threshold":0.5}`,
		},
		{
			name:    "threshold null",
			payload: `{"type":"incoming_tx","threshold":null}`,
		},
		{
			name:    "empty object",
			payload: `{}`,
		},
		{
			name:    "empty body",
			payload: ``,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body alertBody
			err := json.Unmarshal([]byte(tt.payload), &body)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected decode error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected decode error: %v", err)
			}
		})
	}
}

func TestOldStructFailsWithStringThreshold(t *testing.T) {
	// Documents the original bug: *float64 cannot decode a string threshold.
	type oldAlertBody struct {
		Type      string   `json:"type"`
		Threshold *float64 `json:"threshold"`
	}

	payload := `{"type":"large_transfer","threshold":"10"}`
	var body oldAlertBody
	err := json.Unmarshal([]byte(payload), &body)
	if err == nil {
		t.Fatal("expected error: old struct with *float64 should reject string threshold")
	}
}
