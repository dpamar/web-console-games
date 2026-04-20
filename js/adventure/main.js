/**
 * Main game loop - faithful port from main.c
 * All goto labels converted to function returns and loop control
 */

import { ConsoleLine } from '../ui/ConsoleLine.js';
import { GameState } from './game-state.js';
import { loadGameData } from './loader.js';
import { init } from './init.js';
import { getin, rspeak, pspeak, speak } from './io.js';
import { vocab, move, drop, dstroy, weq } from './vocab.js';
import {
    toting, here, at, liq, liqloc, dark, forced, pct, fdwarf,
    march, badmove, checkhints, trsay, trtake, trdrop, tropen,
    trkill, trtoss, trfeed, trfill, closing, caveclose
} from './subr.js';
import { score, done, die } from './done.js';
import { initRandom, isRandomInitialized } from './random.js';

/**
 * startup - prepare for a new game (from init.c)
 */
async function startup(state) {
    state.demo = false; // Start() returns FALSE for new game
    state.hinted[3] = await yes(state, 65, 1, 0);
    state.newloc = 1;
    state.limit = 330;
    if (state.hinted[3]) {
        state.limit = 1000; // better batteries if instructions
    }
    return await mainLoop(state);
}

/**
 * Start - introduction
 */
async function Start(state) {
    state.demo = await yesm(state, 1, 0, 65);
    state.limit = (state.demo) ? 1000 : 330;
    return 0;
}

/**
 * Main command loop (label 2)
 */
async function mainLoop(state) {
    while (true) {
        // Check for closing restrictions
        if (state.newloc < 9 && state.newloc !== 0 && state.closng) {
            rspeak(state, 130);
            state.newloc = state.loc;
            if (!state.panic) {
                state.clock2 = 15;
            }
            state.panic = true;
        }

        // Dwarf stuff
        const rval = await fdwarf(state);
        if (rval === 99) {
            const continueGame = await die(state, 99);
            if (!continueGame) {
                return;
            }
        }

        // Debug: log current location
        console.log(`[DEBUG] Location: ${state.loc} (newloc: ${state.newloc})`);

        // l2000: Check if dead
        if (state.loc === 0) {
            const continueGame = await die(state, 99);
            if (!continueGame) {
                return;
            }
        }

        // Describe location
        let kk = state.stext[state.loc];
        if ((state.abb[state.loc] % state.abbnum) === 0 || !kk || kk.seekadr === null || kk.seekadr === '') {
            kk = state.ltext[state.loc];
        }
        if (!forced(state, state.loc) && dark(state)) {
            if (state.wzdark && pct(state, 35)) {
                const continueGame = await die(state, 90);
                if (!continueGame) {
                    return;
                }
                // After death, restart l2000
                if (state.loc === 0) {
                    const continueGame2 = await die(state, 99);
                    if (!continueGame2) {
                        return;
                    }
                }
                kk = state.stext[state.loc];
                if ((state.abb[state.loc] % state.abbnum) === 0 || !kk || kk.seekadr === null || kk.seekadr === '') {
                    kk = state.ltext[state.loc];
                }
                if (!forced(state, state.loc) && dark(state)) {
                    kk = state.rtext[16];
                }
            } else {
                kk = state.rtext[16];
            }
        }

        // l2001
        if (toting(state, state.bear)) {
            rspeak(state, 141);
        }
        speak(state, kk);
        state.k = 1;

        if (forced(state, state.loc)) {
            // goto l8
            const marchResult = march(state);
            if (marchResult === 2) {
                continue; // back to l2
            } else if (marchResult === 99) {
                const continueGame = await die(state, 99);
                if (!continueGame) {
                    return;
                }
                continue;
            }
        }

        if (state.loc === 33 && pct(state, 25) && !state.closng) {
            rspeak(state, 8);
        }

        if (!dark(state)) {
            state.abb[state.loc]++;
            for (let i = state.atloc[state.loc]; i !== 0; i = state.links[i]) { // 2004
                state.obj = i;
                if (state.obj > 100) {
                    state.obj -= 100;
                }
                if (state.obj === state.steps && toting(state, state.nugget)) {
                    continue;
                }
                if (state.prop[state.obj] < 0) {
                    if (state.closed) {
                        continue;
                    }
                    state.prop[state.obj] = 0;
                    if (state.obj === state.rug || state.obj === state.chain) {
                        state.prop[state.obj] = 1;
                    }
                    state.tally--;
                    if (state.tally === state.tally2 && state.tally !== 0) {
                        if (state.limit > 35) {
                            state.limit = 35;
                        }
                    }
                }
                let ll = state.prop[state.obj]; // 2006
                if (state.obj === state.steps && state.loc === state.fixed[state.steps]) {
                    ll = 1;
                }
                pspeak(state, state.obj, ll);
            } // 2008
        }

        // Main input/command loop
        while (true) {
            // l2012
            console.log(`[DEBUG l2012] Resetting verb and obj`);
            state.verb = 0;
            state.obj = 0;

            // l2600: Check hints
            await checkhints(state);

            if (state.closed) {
                if (state.prop[state.oyster] < 0 && toting(state, state.oyster)) {
                    pspeak(state, state.oyster, 1);
                }
                for (let i = 1; i < 100; i++) {
                    if (toting(state, i) && state.prop[i] < 0) { // 2604
                        state.prop[i] = -1 - state.prop[i];
                    }
                }
            }

            state.wzdark = dark(state); // 2605
            if (state.knfloc > 0 && state.knfloc !== state.loc) {
                state.knfloc = 1;
            }

            await getin(state);

            // l2608
            if ((state.foobar = -state.foobar) > 0) {
                state.foobar = 0;
            }

            state.turns++;
            if (state.demo && state.turns >= 32767) {
                done(state, 1);
                return;
            }

            if (state.verb === state.say && state.wd2 !== '') {
                state.verb = 0;
            }
            if (state.verb === state.say) {
                // goto l4090 for SAY
                const sayResult = trsay(state);
                if (sayResult === 2012) {
                    continue; // back to l2012
                } else if (sayResult === 2630) {
                    // goto l2630 - reparse word
                    // Fall through to word parsing below
                } else {
                    continue;
                }
            }

            if (state.tally === 0 && state.loc >= 15 && state.loc !== 33) {
                state.clock1--;
            }
            if (state.clock1 === 0) {
                closing(state);
                // goto l19999
                // Fall through to l19999 processing
            }
            if (state.clock1 < 0) {
                state.clock2--;
            }
            if (state.clock2 === 0) {
                caveclose(state);
                continue; // back to l2
            }

            if (state.prop[state.lamp] === 1) {
                state.limit--;
            }
            if (state.limit <= 30 && here(state, state.batter) &&
                state.prop[state.batter] === 0 && here(state, state.lamp)) {
                rspeak(state, 188); // 12000
                state.prop[state.batter] = 1;
                if (toting(state, state.batter)) {
                    drop(state, state.batter, state.loc);
                }
                state.limit = state.limit + 2500;
                state.lmwarn = false;
                // goto l19999
                // Fall through
            }
            if (state.limit === 0) {
                state.limit = -1; // 12400
                state.prop[state.lamp] = 0;
                rspeak(state, 184);
                // goto l19999
                // Fall through
            }
            if (state.limit < 0 && state.loc <= 8) {
                rspeak(state, 185); // 12600
                state.gaveup = true;
                done(state, 2);
                return;
            }
            if (state.limit <= 30) {
                if (state.lmwarn || !here(state, state.lamp)) {
                    // goto l19999
                    // Fall through
                } else {
                    state.lmwarn = true; // 12200
                    state.spk = 187;
                    if (state.place[state.batter] === 0) {
                        state.spk = 183;
                    }
                    if (state.prop[state.batter] === 1) {
                        state.spk = 189;
                    }
                    rspeak(state, state.spk);
                }
            }

            // l19999
            state.k = 43;
            if (liqloc(state, state.loc) === state.water) {
                state.k = 70;
            }
            if (weq(state.wd1, 'enter') &&
                (weq(state.wd2, 'strea') || weq(state.wd2, 'water'))) {
                // l2010
                state.spk = state.k;
                rspeak(state, state.spk);
                continue; // l2012
            }
            if (weq(state.wd1, 'enter') && state.wd2 !== '') {
                // l2800: copy wd2 to wd1
                state.wd1 = state.wd2;
                state.wd2 = '';
                // goto l2610
            }
            if ((!weq(state.wd1, 'water') && !weq(state.wd1, 'oil')) ||
                (!weq(state.wd2, 'plant') && !weq(state.wd2, 'door'))) {
                // Fall through to l2610
            } else {
                if (at(state, vocab(state, state.wd2, 1, 0))) {
                    state.wd2 = 'pour';
                }
            }

            // l2610
            if (weq(state.wd1, 'west')) {
                if (++state.iwest === 10) {
                    rspeak(state, 17);
                }
            }

            // l2630: Parse command word
            let i = vocab(state, state.wd1, -1, 0);
            if (i === -1) {
                state.spk = 60; // 3000
                if (pct(state, 20)) {
                    state.spk = 61;
                }
                if (pct(state, 20)) {
                    state.spk = 13;
                }
                rspeak(state, state.spk);
                continue; // goto l2600
            }

            state.k = i % 1000;
            const kq = Math.floor(i / 1000) + 1;

            // Dispatch by word type
            if (kq === 1) {
                // Motion word - goto l8
                const marchResult = march(state);
                if (marchResult === 2) {
                    break; // continue to next location description
                } else if (marchResult === 99) {
                    const continueGame = await die(state, 99);
                    if (!continueGame) {
                        return;
                    }
                    // After death, restart l2000
                    break;
                }
            } else if (kq === 2) {
                // Object word - goto l5000
                const objResult = await handleObject(state);
                if (objResult === 'continue') {
                    continue; // stay in command loop
                } else if (objResult === 'break') {
                    break; // break to location description
                } else if (objResult === 'return') {
                    return; // game over
                }
            } else if (kq === 3) {
                // Action verb - goto l4000
                const verbResult = await handleVerb(state);
                if (verbResult === 'continue') {
                    continue; // stay in command loop
                } else if (verbResult === 'break') {
                    break; // break to location description
                } else if (verbResult === 'return') {
                    return; // game over
                }
            } else if (kq === 4) {
                // Message word - goto l2010
                state.spk = state.k;
                rspeak(state, state.spk);
                continue; // l2012
            } else {
                throw new Error(`Bug 22: Invalid word type ${kq}`);
            }
        }
    }
}

/**
 * handleObject - handle object words (from l5000)
 * Returns: 'continue', 'break', or 'return'
 */
async function handleObject(state) {
    state.obj = state.k;

    if (state.fixed[state.k] !== state.loc && !here(state, state.k)) {
        // l5100: Object not here
        if (state.k !== state.grate) {
            // l5110
            if (state.k !== state.dwarf) {
                // l5120
                if ((liq(state) === state.k && here(state, state.bottle)) ||
                    state.k === liqloc(state, state.loc)) {
                    // goto l5010
                } else if (state.obj !== state.plant || !at(state, state.plant2) ||
                           state.prop[state.plant2] === 0) {
                    // l5130
                    if (state.obj !== state.knife || state.knfloc !== state.loc) {
                        // l5140
                        if (state.obj !== state.rod || !here(state, state.rod2)) {
                            // l5190
                            if ((state.verb === state.find || state.verb === state.invent) &&
                                state.wd2 === '') {
                                // goto l5010
                            } else {
                                ConsoleLine.displayText(`I see no ${state.wd1} here`);
                                return 'continue'; // l2012
                            }
                        } else {
                            state.obj = state.rod2;
                            // goto l5010
                        }
                    } else {
                        state.knfloc = -1;
                        state.spk = 116;
                        rspeak(state, state.spk);
                        return 'continue'; // l2011 -> l2012
                    }
                } else {
                    state.obj = state.plant2;
                    // goto l5010
                }
            } else {
                // Check for dwarves
                let foundDwarf = false;
                for (let i = 1; i <= 5; i++) {
                    if (state.dloc[i] === state.loc && state.dflag >= 2) {
                        foundDwarf = true;
                        break;
                    }
                }
                if (!foundDwarf) {
                    // l5120
                    if ((liq(state) === state.k && here(state, state.bottle)) ||
                        state.k === liqloc(state, state.loc)) {
                        // goto l5010
                    } else if (state.obj !== state.plant || !at(state, state.plant2) ||
                               state.prop[state.plant2] === 0) {
                        // l5130 and beyond
                        if (state.obj !== state.knife || state.knfloc !== state.loc) {
                            if (state.obj !== state.rod || !here(state, state.rod2)) {
                                if ((state.verb === state.find || state.verb === state.invent) &&
                                    state.wd2 === '') {
                                    // goto l5010
                                } else {
                                    ConsoleLine.displayText(`I see no ${state.wd1} here`);
                                    return 'continue';
                                }
                            } else {
                                state.obj = state.rod2;
                                // goto l5010
                            }
                        } else {
                            state.knfloc = -1;
                            state.spk = 116;
                            rspeak(state, state.spk);
                            return 'continue';
                        }
                    } else {
                        state.obj = state.plant2;
                        // goto l5010
                    }
                }
                // else goto l5010
            }
        } else {
            // Grate
            if (state.loc === 1 || state.loc === 4 || state.loc === 7) {
                state.k = state.dprssn;
            }
            if (state.loc > 9 && state.loc < 15) {
                state.k = state.entrnc;
            }
            if (state.k !== state.grate) {
                // goto l8
                const marchResult = march(state);
                if (marchResult === 2) {
                    return 'break';
                } else if (marchResult === 99) {
                    const continueGame = await die(state, 99);
                    if (!continueGame) {
                        return 'return';
                    }
                    return 'break';
                }
            }
            // else goto l5010
        }
    }

    // l5010: Object is present
    if (state.wd2 !== '') {
        // l2800: copy wd2 to wd1
        state.wd1 = state.wd2;
        state.wd2 = '';
        // Restart parsing
        const i = vocab(state, state.wd1, -1, 0);
        if (i === -1) {
            state.spk = 60;
            if (pct(state, 20)) state.spk = 61;
            if (pct(state, 20)) state.spk = 13;
            rspeak(state, state.spk);
            return 'continue';
        }
        state.k = i % 1000;
        const kq = Math.floor(i / 1000) + 1;
        if (kq === 1) {
            const marchResult = march(state);
            if (marchResult === 2) {
                return 'break';
            } else if (marchResult === 99) {
                const continueGame = await die(state, 99);
                if (!continueGame) {
                    return 'return';
                }
                return 'break';
            }
        } else if (kq === 2) {
            return await handleObject(state);
        } else if (kq === 3) {
            return await handleVerb(state);
        } else if (kq === 4) {
            state.spk = state.k;
            rspeak(state, state.spk);
            return 'continue';
        }
    }

    if (state.verb !== 0) {
        // goto l4090
        return await handleVerbWithObject(state);
    }

    ConsoleLine.displayText(`What do you want to do with the ${state.wd1}?`);
    return 'continue'; // goto l2600
}

/**
 * handleVerb - handle action verbs (from l4000)
 * Returns: 'continue', 'break', or 'return'
 */
async function handleVerb(state) {
    console.log(`[DEBUG handleVerb] verb=${state.k}, wd2="${state.wd2}"`);
    state.verb = state.k;
    state.spk = state.actspk[state.verb];

    if (state.wd2 !== '' && state.verb !== state.say) {
        // l2800
        state.wd1 = state.wd2;
        state.wd2 = '';
        // Reparse
        const i = vocab(state, state.wd1, -1, 0);
        if (i === -1) {
            state.spk = 60;
            if (pct(state, 20)) state.spk = 61;
            if (pct(state, 20)) state.spk = 13;
            rspeak(state, state.spk);
            return 'continue';
        }
        state.k = i % 1000;
        const kq = Math.floor(i / 1000) + 1;
        if (kq === 1) {
            const marchResult = march(state);
            if (marchResult === 2) return 'break';
            else if (marchResult === 99) {
                const continueGame = await die(state, 99);
                return continueGame ? 'break' : 'return';
            }
        } else if (kq === 2) {
            return await handleObject(state);
        } else if (kq === 3) {
            return await handleVerb(state);
        } else if (kq === 4) {
            state.spk = state.k;
            rspeak(state, state.spk);
            return 'continue';
        }
    }

    if (state.verb === state.say) {
        state.obj = state.wd2;
    }
    if (state.obj !== 0) {
        return await handleVerbWithObject(state);
    }

    // l4080: Intransitive verb
    switch (state.verb) {
        case 1: // take
            if (state.atloc[state.loc] === 0 || state.links[state.atloc[state.loc]] !== 0) {
                // goto l8000
                ConsoleLine.displayText(`${state.wd1} what?`);
                state.obj = 0;
                return 'continue';
            }
            for (let i = 1; i <= 5; i++) {
                if (state.dloc[i] === state.loc && state.dflag >= 2) {
                    ConsoleLine.displayText(`${state.wd1} what?`);
                    state.obj = 0;
                    return 'continue';
                }
            }
            state.obj = state.atloc[state.loc];
            return await handleVerbWithObject(state); // goto l9010

        case 2:
        case 3:
        case 9:
        case 10:
        case 16:
        case 17:
        case 19:
        case 21:
        case 28:
        case 29: // drop, say, wave, calm, rub, toss, find, feed, break, wake
            ConsoleLine.displayText(`${state.wd1} what?`);
            state.obj = 0;
            return 'continue';

        case 4:
        case 6: // open, lock
            state.spk = 28;
            if (here(state, state.clam)) state.obj = state.clam;
            if (here(state, state.oyster)) state.obj = state.oyster;
            if (at(state, state.door)) state.obj = state.door;
            if (at(state, state.grate)) state.obj = state.grate;
            if (state.obj !== 0 && here(state, state.chain)) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                state.obj = 0;
                return 'continue';
            }
            if (here(state, state.chain)) state.obj = state.chain;
            if (state.obj === 0) {
                rspeak(state, state.spk);
                return 'continue';
            }
            return await handleVerbWithObject(state); // goto l9040

        case 5: // nothing
            rspeak(state, 54);
            return 'continue';

        case 7: // on
            if (!here(state, state.lamp)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.spk = 184;
            if (state.limit < 0) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.lamp] = 1;
            rspeak(state, 39);
            if (state.wzdark) {
                return 'break'; // goto l2000
            }
            return 'continue';

        case 8: // off
            if (!here(state, state.lamp)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.lamp] = 0;
            rspeak(state, 40);
            if (dark(state)) {
                rspeak(state, 16);
            }
            return 'continue';

        case 11: // walk
            ConsoleLine.displayText(`${state.wd1} what?`);
            return 'continue';

        case 12: // kill
            return await handleVerbWithObject(state);

        case 13: // pour
            return await handleVerbWithObject(state);

        case 14: // eat
            if (!here(state, state.food)) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                return 'continue';
            }
            dstroy(state, state.food);
            state.spk = 72;
            rspeak(state, state.spk);
            return 'continue';

        case 15: // drink
            return await handleVerbWithObject(state);

        case 18: // quit
            state.gaveup = await yes(state, 22, 54, 54);
            if (state.gaveup) {
                done(state, 2);
                return 'return';
            }
            return 'continue';

        case 20: // inventory
            console.log(`[DEBUG inventory] holdng=${state.holdng}`);
            state.spk = 98;
            for (let i = 1; i <= 100; i++) {
                if (i !== state.bear && toting(state, i)) {
                    console.log(`[DEBUG inventory] Found object ${i} (place=${state.place[i]})`);
                    if (state.spk === 98) {
                        rspeak(state, 99);
                    }
                    state.blklin = false;
                    pspeak(state, i, -1);
                    state.blklin = true;
                    state.spk = 0;
                }
            }
            if (toting(state, state.bear)) {
                state.spk = 141;
            }
            console.log(`[DEBUG inventory] Final spk=${state.spk}`);
            rspeak(state, state.spk);
            return 'continue'; // goto l2012 (stay in command loop)

        case 22: // fill
            return await handleVerbWithObject(state);

        case 23: // blast
            return await handleVerbWithObject(state);

        case 24: // score
            state.scorng = true;
            ConsoleLine.displayText(`If you were to quit now, you would score ${score(state)} out of a possible ${state.mxscor}.`);
            state.scorng = false;
            state.gaveup = await yes(state, 143, 54, 54);
            if (state.gaveup) {
                done(state, 2);
                return 'return';
            }
            return 'continue';

        case 25: { // foo
            const k = vocab(state, state.wd1, 3, 0);
            state.spk = 42;
            if (state.foobar === 1 - k) {
                // l8252
                state.foobar = k;
                if (k !== 4) {
                    rspeak(state, 54);
                    return 'continue';
                }
                state.foobar = 0;
                if (state.place[state.eggs] === state.plac[state.eggs] ||
                    (toting(state, state.eggs) && state.loc === state.plac[state.eggs])) {
                    rspeak(state, state.spk);
                    return 'continue';
                }
                if (state.place[state.eggs] === 0 && state.place[state.troll] === 0 &&
                    state.prop[state.troll] === 0) {
                    state.prop[state.troll] = 1;
                }
                k = 2;
                if (here(state, state.eggs)) k = 1;
                if (state.loc === state.plac[state.eggs]) k = 0;
                move(state, state.eggs, state.plac[state.eggs]);
                pspeak(state, state.eggs, k);
                return 'continue';
            }
            if (state.foobar !== 0) {
                state.spk = 151;
            }
            rspeak(state, state.spk);
            return 'continue';
        }

        case 26: // brief
            state.spk = 156;
            state.abbnum = 10000;
            state.detail = 3;
            rspeak(state, state.spk);
            return 'continue';

        case 27: // read
            if (here(state, state.magzin)) state.obj = state.magzin;
            if (here(state, state.tablet)) state.obj = state.obj * 100 + state.tablet;
            if (here(state, state.messag)) state.obj = state.obj * 100 + state.messag;
            if (state.closed && toting(state, state.oyster)) state.obj = state.oyster;
            if (state.obj > 100 || state.obj === 0 || dark(state)) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                return 'continue';
            }
            return await handleVerbWithObject(state);

        case 30: // suspend
            state.spk = 201;
            if (state.demo) {
                rspeak(state, state.spk);
                return 'continue';
            }
            ConsoleLine.displayText('I can suspend your adventure for you so you can resume later, but');
            ConsoleLine.displayText(`you will have to wait at least ${state.latncy} minutes before continuing.`);
            if (!(await yes(state, 200, 54, 54))) {
                return 'continue';
            }
            // Save not implemented
            ConsoleLine.displayText('Save not supported in web version');
            return 'continue';

        case 31: // hours
            ConsoleLine.displayText('Colossal cave is closed 9am-5pm Mon through Fri except holidays.');
            return 'continue';

        default:
            throw new Error(`Bug 23: Unknown intransitive verb ${state.verb}`);
    }
}

/**
 * handleVerbWithObject - handle transitive verbs (from l4090)
 * Returns: 'continue', 'break', or 'return'
 */
async function handleVerbWithObject(state) {
    console.log(`[DEBUG handleVerbWithObject] verb=${state.verb}, obj=${state.obj}`);
    switch (state.verb) {
        case 1: { // take
            const result = trtake(state);
            if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            } else if (result === 9220) {
                // goto l9220 (fill)
                const fillResult = trfill(state);
                if (fillResult === 2011) {
                    rspeak(state, state.spk);
                    return 'continue';
                } else if (fillResult === 8000) {
                    ConsoleLine.displayText(`${state.wd1} what?`);
                    state.obj = 0;
                    return 'continue';
                } else if (fillResult === 9020) {
                    return await handleDropAction(state);
                }
            } else if (result === 2009) {
                rspeak(state, 54);
                return 'continue';
            } else if (result === 2012) {
                return 'continue';
            }
            throw new Error(`Bug 102: Unexpected trtake result ${result}`);
        }

        case 2: // drop
            return await handleDropAction(state);

        case 3: { // say
            const result = trsay(state);
            if (result === 2012) {
                return 'continue';
            } else if (result === 2630) {
                // Reparse
                const i = vocab(state, state.wd1, -1, 0);
                if (i === -1) {
                    state.spk = 60;
                    if (pct(state, 20)) state.spk = 61;
                    if (pct(state, 20)) state.spk = 13;
                    rspeak(state, state.spk);
                    return 'continue';
                }
                state.k = i % 1000;
                const kq = Math.floor(i / 1000) + 1;
                if (kq === 1) {
                    const marchResult = march(state);
                    return marchResult === 2 ? 'break' : (marchResult === 99 ? (await die(state, 99) ? 'break' : 'return') : 'continue');
                } else if (kq === 2) {
                    return await handleObject(state);
                } else if (kq === 3) {
                    return await handleVerb(state);
                } else {
                    state.spk = state.k;
                    rspeak(state, state.spk);
                    return 'continue';
                }
            }
            throw new Error(`Bug 107: Unexpected trsay result ${result}`);
        }

        case 4:
        case 6: { // open, lock
            const result = tropen(state);
            if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            } else if (result === 2010) {
                rspeak(state, state.k);
                return 'continue';
            }
            throw new Error(`Bug 106: Unexpected tropen result ${result}`);
        }

        case 5: // nothing
            rspeak(state, 54);
            return 'continue';

        case 7: // on
            if (!here(state, state.lamp)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.spk = 184;
            if (state.limit < 0) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.lamp] = 1;
            rspeak(state, 39);
            if (state.wzdark) {
                return 'break';
            }
            return 'continue';

        case 8: // off
            if (!here(state, state.lamp)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.lamp] = 0;
            rspeak(state, 40);
            if (dark(state)) {
                rspeak(state, 16);
            }
            return 'continue';

        case 9: // wave
            if ((!toting(state, state.obj)) && (state.obj !== state.rod || !toting(state, state.rod2))) {
                state.spk = 29;
            }
            if (state.obj !== state.rod || !at(state, state.fissur) ||
                !toting(state, state.obj) || state.closng) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.fissur] = 1 - state.prop[state.fissur];
            pspeak(state, state.fissur, 2 - state.prop[state.fissur]);
            return 'continue';

        case 10:
        case 11:
        case 18:
        case 24:
        case 25:
        case 26:
        case 30:
        case 31: // calm, walk, quit, score, foo, brief, suspend, hours
            rspeak(state, state.spk);
            return 'continue';

        case 12: { // kill
            const result = await trkill(state);
            if (result === 8000) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                state.obj = 0;
                return 'continue';
            } else if (result === 8) {
                const marchResult = march(state);
                return marchResult === 2 ? 'break' : (marchResult === 99 ? (await die(state, 99) ? 'break' : 'return') : 'continue');
            } else if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            } else if (result === 2608) {
                return 'continue';
            } else if (result === 19000) {
                done(state, 3);
                return 'return';
            }
            throw new Error(`Bug 112: Unexpected trkill result ${result}`);
        }

        case 13: { // pour
            if (state.obj === state.bottle || state.obj === 0) {
                state.obj = liq(state);
            }
            if (state.obj === 0) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                return 'continue';
            }
            if (!toting(state, state.obj)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.spk = 78;
            if (state.obj !== state.oil && state.obj !== state.water) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.bottle] = 1;
            state.place[state.obj] = 0;
            state.spk = 77;
            if (!(at(state, state.plant) || at(state, state.door))) {
                rspeak(state, state.spk);
                return 'continue';
            }
            if (at(state, state.door)) {
                state.prop[state.door] = 0;
                if (state.obj === state.oil) {
                    state.prop[state.door] = 1;
                }
                state.spk = 113 + state.prop[state.door];
                rspeak(state, state.spk);
                return 'continue';
            }
            state.spk = 112;
            if (state.obj !== state.water) {
                rspeak(state, state.spk);
                return 'continue';
            }
            pspeak(state, state.plant, state.prop[state.plant] + 1);
            state.prop[state.plant] = (state.prop[state.plant] + 2) % 6;
            state.prop[state.plant2] = Math.floor(state.prop[state.plant] / 2);
            state.k = state.null;
            const marchResult = march(state);
            return marchResult === 2 ? 'break' : (marchResult === 99 ? (await die(state, 99) ? 'break' : 'return') : 'continue');
        }

        case 14: // eat
            if (state.obj === state.food) {
                dstroy(state, state.food);
                state.spk = 72;
                rspeak(state, state.spk);
                return 'continue';
            }
            if (state.obj === state.bird || state.obj === state.snake ||
                state.obj === state.clam || state.obj === state.oyster ||
                state.obj === state.dwarf || state.obj === state.dragon ||
                state.obj === state.troll || state.obj === state.bear) {
                state.spk = 71;
            }
            rspeak(state, state.spk);
            return 'continue';

        case 15: // drink
            if (state.obj === 0 && liqloc(state, state.loc) !== state.water &&
                (liq(state) !== state.water || !here(state, state.bottle))) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                return 'continue';
            }
            if (state.obj !== 0 && state.obj !== state.water) {
                state.spk = 110;
            }
            if (state.spk === 110 || liq(state) !== state.water || !here(state, state.bottle)) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.prop[state.bottle] = 1;
            state.place[state.water] = 0;
            state.spk = 74;
            rspeak(state, state.spk);
            return 'continue';

        case 16: // rub
            if (state.obj !== state.lamp) {
                state.spk = 76;
            }
            rspeak(state, state.spk);
            return 'continue';

        case 17: { // throw
            const result = trtoss(state);
            if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            } else if (result === 9020) {
                return await handleDropAction(state);
            } else if (result === 9120) {
                const killResult = await trkill(state);
                if (killResult === 8000) {
                    ConsoleLine.displayText(`${state.wd1} what?`);
                    return 'continue';
                } else if (killResult === 8) {
                    const marchResult = march(state);
                    return marchResult === 2 ? 'break' : (marchResult === 99 ? (await die(state, 99) ? 'break' : 'return') : 'continue');
                } else if (killResult === 2011) {
                    rspeak(state, state.spk);
                    return 'continue';
                } else if (killResult === 2608) {
                    return 'continue';
                } else if (killResult === 19000) {
                    done(state, 3);
                    return 'return';
                }
            } else if (result === 8) {
                const marchResult = march(state);
                return marchResult === 2 ? 'break' : (marchResult === 99 ? (await die(state, 99) ? 'break' : 'return') : 'continue');
            } else if (result === 9210) {
                const feedResult = trfeed(state);
                if (feedResult === 2011) {
                    rspeak(state, state.spk);
                    return 'continue';
                }
            }
            throw new Error(`Bug 113: Unexpected trtoss result ${result}`);
        }

        case 19:
        case 20: { // find, invent
            if (at(state, state.obj) ||
                (liq(state) === state.obj && at(state, state.bottle)) ||
                state.k === liqloc(state, state.loc)) {
                state.spk = 94;
            }
            for (let i = 1; i <= 5; i++) {
                if (state.dloc[i] === state.loc && state.dflag >= 2 && state.obj === state.dwarf) {
                    state.spk = 94;
                }
            }
            if (state.closed) {
                state.spk = 138;
            }
            if (toting(state, state.obj)) {
                state.spk = 24;
            }
            rspeak(state, state.spk);
            return 'continue';
        }

        case 21: { // feed
            const result = trfeed(state);
            if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            }
            throw new Error(`Bug 114: Unexpected trfeed result ${result}`);
        }

        case 22: { // fill
            const result = trfill(state);
            if (result === 2011) {
                rspeak(state, state.spk);
                return 'continue';
            } else if (result === 8000) {
                ConsoleLine.displayText(`${state.wd1} what?`);
                return 'continue';
            } else if (result === 9020) {
                return await handleDropAction(state);
            }
            throw new Error(`Bug 115: Unexpected trfill result ${result}`);
        }

        case 23: // blast
            if (state.prop[state.rod2] < 0 || !state.closed) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.bonus = 133;
            if (state.loc === 115) {
                state.bonus = 134;
            }
            if (here(state, state.rod2)) {
                state.bonus = 135;
            }
            rspeak(state, state.bonus);
            done(state, 2);
            return 'return';

        case 27: // read
            if (dark(state)) {
                ConsoleLine.displayText(`I see no ${state.wd1} here`);
                return 'continue';
            }
            if (state.obj === state.magzin) {
                state.spk = 190;
            }
            if (state.obj === state.tablet) {
                state.spk = 196;
            }
            if (state.obj === state.messag) {
                state.spk = 191;
            }
            if (state.obj === state.oyster && state.hinted[2] && toting(state, state.oyster)) {
                state.spk = 194;
            }
            if (state.obj !== state.oyster || state.hinted[2] || !toting(state, state.oyster) || !state.closed) {
                rspeak(state, state.spk);
                return 'continue';
            }
            state.hinted[2] = await yes(state, 192, 193, 54);
            return 'continue';

        case 28: // break
            if (state.obj === state.mirror) {
                state.spk = 148;
            }
            if (state.obj === state.vase && state.prop[state.vase] === 0) {
                state.spk = 198;
                if (toting(state, state.vase)) {
                    drop(state, state.vase, state.loc);
                }
                state.prop[state.vase] = 2;
                state.fixed[state.vase] = -1;
                rspeak(state, state.spk);
                return 'continue';
            }
            if (state.obj !== state.mirror || !state.closed) {
                rspeak(state, state.spk);
                return 'continue';
            }
            rspeak(state, 197);
            done(state, 3);
            return 'return';

        case 29: // wake
            if (state.obj !== state.dwarf || !state.closed) {
                rspeak(state, state.spk);
                return 'continue';
            }
            rspeak(state, 199);
            done(state, 3);
            return 'return';

        default:
            throw new Error(`Bug 24: Unknown transitive verb ${state.verb}`);
    }
}

/**
 * handleDropAction - handle drop command (helper)
 */
async function handleDropAction(state) {
    const result = trdrop(state);
    if (result === 2011) {
        rspeak(state, state.spk);
        return 'continue';
    } else if (result === 19000) {
        done(state, 3);
        return 'return';
    } else if (result === 2012) {
        return 'continue';
    }
    throw new Error(`Bug 105: Unexpected trdrop result ${result}`);
}

/**
 * yesm - yes/no with mspeak (needed for startup)
 */
async function yesm(state, x, y, z) {
    const { yesm: yesfn } = await import('./io.js');
    return await yesfn(state, x, y, z);
}

/**
 * yes - yes/no question
 */
async function yes(state, x, y, z) {
    const { yes: yesfn } = await import('./io.js');
    return await yesfn(state, x, y, z);
}

/**
 * Main entry point - initialize and start game
 */
export async function startAdventure() {
    const state = new GameState();

    ConsoleLine.displayText('Loading game data...');
    await loadGameData(state);

    ConsoleLine.displayText('Initializing...');
    init(state);

    // Initialize random number generator with time-based seed for normal game mode
    // (unless already initialized by test mode with fixed seed)
    if (!isRandomInitialized()) {
        initRandom();
    }

    ConsoleLine.displayEmptyLine();
    await startup(state);

    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayText('Game over. Thanks for playing!');
}
