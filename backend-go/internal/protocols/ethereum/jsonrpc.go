package ethereum

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

const (
	rpcTimeoutMS    = 30000
	rpcMaxRetries   = 3
	rpcRetryBaseMS  = 1000
)

type JsonRpcEthereum struct {
	rpcURL string
	client *http.Client
}

func NewJsonRpcEthereum(rpcURL string) (*JsonRpcEthereum, error) {
	if rpcURL == "" {
		return nil, fmt.Errorf("JsonRpcEthereum requires a valid RPC URL")
	}
	return &JsonRpcEthereum{
		rpcURL: rpcURL,
		client: &http.Client{
			Timeout: time.Duration(rpcTimeoutMS) * time.Millisecond,
		},
	}, nil
}

type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int64         `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (j *JsonRpcEthereum) callRPC(ctx context.Context, method string, params ...interface{}) (json.RawMessage, error) {
	if params == nil {
		params = []interface{}{}
	}

	body, err := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      time.Now().UnixMilli(),
		Method:  method,
		Params:  params,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal RPC request: %w", err)
	}

	return j.callWithRetry(ctx, method, body)
}

// callWithRetry executes a JSON-RPC POST with exponential backoff on transient errors.
// It retries on network errors, HTTP 429, and HTTP 5xx. It does NOT retry on RPC-level
// errors or other 4xx responses (those are permanent failures).
func (j *JsonRpcEthereum) callWithRetry(ctx context.Context, method string, body []byte) (json.RawMessage, error) {
	var lastErr error
	for attempt := range rpcMaxRetries {
		if attempt > 0 {
			wait := time.Duration(rpcRetryBaseMS*(1<<(attempt-1))) * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(wait):
			}
			log.Printf("Retrying RPC call [%s] (attempt %d/%d)", method, attempt+1, rpcMaxRetries)
		}

		result, err := j.doRPCCall(ctx, method, body)
		if err == nil {
			return result, nil
		}

		lastErr = err

		// Permanent errors: do not retry
		if isPermanentRPCError(err) {
			return nil, err
		}

		log.Printf("Transient RPC error [%s] (attempt %d/%d): %v", method, attempt+1, rpcMaxRetries, err)
	}

	return nil, lastErr
}

func (j *JsonRpcEthereum) doRPCCall(ctx context.Context, method string, body []byte) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, j.rpcURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create RPC request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := j.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("RPC call failed [%s]: %w", method, err)
	}
	defer resp.Body.Close()

	// 429 and 5xx are transient; other non-200 are permanent.
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("HTTP %d: %s for %s", resp.StatusCode, resp.Status, method)
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 { //nolint:mnd
			return nil, err // transient — will be retried
		}
		return nil, &permanentRPCError{err}
	}

	var rpcResp rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, fmt.Errorf("decode RPC response: %w", err)
	}

	if rpcResp.Error != nil {
		// RPC-level errors are permanent (bad params, unsupported method, etc.)
		return nil, &permanentRPCError{
			fmt.Errorf("RPC Error [%s]: %s (code: %d)", method, rpcResp.Error.Message, rpcResp.Error.Code),
		}
	}

	return rpcResp.Result, nil
}

type permanentRPCError struct{ cause error }

func (e *permanentRPCError) Error() string { return e.cause.Error() }
func (e *permanentRPCError) Unwrap() error { return e.cause }

func isPermanentRPCError(err error) bool {
	var p *permanentRPCError
	return errors.As(err, &p)
}

func (j *JsonRpcEthereum) GetLatestBlockNumber(ctx context.Context) (int, error) {
	result, err := j.callRPC(ctx, "eth_blockNumber")
	if err != nil {
		return 0, err
	}

	var hexBlock string
	if err := json.Unmarshal(result, &hexBlock); err != nil {
		return 0, fmt.Errorf("unmarshal block number: %w", err)
	}

	return hexToInt(hexBlock)
}

type rpcBlock struct {
	Timestamp    string  `json:"timestamp"`
	Transactions []rpcTx `json:"transactions"`
}

type rpcTx struct {
	Hash        string  `json:"hash"`
	From        string  `json:"from"`
	To          *string `json:"to"`
	Value       string  `json:"value"`
	BlockNumber string  `json:"blockNumber"`
}

func (j *JsonRpcEthereum) GetBlockTransactions(ctx context.Context, blockNumber int) ([]domain.NormalizedTx, error) {
	hexBlock := fmt.Sprintf("0x%x", blockNumber)

	result, err := j.callRPC(ctx, "eth_getBlockByNumber", hexBlock, true)
	if err != nil {
		return nil, err
	}

	if string(result) == "null" {
		return nil, nil
	}

	var block rpcBlock
	if err := json.Unmarshal(result, &block); err != nil {
		return nil, fmt.Errorf("unmarshal block: %w", err)
	}

	blockTimestamp, err := hexToInt64(block.Timestamp)
	if err != nil {
		return nil, fmt.Errorf("parse block timestamp: %w", err)
	}

	txs := make([]domain.NormalizedTx, 0, len(block.Transactions))
	for _, tx := range block.Transactions {
		bn, _ := hexToInt(tx.BlockNumber)

		var toLower *string
		if tx.To != nil {
			s := strings.ToLower(*tx.To)
			toLower = &s
		}

		txs = append(txs, domain.NormalizedTx{
			Hash:           tx.Hash,
			From:           strings.ToLower(tx.From),
			To:             toLower,
			Value:          hexToDecimalString(tx.Value),
			BlockNumber:    bn,
			BlockTimestamp: blockTimestamp,
		})
	}

	return txs, nil
}

func (j *JsonRpcEthereum) GetBalance(ctx context.Context, address string) (string, error) {
	result, err := j.callRPC(ctx, "eth_getBalance", address, "latest")
	if err != nil {
		return "", err
	}

	var hexBalance string
	if err := json.Unmarshal(result, &hexBalance); err != nil {
		return "", fmt.Errorf("unmarshal balance: %w", err)
	}

	return hexToDecimalString(hexBalance), nil
}

func hexToInt(hex string) (int, error) {
	hex = strings.TrimPrefix(hex, "0x")
	n, ok := new(big.Int).SetString(hex, 16)
	if !ok {
		return 0, fmt.Errorf("invalid hex: %s", hex)
	}
	return int(n.Int64()), nil
}

func hexToInt64(hex string) (int64, error) {
	hex = strings.TrimPrefix(hex, "0x")
	n, ok := new(big.Int).SetString(hex, 16)
	if !ok {
		return 0, fmt.Errorf("invalid hex: %s", hex)
	}
	return n.Int64(), nil
}

func hexToDecimalString(hex string) string {
	if hex == "" || hex == "0x" || hex == "0x0" {
		return "0"
	}
	clean := strings.TrimPrefix(hex, "0x")
	n, ok := new(big.Int).SetString(clean, 16)
	if !ok {
		return "0"
	}
	return n.String()
}
