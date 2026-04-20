/**
 * Termination routines - faithful port from done.c
 */

import { ConsoleLine } from '../ui/ConsoleLine.js';
import { rspeak, mspeak, speak, yes } from './io.js';
import { toting, here } from './subr.js';
import { drop } from './vocab.js';

/**
 * score - calculate final score (from 20000 in main.c)
 * Returns score and sets state.mxscor
 */
export function score(state) {
    let scor = 0;
    state.mxscor = 0;

    for (let i = 50; i <= state.maxtrs; i++) {
        if (!state.ptext[i] || state.ptext[i].txtlen === 0) {
            continue;
        }
        state.k = 12;
        if (i === state.chest) {
            state.k = 14;
        }
        if (i > state.chest) {
            state.k = 16;
        }
        if (state.prop[i] >= 0) {
            scor += 2;
        }
        if (state.place[i] === 3 && state.prop[i] === 0) {
            scor += state.k - 2;
        }
        state.mxscor += state.k;
    }

    scor += (state.maxdie - state.numdie) * 10;
    state.mxscor += state.maxdie * 10;

    if (!(state.scorng || state.gaveup)) {
        scor += 4;
    }
    state.mxscor += 4;

    if (state.dflag !== 0) {
        scor += 25;
    }
    state.mxscor += 25;

    if (state.closng) {
        scor += 25;
    }
    state.mxscor += 25;

    if (state.closed) {
        if (state.bonus === 0) {
            scor += 10;
        }
        if (state.bonus === 135) {
            scor += 25;
        }
        if (state.bonus === 134) {
            scor += 30;
        }
        if (state.bonus === 133) {
            scor += 45;
        }
    }
    state.mxscor += 45;

    if (state.place[state.magzin] === 108) {
        scor++;
    }
    state.mxscor++;

    scor += 2;
    state.mxscor += 2;

    for (let i = 1; i <= state.hntmax; i++) {
        if (state.hinted[i]) {
            scor -= state.hints[i][2];
        }
    }

    return scor;
}

/**
 * done - game over
 * entry=1 means goto 13000 (gave up)
 * entry=2 means goto 20000 (score)
 * entry=3 means 19000 (died in closing)
 */
export function done(state, entry) {
    if (entry === 1) {
        mspeak(state, 1);
    }
    if (entry === 3) {
        rspeak(state, 136);
    }

    const sc = score(state);
    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayText(`You scored ${sc} out of a possible ${state.mxscor} using ${state.turns} turns.`);

    for (let i = 0; i < state.clsses; i++) {
        if (state.cval[i] >= sc) {
            speak(state, state.ctext[i]);
            if (i === state.clsses - 1) {
                ConsoleLine.displayText('To achieve the next higher rating would be a neat trick!');
                ConsoleLine.displayEmptyLine();
                ConsoleLine.displayText('Congratulations!!');
                state.gaveup = true; // Signal to exit
                return;
            }
            state.k = state.cval[i] + 1 - sc;
            ConsoleLine.displayText(`To achieve the next higher rating, you need ${state.k} more point${state.k === 1 ? '' : 's'}.`);
            state.gaveup = true; // Signal to exit
            return;
        }
    }

    ConsoleLine.displayText('You just went off my scale!!!');
    state.gaveup = true; // Signal to exit
}

/**
 * die - handle death (from label 90 in main.c)
 * Returns true if game should continue, false if game over
 */
export async function die(state, entry) {
    if (entry !== 99) {
        rspeak(state, 23);
        state.oldlc2 = state.loc;
    }

    if (state.closng) { // 99
        rspeak(state, 131);
        state.numdie++;
        done(state, 2);
        return false;
    }

    const yea = await yes(state, 81 + state.numdie * 2, 82 + state.numdie * 2, 54);
    state.numdie++;

    if (state.numdie === state.maxdie || !yea) {
        done(state, 2);
        return false;
    }

    state.place[state.water] = 0;
    state.place[state.oil] = 0;
    if (toting(state, state.lamp)) {
        state.prop[state.lamp] = 0;
    }

    for (let i = 100; i >= 1; i--) {
        if (!toting(state, i)) {
            continue;
        }
        state.k = state.oldlc2;
        if (i === state.lamp) {
            state.k = 1;
        }
        drop(state, i, state.k);
    }

    state.loc = 3;
    state.oldloc = state.loc;
    return true;
}
