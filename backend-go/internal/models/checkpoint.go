package models

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend-go/internal/domain"
)

type CheckpointModel struct {
	pool *pgxpool.Pool
}

func NewCheckpointModel(pool *pgxpool.Pool) *CheckpointModel {
	return &CheckpointModel{pool: pool}
}

// GetLatestBlock returns the highest last_checked_block and its timestamp across all addresses.
// Returns nil, nil, nil when no checkpoints exist yet.
func (m *CheckpointModel) GetLatestBlock(ctx context.Context) (*int, *time.Time, error) {
	var block *int
	var checkedAt *time.Time
	err := m.pool.QueryRow(ctx,
		`SELECT MAX(last_checked_block), MAX(last_checked_at) FROM address_checkpoints`,
	).Scan(&block, &checkedAt)
	if err != nil {
		return nil, nil, err
	}
	return block, checkedAt, nil
}

// GetLastCheckedBlock returns the last checked block for an address, or -1 if never checked.
func (m *CheckpointModel) GetLastCheckedBlock(ctx context.Context, addressID int) (int, bool, error) {
	var block int
	err := m.pool.QueryRow(ctx,
		`SELECT last_checked_block FROM address_checkpoints WHERE address_id = $1`,
		addressID,
	).Scan(&block)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, false, nil
		}
		return 0, false, err
	}
	return block, true, nil
}

func (m *CheckpointModel) UpdateLastCheckedBlock(ctx context.Context, addressID, blockNumber int) (*domain.AddressCheckpoint, error) {
	var cp domain.AddressCheckpoint
	err := m.pool.QueryRow(ctx,
		`INSERT INTO address_checkpoints (address_id, last_checked_block, last_checked_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (address_id)
		 DO UPDATE SET
		   last_checked_block = $2,
		   last_checked_at = NOW()
		 RETURNING address_id, last_checked_block, last_checked_at`,
		addressID, blockNumber,
	).Scan(&cp.AddressID, &cp.LastCheckedBlock, &cp.LastCheckedAt)
	if err != nil {
		return nil, err
	}
	return &cp, nil
}

func (m *CheckpointModel) ListAll(ctx context.Context) ([]domain.CheckpointDetail, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT ac.address_id, a.address, a.label, ac.last_checked_block, ac.last_checked_at
		 FROM address_checkpoints ac
		 JOIN addresses a ON a.id = ac.address_id
		 ORDER BY ac.last_checked_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []domain.CheckpointDetail
	for rows.Next() {
		var d domain.CheckpointDetail
		if err := rows.Scan(&d.AddressID, &d.Address, &d.Label, &d.LastCheckedBlock, &d.LastCheckedAt); err != nil {
			return nil, err
		}
		details = append(details, d)
	}
	return details, rows.Err()
}

func (m *CheckpointModel) Remove(ctx context.Context, addressID int) (bool, error) {
	tag, err := m.pool.Exec(ctx,
		`DELETE FROM address_checkpoints WHERE address_id = $1`,
		addressID,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
