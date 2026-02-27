package services

import (
	"testing"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

func TestFilterRelevantTransactions(t *testing.T) {
	to1 := "0xaaaa"
	to2 := "0xbbbb"
	to3 := "0xcccc"

	txs := []domain.NormalizedTx{
		{Hash: "0x1", From: "0xaaaa", To: &to2, Value: "1000"},
		{Hash: "0x2", From: "0xbbbb", To: &to1, Value: "2000"},
		{Hash: "0x3", From: "0xcccc", To: &to3, Value: "3000"},
		{Hash: "0x4", From: "0xdddd", To: nil, Value: "0"},
	}

	t.Run("finds outgoing", func(t *testing.T) {
		result := filterRelevantTransactions(txs, "0xAAAA")
		if len(result) != 2 {
			t.Fatalf("expected 2 relevant txs (1 from, 1 to), got %d", len(result))
		}
	})

	t.Run("finds incoming", func(t *testing.T) {
		result := filterRelevantTransactions(txs, "0xBBBB")
		if len(result) != 2 {
			t.Fatalf("expected 2 relevant txs, got %d", len(result))
		}
	})

	t.Run("no match", func(t *testing.T) {
		result := filterRelevantTransactions(txs, "0x9999")
		if len(result) != 0 {
			t.Fatalf("expected 0 relevant txs, got %d", len(result))
		}
	})

	t.Run("case insensitive", func(t *testing.T) {
		result := filterRelevantTransactions(txs, "0xAAAA")
		if len(result) == 0 {
			t.Fatal("should match case-insensitively")
		}
	})
}

func TestCreateObservedTx(t *testing.T) {
	to := "0xaaaa"
	tx := domain.NormalizedTx{
		Hash:  "0xhash",
		From:  "0xbbbb",
		To:    &to,
		Value: "1000",
	}

	t.Run("incoming direction", func(t *testing.T) {
		addr := domain.Address{ID: 1, Address: "0xaaaa"}
		obs := createObservedTx(tx, addr)
		if obs.Direction != domain.DirectionIncoming {
			t.Errorf("expected incoming, got %s", obs.Direction)
		}
		if obs.AddressID != 1 {
			t.Errorf("expected address ID 1, got %d", obs.AddressID)
		}
	})

	t.Run("outgoing direction", func(t *testing.T) {
		addr := domain.Address{ID: 2, Address: "0xbbbb"}
		obs := createObservedTx(tx, addr)
		if obs.Direction != domain.DirectionOutgoing {
			t.Errorf("expected outgoing, got %s", obs.Direction)
		}
	})
}

func TestGetStartBlock(t *testing.T) {
	s := &ObserverService{}

	t.Run("no checkpoint uses latest", func(t *testing.T) {
		got := s.getStartBlock(0, false, 1000)
		if got != 1000 {
			t.Errorf("expected 1000, got %d", got)
		}
	})

	t.Run("with checkpoint uses next block", func(t *testing.T) {
		got := s.getStartBlock(999, true, 1000)
		if got != 1000 {
			t.Errorf("expected 1000, got %d", got)
		}
	})
}

func TestGetEndBlock(t *testing.T) {
	s := &ObserverService{}

	t.Run("caps at latest", func(t *testing.T) {
		got := s.getEndBlock(990, 1000)
		if got != 1000 {
			t.Errorf("expected 1000, got %d", got)
		}
	})

	t.Run("caps at maxBlocksPerRun", func(t *testing.T) {
		got := s.getEndBlock(0, 200)
		if got != maxBlocksPerRun-1 {
			t.Errorf("expected %d, got %d", maxBlocksPerRun-1, got)
		}
	})
}
