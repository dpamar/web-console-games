/**
 * Vocabulary functions - faithful port from vocab.c
 * Data is loaded from JSON (no encryption)
 */

/**
 * vocab - look up word in vocabulary
 * @param {GameState} state - game state
 * @param {string} word - word to look up
 * @param {number} type - 0=motion, 1=object, 2=action verb, -1=any
 * @param {number} value - unused
 * @returns {number} - word value or -1 if not found
 */
export function vocab(state, word, type, value) {
    // Ensure word is at most 5 characters
    const w = word.substring(0, 5).toLowerCase();

    // Hash function (same as C)
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
        hash += w.charCodeAt(i);
    }
    hash = (hash * 3719) & 0x7FFF;
    hash %= 512; // HTSIZE

    let adr = hash;
    const startAdr = hash;

    while (true) {
        const h = state.voc[adr];

        if (h.val === 0) {
            // Empty slot - word not found
            return -1;
        }

        if (weq(w, h.atab)) {
            // Found the word
            const val = h.val;
            const wordType = Math.floor(val / 1000);
            const wordValue = val % 1000;

            if (type === -1) {
                // Any type
                return val;
            } else if (wordType === type) {
                // Matching type
                return wordValue;
            }
            // Type mismatch - keep searching for same word with different type
        }

        // Linear probing
        adr = (adr + 1) % 512;

        if (adr === startAdr) {
            // Wrapped around completely
            return -1;
        }
    }
}

/**
 * weq - compare first 5 characters of words
 */
export function weq(w1, w2) {
    const s1 = w1.substring(0, 5).toLowerCase();
    const s2 = w2.substring(0, 5).toLowerCase();
    return s1 === s2;
}

/**
 * drop - place object at location (from vocab.c)
 */
export function drop(state, obj, where) {
    if (obj > 100) {
        // Fixed object
        state.fixed[obj - 100] = where;
    } else {
        // Movable object
        if (state.place[obj] === -1) {
            state.holdng--;
        }
        state.place[obj] = where;
    }

    // Link into location's object list
    if (where <= 0) {
        return;
    }

    // Add to head of list at location
    state.links[obj] = state.atloc[where];
    state.atloc[where] = obj;
}

/**
 * carry - pick up object (from vocab.c)
 */
export function carry(state, obj, where) {
    if (obj <= 100) {
        // Remove from current location
        if (state.place[obj] === -1) {
            // Already carrying
            return;
        }

        state.place[obj] = -1;
        state.holdng++;
    }

    // Remove from linked list at 'where'
    if (state.atloc[where] === obj) {
        state.atloc[where] = state.links[obj];
        return;
    }
    let temp = state.atloc[where];
    while (temp !== 0 && state.links[temp] !== obj) {
        temp = state.links[temp];
    }
    if (temp !== 0) {
        state.links[temp] = state.links[obj];
    }
}

/**
 * move - move object to new location (from vocab.c)
 */
export function move(state, obj, where) {
    const from = (obj < 100) ? state.place[obj] : state.fixed[obj - 100];

    if (from > 0 && from <= 300) {
        carry(state, obj, from);
    }

    drop(state, obj, where);
}

/**
 * put - synonym for move (from vocab.c)
 */
export function put(state, obj, where, pval) {
    move(state, obj, where);
    return -1 - pval;
}

/**
 * dstroy - destroy object (from vocab.c)
 */
export function dstroy(state, obj) {
    move(state, obj, 0);
}

/**
 * juggle - swap object locations (from vocab.c)
 */
export function juggle(state, obj) {
    const i = state.place[obj];
    const j = state.fixed[obj];
    move(state, obj, i);
    move(state, obj + 100, j);
}
