package wei

import (
	"fmt"
	"math/big"
	"strings"
)

var weiPerEth = new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)

// ToEth converts a Wei string to a float64 ETH value.
// Use for display only — not for precision-sensitive comparisons.
func ToEth(weiString string) (float64, error) {
	if weiString == "" || weiString == "0" {
		return 0, nil
	}

	w, ok := new(big.Int).SetString(weiString, 10)
	if !ok {
		return 0, fmt.Errorf("invalid Wei value: %s", weiString)
	}

	wf := new(big.Float).SetInt(w)
	ef := new(big.Float).SetInt(weiPerEth)
	result, _ := new(big.Float).Quo(wf, ef).Float64()
	return result, nil
}

// FromEth converts an ETH float64 to a Wei string.
// Handles decimal precision by splitting on the decimal point.
func FromEth(eth float64) (string, error) {
	if eth == 0 {
		return "0", nil
	}

	s := fmt.Sprintf("%.18f", eth)
	parts := strings.SplitN(s, ".", 2)
	whole := parts[0]
	decimal := ""
	if len(parts) == 2 {
		decimal = parts[1]
	}

	// Pad or trim decimal to exactly 18 digits
	if len(decimal) < 18 {
		decimal = decimal + strings.Repeat("0", 18-len(decimal))
	} else {
		decimal = decimal[:18]
	}

	wholeBig, ok := new(big.Int).SetString(whole, 10)
	if !ok {
		return "", fmt.Errorf("invalid ETH value: %f", eth)
	}
	decimalBig, ok := new(big.Int).SetString(decimal, 10)
	if !ok {
		return "", fmt.Errorf("invalid ETH decimal: %s", decimal)
	}

	result := new(big.Int).Mul(wholeBig, weiPerEth)
	result.Add(result, decimalBig)
	return result.String(), nil
}

func Compare(weiA, weiB string) (int, error) {
	a, ok := new(big.Int).SetString(weiA, 10)
	if !ok {
		return 0, fmt.Errorf("invalid Wei value: %s", weiA)
	}
	b, ok := new(big.Int).SetString(weiB, 10)
	if !ok {
		return 0, fmt.Errorf("invalid Wei value: %s", weiB)
	}
	return a.Cmp(b), nil
}

func GreaterThanOrEqual(weiA, weiB string) (bool, error) {
	cmp, err := Compare(weiA, weiB)
	if err != nil {
		return false, err
	}
	return cmp >= 0, nil
}

func LessThan(weiA, weiB string) (bool, error) {
	cmp, err := Compare(weiA, weiB)
	if err != nil {
		return false, err
	}
	return cmp < 0, nil
}

// FormatAsEth formats a Wei string as "X.XXXX ETH".
func FormatAsEth(weiString string, decimals int) (string, error) {
	eth, err := ToEth(weiString)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%.*f ETH", decimals, eth), nil
}
