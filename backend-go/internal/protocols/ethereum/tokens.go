package ethereum

import "strings"

// TokenInfo holds metadata for a known ERC-20 token contract.
type TokenInfo struct {
	Symbol   string
	Decimals int
}

//nolint:gochecknoglobals
var wellKnownTokens = map[string]TokenInfo{
	"0xdac17f958d2ee523a2206206994597c13d831ec7": {Symbol: "USDT", Decimals: 6},
	"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {Symbol: "USDC", Decimals: 6},
	"0x6b175474e89094c44da98b954eedeac495271d0f": {Symbol: "DAI", Decimals: 18},
	"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {Symbol: "WETH", Decimals: 18},
	"0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {Symbol: "WBTC", Decimals: 8},
	"0x514910771af9ca656af840dff83e8264ecf986ca": {Symbol: "LINK", Decimals: 18},
	"0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": {Symbol: "UNI", Decimals: 18},
	"0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": {Symbol: "AAVE", Decimals: 18},
	"0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": {Symbol: "SHIB", Decimals: 18},
	"0x6982508145454ce325ddbe47a25d4ec3d2311933": {Symbol: "PEPE", Decimals: 18},
	"0xb8c77482e45f1f44de1745f52c74426c631bdd52": {Symbol: "BNB", Decimals: 18},
	"0x4fabb145d64652a948d72533023f6e7a623c7c53": {Symbol: "BUSD", Decimals: 18},
	"0x75231f58b43240c9718dd58b4967c5114342a86c": {Symbol: "OKB", Decimals: 18},
	"0x582d872a1b094fc48f5de31d3b73f2d9be47def1": {Symbol: "TON", Decimals: 9},
	"0x4d224452801aced8b2f0aebe155379bb5d594381": {Symbol: "APE", Decimals: 18},
}

// LookupToken returns metadata for a known token contract, if found.
func LookupToken(contractAddress string) (TokenInfo, bool) {
	info, ok := wellKnownTokens[strings.ToLower(contractAddress)]
	return info, ok
}
