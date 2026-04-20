/**
 * Data loader - loads glorkz.json into game state
 */

export async function loadGameData(state) {
    const response = await fetch('./js/adventure/glorkz.json');
    const data = await response.json();

    // Load long descriptions
    state.ltext = [];
    for (const [key, value] of Object.entries(data.long_descriptions)) {
        const idx = parseInt(key);
        state.ltext[idx] = {
            seekadr: value,
            txtlen: value.length
        };
    }

    // Load short descriptions
    state.stext = [];
    for (const [key, value] of Object.entries(data.short_descriptions)) {
        const idx = parseInt(key);
        state.stext[idx] = {
            seekadr: value,
            txtlen: value.length
        };
    }

    // Load random messages
    state.rtext = [];
    for (const [key, value] of Object.entries(data.random_messages)) {
        const idx = parseInt(key);
        state.rtext[idx] = {
            seekadr: value,
            txtlen: value.length
        };
    }

    // Load magic messages
    state.mtext = [];
    for (const [key, value] of Object.entries(data.magic_messages)) {
        const idx = parseInt(key);
        state.mtext[idx] = {
            seekadr: value,
            txtlen: value.length
        };
    }

    // Load class messages
    state.ctext = [];
    state.cval = [];
    state.clsses = 0;
    for (const [key, value] of Object.entries(data.class_messages)) {
        const idx = parseInt(key);
        state.ctext[state.clsses] = {
            seekadr: value,
            txtlen: value.length
        };
        state.cval[state.clsses] = idx;
        state.clsses++;
    }

    // Load object descriptions
    state.ptext = [];
    for (const [key, objData] of Object.entries(data.object_descriptions)) {
        const idx = parseInt(key);
        // Reconstruct the text with property markers
        const lines = [];
        // Add name as first line with -1 marker (for inventory display)
        lines.push(`-1\t${objData.name}`);
        for (const [propKey, propValue] of Object.entries(objData.properties)) {
            // Add property lines with their markers
            const propLines = propValue.split('\n');
            for (const line of propLines) {
                lines.push(`${propKey}\t${line}`);
            }
        }
        const fullText = lines.join('\n');
        state.ptext[idx] = {
            seekadr: fullText,
            txtlen: fullText.length
        };
    }

    // Load travel table
    state.travel = [];
    for (const [key, entries] of Object.entries(data.travel)) {
        const loc = parseInt(key);
        state.travel[loc] = null;
        let lastEntry = null;

        for (const entry of entries) {
            const travelEntry = {
                conditions: entry.conditions,
                tloc: entry.dest,
                tverb: entry.verb,
                next: null
            };

            if (lastEntry === null) {
                state.travel[loc] = travelEntry;
            } else {
                lastEntry.next = travelEntry;
            }
            lastEntry = travelEntry;
        }
    }

    // Load vocabulary into hash table
    for (const [key, words] of Object.entries(data.vocabulary)) {
        const value = parseInt(key);
        for (const word of words) {
            vocabStore(state, word, value);
        }
    }

    // Load object locations
    for (const [key, locData] of Object.entries(data.object_locations)) {
        const obj = parseInt(key);
        state.plac[obj] = locData.location;
        state.fixd[obj] = locData.fixed;
    }

    // Load action defaults
    for (const [key, message] of Object.entries(data.action_defaults)) {
        const verb = parseInt(key);
        state.actspk[verb] = message;
    }

    // Load liquid assets (condition bits)
    for (const liquid of data.liquid_assets) {
        for (const loc of liquid.locations) {
            state.cond[loc] |= state.setbit[liquid.bit];
        }
    }

    // Load hints
    state.hntmax = 0;
    for (const [key, values] of Object.entries(data.hints)) {
        const hintnum = parseInt(key);
        for (let i = 0; i < 5 && i < values.length; i++) {
            state.hints[hintnum][i] = values[i];
        }
        if (hintnum > state.hntmax) {
            state.hntmax = hintnum;
        }
    }
}

/**
 * Store word in hash table (from vocab.c)
 */
function vocabStore(state, word, value) {
    // Hash function from C
    let hash = 0;
    for (let i = 0; i < 5 && i < word.length; i++) {
        hash += word.charCodeAt(i);
    }
    hash = (hash * 3719) & 0x7FFF;
    hash %= 512; // HTSIZE

    let adr = hash;
    let attempts = 0;

    while (attempts < 512) {
        const h = state.voc[adr];
        if (h.val === 0) {
            // Empty slot - store here
            h.val = value;
            h.atab = word;
            return;
        }
        if (h.atab === word) {
            // Already stored
            return;
        }

        // Linear probing
        adr = (adr + 1) % 512;
        if (adr === hash) {
            throw new Error('Hash table overflow');
        }
        attempts++;
    }

    throw new Error('Hash table full');
}
