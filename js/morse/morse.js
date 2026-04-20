/**
 * Morse Code Converter
 * Ported from NetBSD bsd-games
 *
 * Converts text to/from Morse code.
 */

// Morse code tables
const digit = [
    "-----", // 0
    ".----", // 1
    "..---", // 2
    "...--", // 3
    "....-", // 4
    ".....", // 5
    "-....", // 6
    "--...", // 7
    "---..", // 8
    "----.", // 9
];

const alph = [
    ".-",    // A
    "-...",  // B
    "-.-.",  // C
    "-..",   // D
    ".",     // E
    "..-.",  // F
    "--.",   // G
    "....",  // H
    "..",    // I
    ".---",  // J
    "-.-",   // K
    ".-..",  // L
    "--",    // M
    "-.",    // N
    "---",   // O
    ".--.",  // P
    "--.-",  // Q
    ".-.",   // R
    "...",   // S
    "-",     // T
    "..-",   // U
    "...-",  // V
    ".--",   // W
    "-..-",  // X
    "-.--",  // Y
    "--..",  // Z
];

const other = [
    { c: '.', morse: ".-.-.-" },
    { c: ',', morse: "--..--" },
    { c: ':', morse: "---..." },
    { c: '?', morse: "..--.." },
    { c: "'", morse: ".----." },
    { c: '-', morse: "-....-" },
    { c: '/', morse: "-..-." },
    { c: '(', morse: "-.--." },
    { c: ')', morse: "-.--.-" },
    { c: '"', morse: ".-..-." },
    { c: '=', morse: "-...-" },
    { c: '+', morse: ".-.-." },
];

/**
 * Encode a character to Morse code
 * @param {string} c - Character to encode
 * @returns {string} Morse code representation, or empty string if not found
 */
export function encodeChar(c) {
    const upper = c.toUpperCase();

    if (upper >= 'A' && upper <= 'Z') {
        return alph[upper.charCodeAt(0) - 'A'.charCodeAt(0)];
    } else if (c >= '0' && c <= '9') {
        return digit[c.charCodeAt(0) - '0'.charCodeAt(0)];
    } else if (c === ' ' || c === '\n') {
        return ""; // Word separator
    } else {
        for (const p of other) {
            if (p.c === c) {
                return p.morse;
            }
        }
    }
    return "";
}

/**
 * Decode Morse code to character
 * @param {string} morse - Morse code (e.g., ".-" or "---")
 * @returns {string} Decoded character, or 'x' if not found
 */
export function decodeChar(morse) {
    // Check digits
    for (let i = 0; i < 10; i++) {
        if (digit[i] === morse) {
            return String.fromCharCode('0'.charCodeAt(0) + i);
        }
    }

    // Check alphabet
    for (let i = 0; i < 26; i++) {
        if (alph[i] === morse) {
            return String.fromCharCode('A'.charCodeAt(0) + i);
        }
    }

    // Check punctuation
    for (const p of other) {
        if (p.morse === morse) {
            return p.c;
        }
    }

    // Special: end of message
    if (morse === "...-.-") {
        return ""; // SK - silent key (end of transmission)
    }

    // Unknown
    return 'x';
}

/**
 * Encode text to Morse code
 * @param {string} text - Input text
 * @param {boolean} symbols - If true, use symbols (.- ), else use words (dit/daw)
 * @returns {string[]} Array of lines (one per character)
 */
export function encode(text, symbols = true) {
    const lines = [];

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const morse = encodeChar(c);

        if (morse === "") {
            if (c === ' ' || c === '\n') {
                lines.push(""); // Word separator
            }
            continue;
        }

        if (symbols) {
            lines.push(` ${morse}`);
        } else {
            const words = [];
            for (const sym of morse) {
                words.push(sym === '.' ? 'dit' : 'daw');
            }
            lines.push(` ${words.join(' ')}`);
        }
    }

    // Add end of transmission marker
    if (symbols) {
        lines.push(' ...-.-');
    } else {
        lines.push(' dit dit dit daw dit daw');
    }

    return lines;
}

/**
 * Decode Morse code to text
 * @param {string} morse - Morse code input (can contain . - and spaces)
 * @returns {string} Decoded text
 */
export function decode(morse) {
    let result = '';
    let currentCode = '';
    let wasSpace = false;

    for (let i = 0; i < morse.length; i++) {
        const c = morse[i];

        if (c === '.' || c === '-') {
            currentCode += c;
            wasSpace = false;
        } else if (c === ' ' || c === '\t' || c === '\n') {
            if (currentCode.length > 0) {
                const decoded = decodeChar(currentCode);
                if (decoded !== '') {
                    result += decoded;
                }
                currentCode = '';
            }

            if (wasSpace) {
                result += ' '; // Double space = word separator
            }
            wasSpace = true;
        }
    }

    // Decode any remaining code
    if (currentCode.length > 0) {
        const decoded = decodeChar(currentCode);
        if (decoded !== '') {
            result += decoded;
        }
    }

    return result;
}
