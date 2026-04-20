/**
 * PPT - Paper tape converter
 * Ported from NetBSD bsd-games
 *
 * Converts text to/from ASCII art representation of punched paper tape.
 */

const EDGE = '___________';

/**
 * Convert a character to paper tape representation
 * Each line represents one byte with 8 bits
 * The '.' in the middle is the feed hole (always present)
 * 'o' represents a punched hole, ' ' represents no hole
 *
 * @param {number} c - Character code (0-255)
 * @returns {string} One line of paper tape
 */
export function putppt(c) {
    let line = '|';

    for (let i = 7; i >= 0; i--) {
        if (i === 2) {
            line += '.';  // feed hole
        }
        if ((c & (1 << i)) !== 0) {
            line += 'o';
        } else {
            line += ' ';
        }
    }

    line += '|';
    return line;
}

/**
 * Convert paper tape line back to character
 * Looks for the feed hole '.' and reads the 8 bit positions around it
 *
 * @param {string} buf - One line of paper tape
 * @returns {number} Character code, or -1 if invalid
 */
export function getppt(buf) {
    // Find the feed hole
    const dotPos = buf.indexOf('.');
    if (dotPos === -1) {
        return -1;
    }

    let c = 0;

    // Read bits relative to the feed hole (at position 2 when counting from right)
    // bit 0 (rightmost): position +3
    if (dotPos + 3 < buf.length && buf[dotPos + 3] !== ' ') {
        c |= 0x01;
    }
    // bit 1: position +2
    if (dotPos + 2 < buf.length && buf[dotPos + 2] !== ' ') {
        c |= 0x02;
    }
    // bit 2: position +1
    if (dotPos + 1 < buf.length && buf[dotPos + 1] !== ' ') {
        c |= 0x04;
    }
    // bit 3: position -1 (feed hole at 0)
    if (dotPos - 1 >= 0 && buf[dotPos - 1] !== ' ') {
        c |= 0x08;
    }
    // bit 4: position -2
    if (dotPos - 2 >= 0 && buf[dotPos - 2] !== ' ') {
        c |= 0x10;
    }
    // bit 5: position -3
    if (dotPos - 3 >= 0 && buf[dotPos - 3] !== ' ') {
        c |= 0x20;
    }
    // bit 6: position -4
    if (dotPos - 4 >= 0 && buf[dotPos - 4] !== ' ') {
        c |= 0x40;
    }
    // bit 7 (leftmost): position -5
    if (dotPos - 5 >= 0 && buf[dotPos - 5] !== ' ') {
        c |= 0x80;
    }

    return c;
}

/**
 * Encode a string to paper tape format
 * @param {string} text - Input text
 * @returns {string} Paper tape representation
 */
export function encode(text) {
    const lines = [EDGE];

    for (let i = 0; i < text.length; i++) {
        lines.push(putppt(text.charCodeAt(i)));
    }

    lines.push(EDGE);
    return lines.join('\n');
}

/**
 * Decode paper tape format back to text
 * @param {string} tape - Paper tape representation (multiple lines)
 * @returns {string} Decoded text
 */
export function decode(tape) {
    const lines = tape.split('\n');
    let result = '';
    let started = false;

    for (const line of lines) {
        const c = getppt(line);
        if (c < 0) {
            if (started) {
                // Lost sync or end of tape
                break;
            } else {
                // Not started yet (probably edge line)
                continue;
            }
        }
        started = true;
        result += String.fromCharCode(c);
    }

    return result;
}
