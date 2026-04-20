/**
 * Seeded random number generator
 * Uses Mulberry32 algorithm for deterministic random numbers
 */

class Random {
    constructor(seed) {
        this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
    }

    /**
     * Generate next random number [0, 1)
     */
    next() {
        console.log('new random');
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Generate random integer [0, max)
     */
    range(max) {
        return Math.floor(this.next() * max);
    }
}

// Global instance
let globalRandom = null;

/**
 * Initialize random with seed
 */
export function initRandom(seed) {
    if (seed === undefined) {
        // Use current time
        seed = Date.now();
    }
    globalRandom = new Random(seed);
    console.log(`[Random] Initialized with seed: ${seed}`);
}

/**
 * Check if random is already initialized
 */
export function isRandomInitialized() {
    return globalRandom !== null;
}

/**
 * Get random number [0, max)
 * Compatible with C ran(range)
 */
export function ran(max) {
    if (!globalRandom) {
        initRandom();
    }
    return globalRandom.range(max);
}

/**
 * Get random float [0, 1)
 */
export function random() {
    if (!globalRandom) {
        initRandom();
    }
    return globalRandom.next();
}
