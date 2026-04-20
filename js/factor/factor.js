/**
 * Factor - Factorize numbers into primes
 * Ported from BSD games factor.c (simplified version without OpenSSL)
 */

import { prime, pr_limit } from './primes.js';

/**
 * Factor a number into its prime factors
 * Returns array of factors or null if invalid
 */
export function prFact(val) {
    val = BigInt(val);

    // Firewall - catch 0 and 1
    if (val === 0n) {
        return null; // Exit on 0
    }
    if (val === 1n) {
        return [1n];
    }

    const factors = [];
    let factIndex = 0;

    // Factor value
    while (val !== 1n) {
        // Look for smallest factor
        let found = false;
        while (factIndex < prime.length) {
            const factor = BigInt(prime[factIndex]);
            if (val % factor === 0n) {
                found = true;
                break;
            }
            factIndex++;
        }

        // Watch for primes larger than table
        if (factIndex >= prime.length) {
            // Number is prime or larger than our table
            factors.push(val);
            break;
        }

        // Divide factor out until none are left
        const factor = BigInt(prime[factIndex]);
        while (val % factor === 0n) {
            factors.push(factor);
            val = val / factor;
        }
    }

    return factors;
}

/**
 * Parse and validate a number string
 */
export function parseNumber(str) {
    str = str.trim();

    if (str === '' || str === '-') {
        throw new Error('illegal numeric format');
    }

    if (str[0] === '-') {
        throw new Error('negative numbers aren\'t permitted');
    }

    if (!/^\d+$/.test(str)) {
        throw new Error('illegal numeric format');
    }

    try {
        return BigInt(str);
    } catch (e) {
        throw new Error('illegal numeric format');
    }
}

/**
 * Format factorization result
 */
export function formatFactors(num, factors) {
    if (factors === null) {
        return null; // Exit on 0
    }

    let result = `${num}:`;
    for (const factor of factors) {
        result += ` ${factor}`;
    }
    return result;
}
