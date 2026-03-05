package models

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kjannette/koin-ping/backend/internal/domain"
)

type AddressModel struct {
	pool *pgxpool.Pool
}

func NewAddressModel(pool *pgxpool.Pool) *AddressModel {
	return &AddressModel{pool: pool}
}

func (m *AddressModel) Create(ctx context.Context, userID, address string, label *string) (*domain.Address, error) {
	var a domain.Address
	err := m.pool.QueryRow(ctx,
		`INSERT INTO addresses (user_id, address, label)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, address, label, created_at`,
		userID, address, label,
	).Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (m *AddressModel) ListByUser(ctx context.Context, userID string) ([]domain.Address, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT id, user_id, address, label, created_at
		 FROM addresses
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var addresses []domain.Address
	for rows.Next() {
		var a domain.Address
		if err := rows.Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt); err != nil {
			return nil, err
		}
		addresses = append(addresses, a)
	}
	return addresses, rows.Err()
}

// ListAll returns all addresses system-wide (used by the poller).
func (m *AddressModel) ListAll(ctx context.Context) ([]domain.Address, error) {
	rows, err := m.pool.Query(ctx,
		`SELECT id, user_id, address, label, created_at
		 FROM addresses
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var addresses []domain.Address
	for rows.Next() {
		var a domain.Address
		if err := rows.Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt); err != nil {
			return nil, err
		}
		addresses = append(addresses, a)
	}
	return addresses, rows.Err()
}

func (m *AddressModel) FindByID(ctx context.Context, id int, userID *string) (*domain.Address, error) {
	var a domain.Address
	var err error

	if userID != nil {
		err = m.pool.QueryRow(ctx,
			`SELECT id, user_id, address, label, created_at
			 FROM addresses
			 WHERE id = $1 AND user_id = $2`,
			id, *userID,
		).Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt)
	} else {
		err = m.pool.QueryRow(ctx,
			`SELECT id, user_id, address, label, created_at
			 FROM addresses
			 WHERE id = $1`,
			id,
		).Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

// UpdateLabel updates the label for an address owned by userID.
// Returns nil, nil if no row matched (address not found or not owned by user).
func (m *AddressModel) UpdateLabel(ctx context.Context, id int, userID string, label *string) (*domain.Address, error) {
	var a domain.Address
	err := m.pool.QueryRow(ctx,
		`UPDATE addresses SET label = $3 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, address, label, created_at`,
		id, userID, label,
	).Scan(&a.ID, &a.UserID, &a.Address, &a.Label, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (m *AddressModel) Remove(ctx context.Context, id int, userID string) (bool, error) {
	tag, err := m.pool.Exec(ctx,
		`DELETE FROM addresses WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
