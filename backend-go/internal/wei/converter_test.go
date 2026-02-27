package wei

import (
	"math"
	"testing"
)

func TestToEth(t *testing.T) {
	tests := []struct {
		name    string
		wei     string
		want    float64
		wantErr bool
	}{
		{"zero string", "0", 0, false},
		{"empty string", "", 0, false},
		{"1 ETH", "1000000000000000000", 1.0, false},
		{"0.5 ETH", "500000000000000000", 0.5, false},
		{"10 ETH", "10000000000000000000", 10.0, false},
		{"small amount", "1000000000000000", 0.001, false},
		{"1 Wei", "1", 1e-18, false},
		{"invalid", "notanumber", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ToEth(tt.wei)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(got-tt.want) > 1e-10 {
				t.Fatalf("ToEth(%q) = %v, want %v", tt.wei, got, tt.want)
			}
		})
	}
}

func TestFromEth(t *testing.T) {
	tests := []struct {
		name    string
		eth     float64
		want    string
		wantErr bool
	}{
		{"zero", 0, "0", false},
		{"1 ETH", 1.0, "1000000000000000000", false},
		{"0.5 ETH", 0.5, "500000000000000000", false},
		{"10 ETH", 10.0, "10000000000000000000", false},
		{"0.001 ETH", 0.001, "1000000000000000", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FromEth(tt.eth)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("FromEth(%v) = %q, want %q", tt.eth, got, tt.want)
			}
		})
	}
}

func TestRoundTrip(t *testing.T) {
	values := []float64{0.001, 0.1, 1.0, 5.5, 10.0, 100.0}
	for _, eth := range values {
		weiStr, err := FromEth(eth)
		if err != nil {
			t.Fatalf("FromEth(%v) error: %v", eth, err)
		}
		back, err := ToEth(weiStr)
		if err != nil {
			t.Fatalf("ToEth(%q) error: %v", weiStr, err)
		}
		if math.Abs(back-eth) > 1e-10 {
			t.Fatalf("round-trip %v → %q → %v (diff: %v)", eth, weiStr, back, back-eth)
		}
	}
}

func TestCompare(t *testing.T) {
	tests := []struct {
		name string
		a, b string
		want int
	}{
		{"equal", "1000", "1000", 0},
		{"a > b", "2000", "1000", 1},
		{"a < b", "1000", "2000", -1},
		{"zero equal", "0", "0", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Compare(tt.a, tt.b)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("Compare(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestGreaterThanOrEqual(t *testing.T) {
	ok, err := GreaterThanOrEqual("2000", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected true")
	}

	ok, err = GreaterThanOrEqual("1000", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected true for equal")
	}

	ok, err = GreaterThanOrEqual("500", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected false")
	}
}

func TestLessThan(t *testing.T) {
	ok, err := LessThan("500", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected true")
	}

	ok, err = LessThan("1000", "1000")
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected false for equal")
	}
}

func TestFormatAsEth(t *testing.T) {
	got, err := FormatAsEth("1000000000000000000", 4)
	if err != nil {
		t.Fatal(err)
	}
	if got != "1.0000 ETH" {
		t.Fatalf("got %q, want %q", got, "1.0000 ETH")
	}

	got, err = FormatAsEth("500000000000000000", 2)
	if err != nil {
		t.Fatal(err)
	}
	if got != "0.50 ETH" {
		t.Fatalf("got %q, want %q", got, "0.50 ETH")
	}
}
