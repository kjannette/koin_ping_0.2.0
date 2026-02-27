package ethereum

import (
	"math/big"
	"testing"
)

func TestHexToInt(t *testing.T) {
	tests := []struct {
		hex  string
		want int
	}{
		{"0x0", 0},
		{"0x1", 1},
		{"0xa", 10},
		{"0xff", 255},
		{"0x100", 256},
		{"0x1234", 4660},
	}

	for _, tt := range tests {
		got, err := hexToInt(tt.hex)
		if err != nil {
			t.Fatalf("hexToInt(%q) error: %v", tt.hex, err)
		}
		if got != tt.want {
			t.Errorf("hexToInt(%q) = %d, want %d", tt.hex, got, tt.want)
		}
	}
}

func TestHexToInt_Invalid(t *testing.T) {
	_, err := hexToInt("xyz")
	if err == nil {
		t.Fatal("expected error for invalid hex")
	}
}

func TestHexToInt64(t *testing.T) {
	got, err := hexToInt64("0x5f5e100")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 100000000 {
		t.Errorf("got %d, want 100000000", got)
	}
}

func TestHexToDecimalString(t *testing.T) {
	tests := []struct {
		hex  string
		want string
	}{
		{"0x0", "0"},
		{"0x", "0"},
		{"", "0"},
		{"0x1", "1"},
		{"0xde0b6b3a7640000", "1000000000000000000"},
	}

	for _, tt := range tests {
		got := hexToDecimalString(tt.hex)
		if got != tt.want {
			t.Errorf("hexToDecimalString(%q) = %q, want %q", tt.hex, got, tt.want)
		}
	}
}

func TestHexToDecimalString_LargeValues(t *testing.T) {
	expected := new(big.Int).Mul(
		big.NewInt(100),
		new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil),
	)
	hex := "0x" + expected.Text(16)
	got := hexToDecimalString(hex)
	if got != expected.String() {
		t.Errorf("got %q, want %q", got, expected.String())
	}
}

func TestNewJsonRpcEthereum_EmptyURL(t *testing.T) {
	_, err := NewJsonRpcEthereum("")
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
}

func TestNewJsonRpcEthereum_ValidURL(t *testing.T) {
	eth, err := NewJsonRpcEthereum("https://example.com/rpc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if eth == nil {
		t.Fatal("expected non-nil client")
	}
}
