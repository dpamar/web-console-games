/**
 * Implementation of java.util.Random compatible with Java's Linear Congruential Generator.
 * This ensures that the same seed produces the same sequence of numbers in both Java and JS.
 *
 * Based on java.util.Random source code:
 * https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/Random.java
 */
export class JavaRandom {
    constructor(seed) {
        // Java's Random uses a 48-bit seed
        const MULTIPLIER = 0x5DEECE66Dn;
        const MASK_48 = (1n << 48n) - 1n;

        this.seed = (BigInt(seed) ^ MULTIPLIER) & MASK_48;
    }

    /**
     * Generate next pseudo-random value with specified number of bits.
     * This is the core method used by all other random generation methods.
     */
    next(bits) {
        const MULTIPLIER = 0x5DEECE66Dn;
        const ADDEND = 0xBn;
        const MASK_48 = (1n << 48n) - 1n;

        this.seed = (this.seed * MULTIPLIER + ADDEND) & MASK_48;

        // Java uses unsigned right shift (>>>), but BigInt only has signed shift (>>)
        // To emulate unsigned shift, we just shift and mask to ensure positive result
        const shifted = this.seed >> BigInt(48 - bits);
        const mask = (1n << BigInt(bits)) - 1n;
        return Number(shifted & mask);
    }

    /**
     * Generate random integer between 0 (inclusive) and bound (exclusive).
     * Same algorithm as Java's Random.nextInt(int bound).
     */
    nextInt(bound) {
        if (bound <= 0) {
            throw new Error("bound must be positive");
        }

        // Special case: bound is a power of 2
        if ((bound & -bound) === bound) {
            // Use Math.floor to avoid negative results from >> operator
            return Math.floor((bound * this.next(31)) / 0x80000000);
        }

        // General case - rejection sampling
        let bits, val;
        do {
            bits = this.next(31);
            val = bits % bound;
        } while (bits - val + (bound - 1) < 0);

        return val;
    }

    /**
     * Shuffle array in place using Fisher-Yates algorithm.
     * Same behavior as Java's Collections.shuffle(List, Random).
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Singleton instance
let instance = null;

export class CluedoRandom {
    static initialize(seed) {
        instance = new JavaRandom(seed);
    }

    static getInstance() {
        if (instance === null) {
            throw new Error("CluedoRandom not initialized");
        }
        return instance;
    }
}
