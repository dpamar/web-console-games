/**
 * Pig Latin converter
 * Ported from BSD games pig.c
 */

/**
 * Convert a word to Pig Latin
 */
export function pigout(buf) {
    const len = buf.length;
    if (len === 0) return '';

    // See if the word is all upper case
    let allupper = buf[0] === buf[0].toUpperCase() && buf[0] !== buf[0].toLowerCase();
    const firstupper = allupper;
    for (let i = 1; i < len && allupper; i++) {
        allupper = allupper && (buf[i] === buf[i].toUpperCase() && buf[i] !== buf[i].toLowerCase());
    }

    /*
     * If the word starts with a vowel, append "way".  Don't treat 'y'
     * as a vowel if it appears first.
     */
    if ('aeiouAEIOU'.indexOf(buf[0]) !== -1) {
        return buf + (allupper ? 'WAY' : 'way');
    }

    /*
     * Copy leading consonants to the end of the word.  The unit "qu"
     * isn't treated as a vowel.
     */
    const chars = buf.split('');
    if (!allupper) {
        chars[0] = chars[0].toLowerCase();
    }

    let start = 0;
    const olen = len;

    // Move consonants to end
    while (!('aeiouyAEIOUY'.indexOf(chars[start]) !== -1) && start < olen) {
        const ch = chars[start];
        chars.push(ch);
        start++;

        // Handle "qu" as a unit
        if ((ch === 'q' || ch === 'Q') && start < olen &&
            (chars[start] === 'u' || chars[start] === 'U')) {
            chars.push(chars[start]);
            start++;
        }
    }

    // Capitalize first letter if original was capitalized
    if (firstupper && start < chars.length) {
        chars[start] = chars[start].toUpperCase();
    }

    // Return the transformed word
    return chars.slice(start, start + olen).join('') + (allupper ? 'AY' : 'ay');
}

/**
 * Convert text to Pig Latin
 */
export function convertText(text) {
    let result = '';
    let word = '';

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
            word += ch;
        } else {
            if (word.length > 0) {
                result += pigout(word);
                word = '';
            }
            result += ch;
        }
    }

    // Handle last word if any
    if (word.length > 0) {
        result += pigout(word);
    }

    return result;
}
