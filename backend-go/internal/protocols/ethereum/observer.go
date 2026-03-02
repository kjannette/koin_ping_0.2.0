package ethereum

import (
	"context"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

// EthereumObserver defines the interface for blockchain interaction.
// Any concrete implementation (JSON-RPC, WebSocket, mock) must satisfy this.
type EthereumObserver interface {
	GetLatestBlockNumber(ctx context.Context) (int, error)
	GetBlockTransactions(ctx context.Context, blockNumber int) ([]domain.NormalizedTx, error)
	GetBalance(ctx context.Context, address string) (string, error)
	GetTokenTransfers(ctx context.Context, fromBlock, toBlock int, address string) ([]domain.NormalizedTx, error)
}
