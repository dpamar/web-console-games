/**
 * Initialization - faithful port from init.c
 */

import { vocab, drop } from './vocab.js';

/**
 * linkdata - secondary data manipulation (from init.c)
 */
function linkdata(state) {
    // Array linkages
    for (let i = 1; i <= 140; i++) { // LOCSIZ
        if (state.ltext[i] && state.ltext[i].seekadr && state.travel[i]) {
            if (state.travel[i].tverb === 1) {
                state.cond[i] = 2;
            }
        }
    }

    // Drop fixed objects
    for (let j = 100; j > 0; j--) {
        if (state.fixd[j] > 0) {
            drop(state, j + 100, state.fixd[j]);
            drop(state, j, state.plac[j]);
        }
    }

    for (let j = 100; j > 0; j--) {
        state.fixed[j] = state.fixd[j];
        if (state.plac[j] !== 0 && state.fixd[j] <= 0) {
            drop(state, j, state.plac[j]);
        }
    }

    state.maxtrs = 79;
    state.tally = 0;
    state.tally2 = 0;

    for (let i = 50; i <= state.maxtrs; i++) {
        if (state.ptext[i] && state.ptext[i].seekadr) {
            state.prop[i] = -1;
        }
        state.tally -= state.prop[i];
    }

    // Define mnemonics - words are stored directly in JSON, no DECR needed
    state.keys = vocab(state, 'keys', 1, 0);
    state.lamp = vocab(state, 'lamp', 1, 0);
    state.grate = vocab(state, 'grate', 1, 0);
    state.cage = vocab(state, 'cage', 1, 0);
    state.rod = vocab(state, 'rod', 1, 0);
    state.rod2 = state.rod + 1;
    state.steps = vocab(state, 'steps', 1, 0);
    state.bird = vocab(state, 'bird', 1, 0);
    state.door = vocab(state, 'door', 1, 0);
    state.pillow = vocab(state, 'pillo', 1, 0);
    state.snake = vocab(state, 'snake', 1, 0);
    state.fissur = vocab(state, 'fissu', 1, 0);
    state.tablet = vocab(state, 'table', 1, 0);
    state.clam = vocab(state, 'clam', 1, 0);
    state.oyster = vocab(state, 'oyste', 1, 0);
    state.magzin = vocab(state, 'magaz', 1, 0);
    state.dwarf = vocab(state, 'dwarf', 1, 0);
    state.knife = vocab(state, 'knife', 1, 0);
    state.food = vocab(state, 'food', 1, 0);
    state.bottle = vocab(state, 'bottl', 1, 0);
    state.water = vocab(state, 'water', 1, 0);
    state.oil = vocab(state, 'oil', 1, 0);
    state.plant = vocab(state, 'plant', 1, 0);
    state.plant2 = state.plant + 1;
    state.axe = vocab(state, 'axe', 1, 0);
    state.mirror = vocab(state, 'mirro', 1, 0);
    state.dragon = vocab(state, 'drago', 1, 0);
    state.chasm = vocab(state, 'chasm', 1, 0);
    state.troll = vocab(state, 'troll', 1, 0);
    state.troll2 = state.troll + 1;
    state.bear = vocab(state, 'bear', 1, 0);
    state.messag = vocab(state, 'messa', 1, 0);
    state.vend = vocab(state, 'vendi', 1, 0);
    state.batter = vocab(state, 'batte', 1, 0);
    state.nugget = vocab(state, 'gold', 1, 0);
    state.coins = vocab(state, 'coins', 1, 0);
    state.chest = vocab(state, 'chest', 1, 0);
    state.eggs = vocab(state, 'eggs', 1, 0);
    state.tridnt = vocab(state, 'tride', 1, 0);
    state.vase = vocab(state, 'vase', 1, 0);
    state.emrald = vocab(state, 'emera', 1, 0);
    state.pyram = vocab(state, 'pyram', 1, 0);
    state.pearl = vocab(state, 'pearl', 1, 0);
    state.rug = vocab(state, 'rug', 1, 0);
    state.chain = vocab(state, 'chain', 1, 0);
    state.spices = vocab(state, 'spice', 1, 0);

    state.back = vocab(state, 'back', 0, 0);
    state.look = vocab(state, 'look', 0, 0);
    state.cave = vocab(state, 'cave', 0, 0);
    state.null = vocab(state, 'null', 0, 0);
    state.entrnc = vocab(state, 'entra', 0, 0);
    state.dprssn = vocab(state, 'depre', 0, 0);
    state.enter = vocab(state, 'enter', 0, 0);
    state.stream = vocab(state, 'strea', 0, 0);

    state.pour = vocab(state, 'pour', 2, 0);
    state.say = vocab(state, 'say', 2, 0);
    state.lock = vocab(state, 'lock', 2, 0);
    state.throw = vocab(state, 'throw', 2, 0);
    state.find = vocab(state, 'find', 2, 0);
    state.invent = vocab(state, 'inven', 2, 0);

    // Initialize dwarves
    state.chloc = 114;
    state.chloc2 = 140;
    for (let i = 1; i <= 6; i++) {
        state.dseen[i] = false;
    }
    state.dflag = 0;
    state.dloc[1] = 19;
    state.dloc[2] = 27;
    state.dloc[3] = 33;
    state.dloc[4] = 44;
    state.dloc[5] = 64;
    state.dloc[6] = state.chloc;
    state.daltlc = 18;

    // Random flags & counters
    state.turns = 0;
    state.lmwarn = false;
    state.iwest = 0;
    state.knfloc = 0;
    state.detail = 0;
    state.abbnum = 5;

    // Calculate maxdie
    for (let i = 0; i <= 4; i++) {
        if (state.rtext[2 * i + 81] && state.rtext[2 * i + 81].seekadr) {
            state.maxdie = i + 1;
        }
    }

    state.numdie = 0;
    state.holdng = 0;
    state.dkill = 0;
    state.foobar = 0;
    state.bonus = 0;
    state.clock1 = 30;
    state.clock2 = 50;
    state.saved = -1;
    state.closng = false;
    state.panic = false;
    state.closed = false;
    state.scorng = false;
}

/**
 * init - main initialization (from init.c)
 */
export function init(state) {
    // Data is already loaded from JSON by loader.js
    linkdata(state);
    // poof() is not needed - we don't use encrypted data file
}
