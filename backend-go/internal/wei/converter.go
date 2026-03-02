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

// FormatTokenAmount formats a raw token amount using the token's decimal places.
// For example, 1000000 USDT (6 decimals) becomes "1".
func FormatTokenAmount(rawValue string, tokenDecimals int) string {
	if rawValue == "" || rawValue == "0" {
		return "0"
	}

	n, ok := new(big.Int).SetString(rawValue, 10)
	if !ok {
		return "0"
	}

	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(tokenDecimals)), nil) //nolint:mnd
	whole := new(big.Int).Div(n, divisor)
	remainder := new(big.Int).Mod(n, divisor)

	if remainder.Sign() == 0 {
		return addThousandsSeparators(whole.String())
	}

	fracStr := fmt.Sprintf("%0*s", tokenDecimals, remainder.String())
	fracStr = strings.TrimRight(fracStr, "0")
	const maxDisplayDecimals = 4
	if len(fracStr) > maxDisplayDecimals {
		fracStr = fracStr[:maxDisplayDecimals]
	}

	return addThousandsSeparators(whole.String()) + "." + fracStr
}

func addThousandsSeparators(s string) string {
	if len(s) <= 3 { //nolint:mnd
		return s
	}

	var result strings.Builder
	offset := len(s) % 3 //nolint:mnd
	if offset > 0 {
		result.WriteString(s[:offset])
	}

	for i := offset; i < len(s); i += 3 { //nolint:mnd
		if result.Len() > 0 {
			result.WriteByte(',')
		}
		result.WriteString(s[i : i+3]) //nolint:mnd
	}

	return result.String()
}
