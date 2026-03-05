package services

import (
	"context"
	"log"
	"strings"

	"github.com/kjannette/koin-ping/backend/internal/domain"
	"github.com/kjannette/koin-ping/backend/internal/models"
	"github.com/kjannette/koin-ping/backend/internal/protocols/ethereum"
)

const maxBlocksPerRun = 100

type ObserverService struct {
	eth        ethereum.EthereumObserver
	addresses  *models.AddressModel
	checkpoint *models.CheckpointModel
}

func NewObserverService(eth ethereum.EthereumObserver, addresses *models.AddressModel, checkpoint *models.CheckpointModel) *ObserverService {
	return &ObserverService{
		eth:        eth,
		addresses:  addresses,
		checkpoint: checkpoint,
	}
}

func (s *ObserverService) RunOnce(ctx context.Context) ([]domain.ObservedTx, error) {
	addresses, err := s.addresses.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	if len(addresses) == 0 {
		return nil, nil
	}

	latestBlock, err := s.eth.GetLatestBlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	var observations []domain.ObservedTx
	for _, addr := range addresses {
		obs, err := s.observeAddress(ctx, addr, latestBlock)
		if err != nil {
			log.Printf("Error observing address %s: %v", addr.Address, err)
			continue
		}
		observations = append(observations, obs...)
	}

	return observations, nil
}

func (s *ObserverService) observeAddress(ctx context.Context, addr domain.Address, latestBlock int) ([]domain.ObservedTx, error) {
	lastChecked, found, err := s.checkpoint.GetLastCheckedBlock(ctx, addr.ID)
	if err != nil {
		return nil, err
	}

	startBlock := s.getStartBlock(lastChecked, found, latestBlock)
	endBlock := s.getEndBlock(startBlock, latestBlock)

	if startBlock > endBlock {
		return nil, nil
	}

	var observations []domain.ObservedTx
	for blockNumber := startBlock; blockNumber <= endBlock; blockNumber++ {
		blockTxs, err := s.eth.GetBlockTransactions(ctx, blockNumber)
		if err != nil {
			return nil, err
		}

		relevant := filterRelevantTransactions(blockTxs, addr.Address)
		for _, tx := range relevant {
			observations = append(observations, createObservedTx(tx, addr))
		}
	}

	tokenTxs, err := s.eth.GetTokenTransfers(ctx, startBlock, endBlock, addr.Address)
	if err != nil {
		log.Printf("Error fetching token transfers for %s: %v", addr.Address, err)
	} else {
		for _, tx := range tokenTxs {
			observations = append(observations, createObservedTx(tx, addr))
		}
	}

	if _, err := s.checkpoint.UpdateLastCheckedBlock(ctx, addr.ID, endBlock); err != nil {
		return nil, err
	}

	return observations, nil
}

func (s *ObserverService) getStartBlock(lastChecked int, found bool, latestBlock int) int {
	if !found {
		return latestBlock
	}
	return lastChecked + 1
}

func (s *ObserverService) getEndBlock(startBlock, latestBlock int) int {
	end := startBlock + maxBlocksPerRun - 1
	if end > latestBlock {
		return latestBlock
	}
	return end
}

func filterRelevantTransactions(txs []domain.NormalizedTx, trackedAddress string) []domain.NormalizedTx {
	addrLower := strings.ToLower(trackedAddress)
	var relevant []domain.NormalizedTx

	for _, tx := range txs {
		fromMatch := strings.ToLower(tx.From) == addrLower
		toMatch := tx.To != nil && strings.ToLower(*tx.To) == addrLower
		if fromMatch || toMatch {
			relevant = append(relevant, tx)
		}
	}

	return relevant
}

func createObservedTx(tx domain.NormalizedTx, addr domain.Address) domain.ObservedTx {
	addrLower := strings.ToLower(addr.Address)
	direction := domain.DirectionOutgoing
	if tx.To != nil && strings.ToLower(*tx.To) == addrLower {
		direction = domain.DirectionIncoming
	}

	return domain.ObservedTx{
		NormalizedTx: tx,
		AddressID:    addr.ID,
		Direction:    direction,
	}
}
