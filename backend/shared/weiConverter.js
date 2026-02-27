

const WEI_PER_ETH = 1000000000000000000n; // 10^18 Wei = 1 ETH

/**
 * Convert Wei (as string) to ETH (as number)
 * Use for display purposes only, not for calculations
 * @param {string} weiString - Wei value as string
 * @returns {number} ETH value as number
 */
export function weiToEth(weiString) {
  if (!weiString || weiString === '0') {
    return 0;
  }
  
  try {
    const wei = BigInt(weiString);
    // Convert to number (safe for display values)
    return Number(wei) / Number(WEI_PER_ETH);
  } catch (error) {
    throw new Error(`Invalid Wei value: ${weiString}`);
  }
}

/**
 * Convert ETH (as number) to Wei (as string)
 * Use when converting DB thresholds for comparison
 * @param {number} eth - ETH value as number
 * @returns {string} Wei value as string
 */
export function ethToWei(eth) {
  if (typeof eth !== 'number' || isNaN(eth)) {
    throw new Error(`Invalid ETH value: ${eth}`);
  }
  
  if (eth === 0) {
    return '0';
  }
  
  // Convert to string with fixed precision to avoid floating point issues
  const ethString = eth.toFixed(18); // Max precision
  const [whole, decimal = ''] = ethString.split('.');
  

  const wholePart = BigInt(whole) * WEI_PER_ETH;
  const decimalPart = BigInt(decimal.padEnd(18, '0'));
  
  return (wholePart + decimalPart).toString();
}

/**
 * Compare two Wei values
 * @param {string} weiA 
 * @param {string} weiB 
 * @returns {number} 
 */
export function compareWei(weiA, weiB) {
  const a = BigInt(weiA);
  const b = BigInt(weiB);
  
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if Wei value A is greater than or equal to Wei value B
 * @param {string} weiA - First Wei value as string
 * @param {string} weiB - Second Wei value as string
 * @returns {boolean}
 */
export function weiGreaterThanOrEqual(weiA, weiB) {
  return BigInt(weiA) >= BigInt(weiB);
}

/**
 * Check if Wei value A is less than Wei value B
 * @param {string} weiA 
 * @param {string} weiB 
 * @returns {boolean}
 */
export function weiLessThan(weiA, weiB) {
  return BigInt(weiA) < BigInt(weiB);
}

/**
 * @param {string} weiString 
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string}
 */
export function formatWeiAsEth(weiString, decimals = 4) {
  const eth = weiToEth(weiString);
  return `${eth.toFixed(decimals)} ETH`;
}

