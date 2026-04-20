/**
 * Subroutines - faithful port from subr.c
 * Helper functions used by main game loop
 */

import { rspeak, pspeak, getin, yes } from './io.js';
import { vocab, move, carry, drop, dstroy, juggle, weq, put } from './vocab.js';
import { ran as randomRan } from './random.js';

/**
 * Statement functions
 */

/**
 * toting - is player carrying object?
 */
export function toting(state, objj) {
    return state.place[objj] === -1;
}

/**
 * here - is object at current location or being carried?
 */
export function here(state, objj) {
    return state.place[objj] === state.loc || toting(state, objj);
}

/**
 * at - is object at current location (fixed or movable)?
 */
export function at(state, objj) {
    return state.place[objj] === state.loc || state.fixed[objj] === state.loc;
}

/**
 * liq2 - helper for liq()
 */
function liq2(state, pbotl) {
    return (1 - pbotl) * state.water + Math.floor(pbotl / 2) * (state.water + state.oil);
}

/**
 * liq - what liquid is in bottle?
 */
export function liq(state) {
    const i = state.prop[state.bottle];
    if (i > -1 - i) {
        return liq2(state, i);
    } else {
        return liq2(state, -1 - i);
    }
}

/**
 * liqloc - what liquid is at location?
 */
export function liqloc(state, locc) {
    const i = Math.floor(state.cond[locc] / 2);
    const j = ((i * 2) % 8) - 5;
    const l = Math.floor(state.cond[locc] / 4) % 2;
    return liq2(state, j * l + 1);
}

/**
 * bitset - is bit n set in cond[l]?
 */
export function bitset(state, l, n) {
    return (state.cond[l] & state.setbit[n]) !== 0;
}

/**
 * forced - is location forced?
 */
export function forced(state, locc) {
    return state.cond[locc] === 2;
}

/**
 * dark - is it dark at current location?
 */
export function dark(state) {
    return (state.cond[state.loc] % 2) === 0 &&
           (state.prop[state.lamp] === 0 || !here(state, state.lamp));
}

/**
 * pct - random percentage check
 */
export function pct(state, n) {
    return ran(100) < n;
}

/**
 * ran - random number from 0 to n-1
 */
function ran(n) {
    return randomRan(n);
}

/**
 * fdwarf - handle dwarf stuff (from 71 in main.c)
 * Returns: 2000 = continue, 99 = death
 */
export async function fdwarf(state) {
    // Check if blocked by dwarf
    if (state.newloc !== state.loc && !forced(state, state.loc) && !bitset(state, state.loc, 3)) {
        for (let i = 1; i <= 5; i++) {
            if (state.odloc[i] !== state.newloc || !state.dseen[i]) {
                continue;
            }
            state.newloc = state.loc;
            rspeak(state, 2);
            break;
        }
    }

    state.loc = state.newloc; // 74

    if (state.loc === 0 || forced(state, state.loc) || bitset(state, state.newloc, 3)) {
        return 2000;
    }

    // First time in deep cave?
    if (state.dflag === 0) {
        if (state.loc >= 15) {
            state.dflag = 1;
        }
        return 2000;
    }

    // 6000: activate dwarves
    if (state.dflag === 1) {
        if (state.loc < 15 || pct(state, 95)) {
            return 2000;
        }
        state.dflag = 2;
        for (let i = 1; i <= 2; i++) {
            const j = 1 + ran(5);
            if (pct(state, 50) && state.saved === -1) {
                state.dloc[j] = 0; // 6001
            }
        }
        for (let i = 1; i <= 5; i++) {
            if (state.dloc[i] === state.loc) {
                state.dloc[i] = state.daltlc;
            }
            state.odloc[i] = state.dloc[i]; // 6002
        }
        rspeak(state, 3);
        drop(state, state.axe, state.loc);
        return 2000;
    }

    // 6010: move dwarves
    state.dtotal = 0;
    state.attack = 0;
    state.stick = 0;

    for (let i = 1; i <= 6; i++) { // loop to 6030
        if (state.dloc[i] === 0) {
            continue;
        }

        // Build valid destination list
        let j = 1;
        for (let kk = state.travel[state.dloc[i]]; kk !== null; kk = kk.next) {
            const newloc = kk.tloc;
            if (newloc > 300 || newloc < 15 || newloc === state.odloc[i] ||
                (j > 1 && newloc === state.tk[j - 1]) || j >= 20 ||
                newloc === state.dloc[i] || forced(state, newloc) ||
                (i === 6 && bitset(state, newloc, 3)) ||
                kk.conditions === 100) {
                continue;
            }
            state.tk[j++] = newloc;
        }

        state.tk[j] = state.odloc[i]; // 6016
        if (j >= 2) {
            j--;
        }
        j = 1 + ran(j);
        state.odloc[i] = state.dloc[i];
        state.dloc[i] = state.tk[j];
        state.dseen[i] = (state.dseen[i] && state.loc >= 15) ||
                         (state.dloc[i] === state.loc || state.odloc[i] === state.loc);

        if (!state.dseen[i]) {
            continue; // goto 6030
        }

        state.dloc[i] = state.loc;

        // Pirate special behavior
        if (i === 6) {
            if (state.loc === state.chloc || state.prop[state.chest] >= 0) {
                continue;
            }

            let k = 0;
            // Check for treasures (6020)
            for (let j = 50; j <= state.maxtrs; j++) {
                if (j === state.pyram && (state.loc === state.plac[state.pyram] ||
                    state.loc === state.plac[state.emrald])) {
                    // l6020: check if here
                    if (here(state, j)) {
                        k = 1;
                    }
                    continue;
                }
                if (toting(state, j)) {
                    // l6022: steal treasures
                    rspeak(state, 128);
                    if (state.place[state.messag] === 0) {
                        move(state, state.chest, state.chloc);
                    }
                    move(state, state.messag, state.chloc2);
                    for (let jj = 50; jj <= state.maxtrs; jj++) {
                        if (jj === state.pyram && (state.loc === state.plac[state.pyram] ||
                            state.loc === state.plac[state.emrald])) {
                            continue;
                        }
                        if (at(state, jj) && state.fixed[jj] === 0) {
                            carry(state, jj, state.loc);
                        }
                        if (toting(state, jj)) {
                            drop(state, jj, state.chloc);
                        }
                    }
                    // l6024
                    state.dloc[6] = state.odloc[6] = state.chloc;
                    state.dseen[6] = false;
                    continue;
                }
                // Check if treasure is here
                if (here(state, j)) {
                    k = 1;
                }
            }

            // l6025: chest placement
            if (state.tally === state.tally2 + 1 && k === 0 &&
                state.place[state.chest] === 0 && here(state, state.lamp) &&
                state.prop[state.lamp] === 1) {
                rspeak(state, 186);
                move(state, state.chest, state.chloc);
                move(state, state.messag, state.chloc2);
                state.dloc[6] = state.odloc[6] = state.chloc;
                state.dseen[6] = false;
                continue;
            }

            if (state.odloc[6] !== state.dloc[6] && pct(state, 20)) {
                rspeak(state, 127);
            }
            continue;
        }

        // 6027: normal dwarf
        state.dtotal++;
        if (state.odloc[i] !== state.dloc[i]) {
            continue;
        }
        state.attack++;
        if (state.knfloc >= 0) {
            state.knfloc = state.loc;
        }
        if (ran(1000) < 95 * (state.dflag - 2)) {
            state.stick++;
        }
    } // 6030

    if (state.dtotal === 0) {
        return 2000;
    }

    // Report dwarf presence
    if (state.dtotal !== 1) {
        console.log(`There are ${state.dtotal} threatening little dwarves in the room with you.`);
    } else {
        rspeak(state, 4);
    }

    if (state.attack === 0) {
        return 2000;
    }

    if (state.dflag === 2) {
        state.dflag = 3;
    }
    if (state.saved !== -1) {
        state.dflag = 20;
    }

    // l82: report attacks
    if (state.attack !== 1) {
        console.log(`${state.attack} of them throw knives at you!`);
        state.k = 6;
    } else {
        rspeak(state, 5);
        state.k = 52;
    }

    if (state.stick <= 1) {
        rspeak(state, state.k + state.stick);
        if (state.stick === 0) {
            return 2000;
        }
    } else {
        console.log(`${state.stick} of them get you!`);
    }

    state.oldlc2 = state.loc;
    return 99;
}

/**
 * march - handle movement (from label 8 in main.c)
 * Returns: 2 = continue at label 2, 8 = goto label 8, 9 = continue at label 9, 99 = death
 */
/**
 * march - handle movement (from label 8 in main.c)
 * Returns: 2 = continue at label 2, 99 = death
 */
export function march(state) {
    console.log(`[DEBUG march] loc=${state.loc}, k=${state.k}, looking for verb`);
    state.tkk = state.travel[state.newloc = state.loc];
    if (state.tkk === null) {
        bug(26);
    }

    if (state.k === state.null) {
        return 2;
    }

    if (state.k === state.cave) { // 40
        if (state.loc < 8) {
            rspeak(state, 57);
        }
        if (state.loc >= 8) {
            rspeak(state, 58);
        }
        return 2;
    }

    if (state.k === state.look) { // 30
        if (state.detail++ < 3) {
            rspeak(state, 15);
        }
        state.wzdark = false;
        state.abb[state.loc] = 0;
        return 2;
    }

    if (state.k === state.back) { // 20
        const result = mback(state);
        if (result === 2) {
            return 2;
        } else if (result === 9) {
            return march_l9(state); // goto l9
        } else {
            bug(100);
        }
    }

    state.oldlc2 = state.oldloc;
    state.oldloc = state.loc;
    return march_l9(state);
}

/**
 * march_l9 - search for matching travel entry
 */
function march_l9(state) {
    console.log(`[DEBUG march l9] Searching for verb ${state.k} in travel table`);
    for (; state.tkk !== null; state.tkk = state.tkk.next) {
        console.log(`[DEBUG march l9] Checking travel entry: verb=${state.tkk.tverb}, dest=${state.tkk.tloc}, cond=${state.tkk.conditions}`);
        if (state.tkk.tverb === 1 || state.tkk.tverb === state.k) {
            console.log(`[DEBUG march l9] MATCH FOUND!`);
            break;
        }
    }

    if (state.tkk === null) {
        console.log(`[DEBUG march l9] NO MATCH - calling badmove`);
        badmove(state);
        return 2;
    }

    return march_l11(state);
}

/**
 * march_l11 - process travel entry
 */
function march_l11(state) {
    const ll1 = state.tkk.conditions;
    const ll2 = state.tkk.tloc;
    state.newloc = ll1; // newloc = conditions
    const k = state.newloc % 100; // k used for prob

    if (state.newloc <= 300) {
        if (state.newloc <= 100) { // 13
            if (state.newloc !== 0 && !pct(state, state.newloc)) {
                return march_l12(state, ll1, ll2); // 14 - goto l12
            }
            return march_l16(state, ll2, k); // fall through to l16
        }
        if (toting(state, k) || (state.newloc > 200 && at(state, k))) {
            return march_l16(state, ll2, k); // goto l16
        }
        return march_l12(state, ll1, ll2); // goto l12
    }

    if (state.prop[k] !== Math.floor(state.newloc / 100) - 3) {
        return march_l16(state, ll2, k); // goto l16
    }

    return march_l12(state, ll1, ll2); // goto l12
}

/**
 * march_l16 - finalize movement (newloc = location)
 */
function march_l16(state, ll2, k) {
    state.newloc = ll2; // newloc = location

    if (state.newloc <= 300) {
        return 2;
    }

    if (state.newloc <= 500) {
        const specialResult = specials(state);
        if (specialResult === 2) {
            return 2;
        } else if (specialResult === 12) {
            // Reconstruct ll1 from conditions - need to get it from tkk
            const ll1 = state.tkk.conditions;
            return march_l12(state, ll1, ll2); // goto l12
        } else if (specialResult === 99) {
            return 99;
        } else {
            bug(101);
        }
    }

    rspeak(state, state.newloc - 500);
    state.newloc = state.loc;
    return 2;
}

/**
 * march_l12 - alternative to probability move
 */
function march_l12(state, ll1, ll2) {
    for (; state.tkk !== null; state.tkk = state.tkk.next) {
        if (state.tkk.tloc !== ll2 || state.tkk.conditions !== ll1) {
            break;
        }
    }
    if (state.tkk === null) {
        bug(25);
    }
    return march_l11(state); // goto l11
}

function mback(state) {
    let k = state.oldloc;
    if (forced(state, k)) {
        k = state.oldlc2;
    }
    state.oldlc2 = state.oldloc;
    state.oldloc = state.loc;

    let tk2 = null;
    if (k === state.loc) {
        rspeak(state, 91);
        return 2;
    }

    for (; state.tkk !== null; state.tkk = state.tkk.next) { // 21
        const ll = state.tkk.tloc;
        if (ll === k) {
            state.k = state.tkk.tverb; // k back to verb
            state.tkk = state.travel[state.loc];
            return 9;
        }
        if (ll <= 300) {
            const j = state.travel[state.loc];
            if (forced(state, ll) && j !== null && k === j.tloc) {
                tk2 = state.tkk;
            }
        }
    }

    state.tkk = tk2; // 23
    if (state.tkk !== null) {
        state.k = state.tkk.tverb;
        state.tkk = state.travel[state.loc];
        return 9;
    }

    rspeak(state, 140);
    return 2;
}

/**
 * specials - handle special locations 300+ (from 30000 in main.c)
 * Returns: 2 or 12 or 99
 */
function specials(state) {
    state.newloc -= 300;

    switch (state.newloc) {
        case 1: // 30100
            state.newloc = 99 + 100 - state.loc;
            if (state.holdng === 0 || (state.holdng === 1 && toting(state, state.emrald))) {
                return 2;
            }
            state.newloc = state.loc;
            rspeak(state, 117);
            return 2;

        case 2: // 30200
            drop(state, state.emrald, state.loc);
            return 12;

        case 3: // 30300
            return trbridge(state);

        default:
            bug(29);
    }
}

/**
 * trbridge - handle troll bridge (from 30300 in main.c)
 * Returns: 2 or 99
 */
function trbridge(state) {
    if (state.prop[state.troll] === 1) {
        pspeak(state, state.troll, 1);
        state.prop[state.troll] = 0;
        move(state, state.troll2, 0);
        move(state, state.troll2 + 100, 0);
        move(state, state.troll, state.plac[state.troll]);
        move(state, state.troll + 100, state.fixd[state.troll]);
        juggle(state, state.chasm);
        state.newloc = state.loc;
        return 2;
    }

    state.newloc = state.plac[state.troll] + state.fixd[state.troll] - state.loc; // 30310
    if (state.prop[state.troll] === 0) {
        state.prop[state.troll] = 1;
    }
    if (!toting(state, state.bear)) {
        return 2;
    }

    rspeak(state, 162);
    state.prop[state.chasm] = 1;
    state.prop[state.troll] = 2;
    drop(state, state.bear, state.newloc);
    state.fixed[state.bear] = -1;
    state.prop[state.bear] = 3;
    if (state.prop[state.spices] < 0) {
        state.tally2++;
    }
    state.oldlc2 = state.newloc;
    return 99;
}

/**
 * badmove - report bad movement attempt
 */
export function badmove(state) {
    state.spk = 12;
    if (state.k >= 43 && state.k <= 50) {
        state.spk = 9;
    }
    if (state.k === 29 || state.k === 30) {
        state.spk = 9;
    }
    if (state.k === 7 || state.k === 36 || state.k === 37) {
        state.spk = 10;
    }
    if (state.k === 11 || state.k === 19) {
        state.spk = 11;
    }
    if (state.verb === state.find || state.verb === state.invent) {
        state.spk = 59;
    }
    if (state.k === 62 || state.k === 65) {
        state.spk = 42;
    }
    if (state.k === 17) {
        state.spk = 80;
    }
    rspeak(state, state.spk);
}

/**
 * bug - fatal error
 */
export function bug(n) {
    console.error(`Please tell jim@rand.org that fatal bug ${n} happened.`);
    throw new Error(`Fatal bug ${n}`);
}

/**
 * checkhints - check and offer hints (from 2600 in main.c)
 */
export async function checkhints(state) {
    for (let hint = 4; hint <= state.hntmax; hint++) {
        if (state.hinted[hint]) {
            continue;
        }
        if (!bitset(state, state.loc, hint)) {
            state.hintlc[hint] = -1;
        }
        state.hintlc[hint]++;
        if (state.hintlc[hint] < state.hints[hint][1]) {
            continue;
        }

        let shouldOffer = false;

        switch (hint) {
            case 4: // 40400
                if (state.prop[state.grate] === 0 && !here(state, state.keys)) {
                    shouldOffer = true;
                }
                break;

            case 5: // 40500
                if (here(state, state.bird) && toting(state, state.rod) && state.obj === state.bird) {
                    shouldOffer = true;
                } else {
                    continue; // goto l40030
                }
                break;

            case 6: // 40600
                if (here(state, state.snake) && !here(state, state.bird)) {
                    shouldOffer = true;
                }
                break;

            case 7: // 40700
                if (state.atloc[state.loc] === 0 && state.atloc[state.oldloc] === 0 &&
                    state.atloc[state.oldlc2] === 0 && state.holdng > 1) {
                    shouldOffer = true;
                }
                break;

            case 8: // 40800
                if (state.prop[state.emrald] !== -1 && state.prop[state.pyram] === -1) {
                    shouldOffer = true;
                }
                break;

            case 9: // 40900
                shouldOffer = true;
                break;

            default:
                bug(27);
        }

        if (!shouldOffer) {
            // l40020
            state.hintlc[hint] = 0;
            continue;
        }

        // l40010: offer hint
        state.hintlc[hint] = 0;
        if (!(await yes(state, state.hints[hint][3], 0, 54))) {
            continue;
        }
        console.log(`I am prepared to give you a hint, but it will cost you ${state.hints[hint][2]} points.`);
        state.hinted[hint] = await yes(state, 175, state.hints[hint][4], 54);

        // l40020
        state.hintlc[hint] = 0;
    }
}

/**
 * trsay - handle SAY command (from 9030 in main.c)
 * Returns: label number
 */
export function trsay(state) {
    if (state.wd2 !== '') {
        state.wd1 = state.wd2;
    }
    const i = vocab(state, state.wd1, -1, 0);
    if (i === 62 || i === 65 || i === 71 || i === 2025) {
        state.wd2 = '';
        state.obj = 0;
        return 2630;
    }
    console.log(`\nOkay, "${state.wd2}".`);
    return 2012;
}

/**
 * trtake - handle TAKE command (from 9010 in main.c)
 * Returns: label number
 */
export function trtake(state) {
    if (toting(state, state.obj)) {
        return 2011;
    }

    state.spk = 25;
    if (state.obj === state.plant && state.prop[state.plant] <= 0) {
        state.spk = 115;
    }
    if (state.obj === state.bear && state.prop[state.bear] === 1) {
        state.spk = 169;
    }
    if (state.obj === state.chain && state.prop[state.bear] !== 0) {
        state.spk = 170;
    }
    if (state.fixed[state.obj] !== 0) {
        return 2011;
    }

    if (state.obj === state.water || state.obj === state.oil) {
        if (here(state, state.bottle) && liq(state) === state.obj) {
            state.obj = state.bottle;
            // goto l9017
        } else {
            state.obj = state.bottle;
            if (toting(state, state.bottle) && state.prop[state.bottle] === 1) {
                return 9220;
            }
            if (state.prop[state.bottle] !== 1) {
                state.spk = 105;
            }
            if (!toting(state, state.bottle)) {
                state.spk = 104;
            }
            return 2011;
        }
    }

    // l9017
    if (state.holdng >= 7) {
        rspeak(state, 92);
        return 2012;
    }

    if (state.obj === state.bird) {
        if (state.prop[state.bird] !== 0) {
            // goto l9014
        } else {
            if (toting(state, state.rod)) {
                rspeak(state, 26);
                return 2012;
            }
            if (!toting(state, state.cage)) {
                rspeak(state, 27);
                return 2012;
            }
            state.prop[state.bird] = 1;
        }
    }

    // l9014
    if ((state.obj === state.bird || state.obj === state.cage) && state.prop[state.bird] !== 0) {
        carry(state, state.bird + state.cage - state.obj, state.loc);
    }
    carry(state, state.obj, state.loc);
    state.k = liq(state);
    if (state.obj === state.bottle && state.k !== 0) {
        state.place[state.k] = -1;
    }
    return 2009;
}

/**
 * dropper - actually drop object (helper for trdrop)
 * Returns: label number
 */
function dropper(state) {
    const k = liq(state);
    if (k === state.obj) {
        state.obj = state.bottle;
    }
    if (state.obj === state.bottle && k !== 0) {
        state.place[k] = 0;
    }
    if (state.obj === state.cage && state.prop[state.bird] !== 0) {
        drop(state, state.bird, state.loc);
    }
    if (state.obj === state.bird) {
        state.prop[state.bird] = 0;
    }
    drop(state, state.obj, state.loc);
    return 2012;
}

/**
 * trdrop - handle DROP command (from 9020 in main.c)
 * Returns: label number
 */
export function trdrop(state) {
    if (toting(state, state.rod2) && state.obj === state.rod && !toting(state, state.rod)) {
        state.obj = state.rod2;
    }
    if (!toting(state, state.obj)) {
        return 2011;
    }

    if (state.obj === state.bird && here(state, state.snake)) {
        rspeak(state, 30);
        if (state.closed) {
            return 19000;
        }
        dstroy(state, state.snake);
        state.prop[state.snake] = 1;
        return dropper(state);
    }

    if (state.obj === state.coins && here(state, state.vend)) { // 9024
        dstroy(state, state.coins);
        drop(state, state.batter, state.loc);
        pspeak(state, state.batter, 0);
        return 2012;
    }

    if (state.obj === state.bird && at(state, state.dragon) && state.prop[state.dragon] === 0) { // 9025
        rspeak(state, 154);
        dstroy(state, state.bird);
        state.prop[state.bird] = 0;
        if (state.place[state.snake] === state.plac[state.snake]) {
            state.tally2--;
        }
        return 2012;
    }

    if (state.obj === state.bear && at(state, state.troll)) { // 9026
        rspeak(state, 163);
        move(state, state.troll, 0);
        move(state, state.troll + 100, 0);
        move(state, state.troll2, state.plac[state.troll]);
        move(state, state.troll2 + 100, state.fixd[state.troll]);
        juggle(state, state.chasm);
        state.prop[state.troll] = 2;
        return dropper(state);
    }

    if (state.obj !== state.vase || state.loc === state.plac[state.pillow]) { // 9027
        rspeak(state, 54);
        return dropper(state);
    }

    state.prop[state.vase] = 2; // 9028
    if (at(state, state.pillow)) {
        state.prop[state.vase] = 0;
    }
    pspeak(state, state.vase, state.prop[state.vase] + 1);
    if (state.prop[state.vase] !== 0) {
        state.fixed[state.vase] = -1;
    }
    return dropper(state);
}

/**
 * tropen - handle OPEN/LOCK command (from 9040 in main.c)
 * Returns: label number
 */
export function tropen(state) {
    if (state.obj === state.clam || state.obj === state.oyster) {
        let k = 0; // 9046
        if (state.obj === state.oyster) {
            k = 1;
        }
        state.spk = 124 + k;
        if (toting(state, state.obj)) {
            state.spk = 120 + k;
        }
        if (!toting(state, state.tridnt)) {
            state.spk = 122 + k;
        }
        if (state.verb === state.lock) {
            state.spk = 61;
        }
        if (state.spk !== 124) {
            return 2011;
        }
        dstroy(state, state.clam);
        drop(state, state.oyster, state.loc);
        drop(state, state.pearl, 105);
        return 2011;
    }

    if (state.obj === state.door) {
        state.spk = 111;
    }
    if (state.obj === state.door && state.prop[state.door] === 1) {
        state.spk = 54;
    }
    if (state.obj === state.cage) {
        state.spk = 32;
    }
    if (state.obj === state.keys) {
        state.spk = 55;
    }
    if (state.obj === state.grate || state.obj === state.chain) {
        state.spk = 31;
    }
    if (state.spk !== 31 || !here(state, state.keys)) {
        return 2011;
    }

    if (state.obj === state.chain) {
        if (state.verb === state.lock) {
            state.spk = 172; // 9049: lock
            if (state.prop[state.chain] !== 0) {
                state.spk = 34;
            }
            if (state.loc !== state.plac[state.chain]) {
                state.spk = 173;
            }
            if (state.spk !== 172) {
                return 2011;
            }
            state.prop[state.chain] = 2;
            if (toting(state, state.chain)) {
                drop(state, state.chain, state.loc);
            }
            state.fixed[state.chain] = -1;
            return 2011;
        }

        state.spk = 171;
        if (state.prop[state.bear] === 0) {
            state.spk = 41;
        }
        if (state.prop[state.chain] === 0) {
            state.spk = 37;
        }
        if (state.spk !== 171) {
            return 2011;
        }
        state.prop[state.chain] = 0;
        state.fixed[state.chain] = 0;
        if (state.prop[state.bear] !== 3) {
            state.prop[state.bear] = 2;
        }
        state.fixed[state.bear] = 2 - state.prop[state.bear];
        return 2011;
    }

    if (state.closng) {
        state.k = 130;
        if (!state.panic) {
            state.clock2 = 15;
        }
        state.panic = true;
        return 2010;
    }

    state.k = 34 + state.prop[state.grate]; // 9043
    state.prop[state.grate] = 1;
    if (state.verb === state.lock) {
        state.prop[state.grate] = 0;
    }
    state.k = state.k + 2 * state.prop[state.grate];
    return 2010;
}

/**
 * trkill - handle KILL/ATTACK command (from 9120 in main.c)
 * Returns: label number
 */
export async function trkill(state) {
    let i;
    for (i = 1; i <= 5; i++) {
        if (state.dloc[i] === state.loc && state.dflag >= 2) {
            break;
        }
    }
    if (i === 6) {
        i = 0;
    }

    if (state.obj === 0) { // 9122
        if (i !== 0) {
            state.obj = state.dwarf;
        }
        if (here(state, state.snake)) {
            state.obj = state.obj * 100 + state.snake;
        }
        if (at(state, state.dragon) && state.prop[state.dragon] === 0) {
            state.obj = state.obj * 100 + state.dragon;
        }
        if (at(state, state.troll)) {
            state.obj = state.obj * 100 + state.troll;
        }
        if (here(state, state.bear) && state.prop[state.bear] === 0) {
            state.obj = state.obj * 100 + state.bear;
        }
        if (state.obj > 100) {
            return 8000;
        }
        if (state.obj === 0) {
            if (here(state, state.bird) && state.verb !== state.throw) {
                state.obj = state.bird;
            }
            if (here(state, state.clam) || here(state, state.oyster)) {
                state.obj = 100 * state.obj + state.clam;
            }
            if (state.obj > 100) {
                return 8000;
            }
        }
    }

    if (state.obj === state.bird) { // 9124
        state.spk = 137;
        if (state.closed) {
            return 2011;
        }
        dstroy(state, state.bird);
        state.prop[state.bird] = 0;
        if (state.place[state.snake] === state.plac[state.snake]) {
            state.tally2++;
        }
        state.spk = 45;
    }

    if (state.obj === 0) {
        state.spk = 44; // 9125
    }
    if (state.obj === state.clam || state.obj === state.oyster) {
        state.spk = 150;
    }
    if (state.obj === state.snake) {
        state.spk = 46;
    }
    if (state.obj === state.dwarf) {
        state.spk = 49;
    }
    if (state.obj === state.dwarf && state.closed) {
        return 19000;
    }
    if (state.obj === state.dragon) {
        state.spk = 147;
    }
    if (state.obj === state.troll) {
        state.spk = 157;
    }
    if (state.obj === state.bear) {
        state.spk = 165 + Math.floor((state.prop[state.bear] + 1) / 2);
    }
    if (state.obj !== state.dragon || state.prop[state.dragon] !== 0) {
        return 2011;
    }

    rspeak(state, 49);
    state.verb = 0;
    state.obj = 0;
    await getin(state);
    if (!weq(state.wd1, 'y') && !weq(state.wd1, 'yes')) {
        return 2608;
    }

    pspeak(state, state.dragon, 1);
    state.prop[state.dragon] = 2;
    state.prop[state.rug] = 0;
    state.k = Math.floor((state.plac[state.dragon] + state.fixd[state.dragon]) / 2);
    move(state, state.dragon + 100, -1);
    move(state, state.rug + 100, 0);
    move(state, state.dragon, state.k);
    move(state, state.rug, state.k);
    for (state.obj = 1; state.obj <= 100; state.obj++) {
        if (state.place[state.obj] === state.plac[state.dragon] ||
            state.place[state.obj] === state.fixd[state.dragon]) {
            move(state, state.obj, state.k);
        }
    }
    state.loc = state.k;
    state.k = state.null;
    return 8;
}

/**
 * trtoss - handle THROW command (from 9170 in main.c)
 * Returns: label number
 */
export function trtoss(state) {
    if (toting(state, state.rod2) && state.obj === state.rod && !toting(state, state.rod)) {
        state.obj = state.rod2;
    }
    if (!toting(state, state.obj)) {
        return 2011;
    }

    if (state.obj >= 50 && state.obj <= state.maxtrs && at(state, state.troll)) {
        state.spk = 159; // 9178
        drop(state, state.obj, 0);
        move(state, state.troll, 0);
        move(state, state.troll + 100, 0);
        drop(state, state.troll2, state.plac[state.troll]);
        drop(state, state.troll2 + 100, state.fixd[state.troll]);
        juggle(state, state.chasm);
        return 2011;
    }

    if (state.obj === state.food && here(state, state.bear)) {
        state.obj = state.bear; // 9177
        return 9210;
    }

    if (state.obj !== state.axe) {
        return 9020;
    }

    // Throw axe at dwarf
    for (let i = 1; i <= 5; i++) {
        if (state.dloc[i] === state.loc) {
            state.spk = 48; // 9172
            if (ran(3) === 0 || state.saved !== -1) {
                // l9175: hit or miss
                rspeak(state, state.spk);
                drop(state, state.axe, state.loc);
                state.k = state.null;
                return 8;
            }
            state.dseen[i] = false;
            state.dloc[i] = 0;
            state.spk = 47;
            state.dkill++;
            if (state.dkill === 1) {
                state.spk = 149;
            }
            rspeak(state, state.spk);
            drop(state, state.axe, state.loc);
            state.k = state.null;
            return 8;
        }
    }

    state.spk = 152;
    if (at(state, state.dragon) && state.prop[state.dragon] === 0) {
        // l9175
        rspeak(state, state.spk);
        drop(state, state.axe, state.loc);
        state.k = state.null;
        return 8;
    }

    state.spk = 158;
    if (at(state, state.troll)) {
        // l9175
        rspeak(state, state.spk);
        drop(state, state.axe, state.loc);
        state.k = state.null;
        return 8;
    }

    if (here(state, state.bear) && state.prop[state.bear] === 0) {
        state.spk = 164;
        drop(state, state.axe, state.loc);
        state.fixed[state.axe] = -1;
        state.prop[state.axe] = 1;
        juggle(state, state.bear);
        return 2011;
    }

    state.obj = 0;
    return 9120;
}

/**
 * trfeed - handle FEED command (from 9210 in main.c)
 * Returns: label number
 */
export function trfeed(state) {
    if (state.obj === state.bird) {
        state.spk = 100;
        return 2011;
    }

    if (state.obj === state.snake || state.obj === state.dragon || state.obj === state.troll) {
        state.spk = 102;
        if (state.obj === state.dragon && state.prop[state.dragon] !== 0) {
            state.spk = 110;
        }
        if (state.obj === state.troll) {
            state.spk = 182;
        }
        if (state.obj !== state.snake || state.closed || !here(state, state.bird)) {
            return 2011;
        }
        state.spk = 101;
        dstroy(state, state.bird);
        state.prop[state.bird] = 0;
        state.tally2++;
        return 2011;
    }

    if (state.obj === state.dwarf) {
        if (!here(state, state.food)) {
            return 2011;
        }
        state.spk = 103;
        state.dflag++;
        return 2011;
    }

    if (state.obj === state.bear) {
        if (state.prop[state.bear] === 0) {
            state.spk = 102;
        }
        if (state.prop[state.bear] === 3) {
            state.spk = 110;
        }
        if (!here(state, state.food)) {
            return 2011;
        }
        dstroy(state, state.food);
        state.prop[state.bear] = 1;
        state.fixed[state.axe] = 0;
        state.prop[state.axe] = 0;
        state.spk = 168;
        return 2011;
    }

    state.spk = 14;
    return 2011;
}

/**
 * trfill - handle FILL command (from 9220 in main.c)
 * Returns: label number
 */
export function trfill(state) {
    if (state.obj === state.vase) {
        state.spk = 29;
        if (liqloc(state, state.loc) === 0) {
            state.spk = 144;
        }
        if (liqloc(state, state.loc) === 0 || !toting(state, state.vase)) {
            return 2011;
        }
        rspeak(state, 145);
        state.prop[state.vase] = 2;
        state.fixed[state.vase] = -1;
        return 9020;
    }

    if (state.obj !== 0 && state.obj !== state.bottle) {
        return 2011;
    }
    if (state.obj === 0 && !here(state, state.bottle)) {
        return 8000;
    }

    state.spk = 107;
    if (liqloc(state, state.loc) === 0) {
        state.spk = 106;
    }
    if (liq(state) !== 0) {
        state.spk = 105;
    }
    if (state.spk !== 107) {
        return 2011;
    }

    state.prop[state.bottle] = Math.floor((state.cond[state.loc] % 4) / 2) * 2;
    state.k = liq(state);
    if (toting(state, state.bottle)) {
        state.place[state.k] = -1;
    }
    if (state.k === state.oil) {
        state.spk = 108;
    }
    return 2011;
}

/**
 * closing - handle cave closing (from 10000 in main.c)
 */
export function closing(state) {
    state.prop[state.grate] = 0;
    state.prop[state.fissur] = 0;
    for (let i = 1; i <= 6; i++) {
        state.dseen[i] = false;
        state.dloc[i] = 0;
    }
    move(state, state.troll, 0);
    move(state, state.troll + 100, 0);
    move(state, state.troll2, state.plac[state.troll]);
    move(state, state.troll2 + 100, state.fixd[state.troll]);
    juggle(state, state.chasm);
    if (state.prop[state.bear] !== 3) {
        dstroy(state, state.bear);
    }
    state.prop[state.chain] = 0;
    state.fixed[state.chain] = 0;
    state.prop[state.axe] = 0;
    state.fixed[state.axe] = 0;
    rspeak(state, 129);
    state.clock1 = -1;
    state.closng = true;
}

/**
 * caveclose - final cave closure (from 11000 in main.c)
 */
export function caveclose(state) {
    state.prop[state.bottle] = put(state, state.bottle, 115, 1);
    state.prop[state.plant] = put(state, state.plant, 115, 0);
    state.prop[state.oyster] = put(state, state.oyster, 115, 0);
    state.prop[state.lamp] = put(state, state.lamp, 115, 0);
    state.prop[state.rod] = put(state, state.rod, 115, 0);
    state.prop[state.dwarf] = put(state, state.dwarf, 115, 0);
    state.loc = 115;
    state.oldloc = 115;
    state.newloc = 115;

    put(state, state.grate, 116, 0);
    state.prop[state.snake] = put(state, state.snake, 116, 1);
    state.prop[state.bird] = put(state, state.bird, 116, 1);
    state.prop[state.cage] = put(state, state.cage, 116, 0);
    state.prop[state.rod2] = put(state, state.rod2, 116, 0);
    state.prop[state.pillow] = put(state, state.pillow, 116, 0);

    state.prop[state.mirror] = put(state, state.mirror, 115, 0);
    state.fixed[state.mirror] = 116;

    for (let i = 1; i <= 100; i++) {
        if (toting(state, i)) {
            dstroy(state, i);
        }
    }
    rspeak(state, 132);
    state.closed = true;
}
