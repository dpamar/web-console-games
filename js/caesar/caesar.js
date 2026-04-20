/**
 * Caesar cipher implementation
 * Ported from BSD games caesar.c
 */

// Letter frequencies (from unix documentation)
const stdf = [
    7.97, 1.35, 3.61, 4.78, 12.37, 2.01, 1.46, 4.49, 6.39, 0.04,
    0.42, 3.81, 2.69, 5.92,  6.96, 2.91, 0.08, 6.63, 8.77, 9.68,
    2.62, 0.81, 1.88, 0.23,  2.07, 0.06,
];

/**
 * Rotate a character by the given shift
 */
function rotate(ch, perm) {
    const code = ch.charCodeAt(0);

    if (code >= 65 && code <= 90) { // A-Z
        return String.fromCharCode(65 + (code - 65 + perm) % 26);
    } else if (code >= 97 && code <= 122) { // a-z
        return String.fromCharCode(97 + (code - 97 + perm) % 26);
    } else {
        return ch;
    }
}

/**
 * Encode/decode text with a given rotation
 */
export function printit(text, rot) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += rotate(text[i], rot);
    }
    return result;
}

/**
 * Auto-detect the rotation by frequency analysis
 */
export function autoDetect(text) {
    // Adjust frequency table to weight low probs REAL low
    const adjustedStdf = [];
    for (let i = 0; i < 26; i++) {
        adjustedStdf[i] = Math.log(stdf[i]) + Math.log(26.0 / 100.0);
    }

    // Zero out observation table
    const obs = new Array(26).fill(0);

    // Count letter frequencies
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const code = ch.charCodeAt(0);
        if (code >= 97 && code <= 122) { // a-z
            obs[code - 97]++;
        } else if (code >= 65 && code <= 90) { // A-Z
            obs[code - 65]++;
        }
    }

    // Now "dot" the freqs with the observed letter freqs
    // and keep track of best fit
    let winnerdot = 0;
    let winner = 0;

    for (let tryRot = 0; tryRot < 26; tryRot++) {
        let dot = 0;
        for (let i = 0; i < 26; i++) {
            dot += obs[i] * adjustedStdf[(i + tryRot) % 26];
        }

        // Initialize winning score
        if (tryRot === 0) {
            winnerdot = dot;
        }
        if (dot > winnerdot) {
            // Got a new winner!
            winner = tryRot;
            winnerdot = dot;
        }
    }

    return winner;
}

/**
 * Decode with auto-detection
 */
export function autoDecode(text) {
    const rotation = autoDetect(text);
    return printit(text, rotation);
}
