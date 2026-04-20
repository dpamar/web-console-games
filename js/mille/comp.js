/*	$NetBSD: comp.c,v 1.9 2003/08/07 09:37:24 agc Exp $	*/

/*
 * Copyright (c) 1982, 1993
 *	The Regents of the University of California.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the University nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/*
 * @(#)comp.c	1.1 (Berkeley) 4/1/82
 */

import { wmove, wclrtoeol, mvaddstr, mvprintw } from '../ncurses/ncurses.js';
import {
	HAND_SZ, NUM_CARDS, PLAYER, COMP, M_PLAY, M_DRAW, M_DISCARD,
	C_INIT, C_25, C_50, C_75, C_100, C_200,
	C_EMPTY, C_FLAT, C_CRASH, C_STOP, C_LIMIT,
	C_GAS, C_SPARE, C_REPAIRS, C_GO, C_END_LIMIT,
	C_GAS_SAFE, C_SPARE_SAFE, C_DRIVE_SAFE, C_RIGHT_WAY,
	S_CONV, S_UNKNOWN, S_PLAYED, S_RIGHT_WAY as S_RIGHT_WAY_IDX,
	Value, C_name, Numcards, opposite, is_safety,
	DECK_SZ, ERR_Y, ERR_X, MOVE_Y, MOVE_X
} from './constants.js';
import {
	Player, Score, End, Numseen, Topcard, Deck, Numneed, Numgos, Debug,
	setMovetype, setCard_no
} from './state.js';
import { canplay } from './table.js';
import { roll } from './roll.js';
import { is_repair, safety } from './types.js';
import { check_ext, clearError } from './misc.js';

const V_VALUABLE = 40;

/*
 * Computer AI - refactored with label-to-function pattern
 */
export function calcmove() {
	clearError();

	const ctx = {
		pp: Player[COMP],
		op: Player[PLAYER],
		safe: 0,
		cango: 0,
		canstop: false,
		foundend: false,
		foundlow: false,
		count: new Array(NUM_CARDS).fill(0),
		playit: new Array(HAND_SZ).fill(false),
		valbuf: new Array(HAND_SZ).fill(0),
		card: 0,
		i: 0,
		value: 0, // index in valbuf
		count200: 0,
		badcount: 0,
		nummin: -1,
		nummax: -1,
		diff: 0,
		curmin: 101,
		curmax: -1,
		oppos: 0,
		safecard: 0
	};

	// Start with Coup Fourré check
	ctx.i = 0;  // Initialize loop counter
	lbl_check_coup_forre(ctx);
}

/*
 * Try for a Coup Forre, and see what we have
 */
function lbl_check_coup_forre(ctx) {
	// Check if loop is done
	if (ctx.i >= HAND_SZ) {
		// No Coup Forre, continue
		return lbl_check_draw(ctx);
	}

	ctx.card = ctx.pp.hand[ctx.i];
	switch (ctx.card) {
		case C_STOP:	case C_CRASH:
		case C_FLAT:	case C_EMPTY:
			if ((ctx.playit[ctx.i] = canplay(ctx.pp, ctx.op, ctx.card)) != 0)
				ctx.canstop = true;
			return lbl_norm(ctx);
		case C_LIMIT:
			if ((ctx.playit[ctx.i] = canplay(ctx.pp, ctx.op, ctx.card))
			    && Numseen[C_25] == Numcards[C_25]
			    && Numseen[C_50] == Numcards[C_50])
				ctx.canstop = true;
			return lbl_norm(ctx);
		case C_25:	case C_50:	case C_75:
		case C_100:	case C_200:
			if ((ctx.playit[ctx.i] = canplay(ctx.pp, ctx.op, ctx.card))
			    && ctx.pp.mileage + Value[ctx.card] == End)
				ctx.foundend = true;
			return lbl_norm(ctx);
		default:
			ctx.playit[ctx.i] = canplay(ctx.pp, ctx.op, ctx.card);
			return lbl_norm(ctx);
		case C_GAS_SAFE:	case C_DRIVE_SAFE:
		case C_SPARE_SAFE:	case C_RIGHT_WAY:
			if (ctx.pp.battle == opposite(ctx.card) ||
			    (ctx.pp.speed == C_LIMIT && ctx.card == C_RIGHT_WAY)) {
				setMovetype(M_PLAY);
				setCard_no(ctx.i);
				return;
			}
			++ctx.safe;
			ctx.playit[ctx.i] = true;
			break;
	}
	if (ctx.card >= 0)
		++ctx.count[ctx.card];

	// Continue loop (for safety cards that don't return lbl_norm)
	ctx.i++;
	return lbl_check_coup_forre(ctx);
}

/*
 * norm label - increment cango and continue loop
 */
function lbl_norm(ctx) {
	if (ctx.playit[ctx.i])
		++ctx.cango;
	if (ctx.card >= 0)
		++ctx.count[ctx.card];

	// Continue the loop
	ctx.i++;
	if (ctx.i < HAND_SZ)
		return lbl_check_coup_forre(ctx);

	// Loop done
	return lbl_check_draw(ctx);
}

/*
 * Check if need to draw to fill hand
 */
function lbl_check_draw(ctx) {
	if (ctx.pp.hand[0] == C_INIT && Topcard > 0) {
		setMovetype(M_DRAW);
		return;
	}

	if (Debug)
		console.log("CALCMOVE: cango = " + ctx.cango + ", canstop = " + ctx.canstop + ", safe = " + ctx.safe);

	if (ctx.foundend)
		ctx.foundend = !check_ext(true);

	return lbl_check_safeties(ctx);
}

/*
 * Check if should play a safety
 */
function lbl_check_safeties(ctx) {
	for (ctx.i = 0; ctx.safe && ctx.i < HAND_SZ; ctx.i++) {
		if (is_safety(ctx.pp.hand[ctx.i])) {
			if (onecard(ctx.op) || (ctx.foundend && ctx.cango && !ctx.canstop)) {
				if (Debug)
					console.log("CALCMOVE: onecard(op) = " + onecard(ctx.op) + ", foundend = " + ctx.foundend);
				return lbl_playsafe(ctx);
			}
			ctx.oppos = opposite(ctx.pp.hand[ctx.i]);
			if (Numseen[ctx.oppos] == Numcards[ctx.oppos] &&
			    !(ctx.pp.hand[ctx.i] == C_RIGHT_WAY &&
			      Numseen[C_LIMIT] != Numcards[C_LIMIT]))
				return lbl_playsafe(ctx);
			else if (!ctx.cango
			    && (ctx.op.can_go || !ctx.pp.can_go || Topcard < 0)) {
				ctx.card = (Topcard - 0) - roll(1, 10);
				if ((!ctx.pp.mileage) != (!ctx.op.mileage))
					ctx.card -= 7;
				if (Debug)
					console.log("CALCMOVE: card = " + ctx.card + ", DECK_SZ / 4 = " + (DECK_SZ / 4));
				if (ctx.card < DECK_SZ / 4)
					return lbl_playsafe(ctx);
			}
			ctx.safe--;
			ctx.playit[ctx.i] = ctx.cango;
		}
	}

	if (!ctx.pp.can_go && !is_repair(ctx.pp.battle))
		Numneed[opposite(ctx.pp.battle)]++;

	return lbl_redoit(ctx);
}

/*
 * playsafe label - play the safety card at position i
 */
function lbl_playsafe(ctx) {
	setMovetype(M_PLAY);
	setCard_no(ctx.i);
}

/*
 * redoit label - restart evaluation of hand
 */
function lbl_redoit(ctx) {
	ctx.foundlow = (ctx.cango || ctx.count[C_END_LIMIT] != 0
			  || Numseen[C_LIMIT] == Numcards[C_LIMIT]
			  || ctx.pp.safety[S_RIGHT_WAY_IDX] != S_UNKNOWN);
	ctx.foundend = false;
	ctx.count200 = ctx.pp.nummiles[C_200];
	ctx.badcount = 0;
	ctx.curmax = -1;
	ctx.curmin = 101;
	ctx.nummin = -1;
	ctx.nummax = -1;

	return lbl_evaluate_cards(ctx);
}

/*
 * Evaluate each card in hand
 */
function lbl_evaluate_cards(ctx) {
	for (ctx.i = 0; ctx.i < HAND_SZ; ctx.i++) {
		ctx.value = ctx.i; // index in valbuf
		ctx.card = ctx.pp.hand[ctx.i];

		if (is_safety(ctx.card) || ctx.playit[ctx.i] == (ctx.cango != 0)) {
			if (Debug)
				console.log("CALCMOVE: switch(\"" + C_name[ctx.card] + "\")");

			switch (ctx.card) {
				case C_25:	case C_50:
					ctx.diff = End - ctx.pp.mileage;
					// avoid getting too close
					if (Topcard > 0 && ctx.cango && ctx.diff <= 100
					    && Math.floor(ctx.diff / Value[ctx.card]) > ctx.count[ctx.card]
					    && (ctx.card == C_25 || ctx.diff % 50 == 0)) {
						if (ctx.card == C_50 && ctx.diff - 50 == 25
						    && ctx.count[C_25] > 0) {
							// goto okay - fall through to okay code
						} else {
							ctx.valbuf[ctx.value] = 0;
							if (--ctx.cango <= 0)
								return lbl_redoit(ctx);
							break;
						}
					}
					// okay label
					ctx.valbuf[ctx.value] = Math.floor(Value[ctx.card] / 8);
					if (ctx.pp.speed == C_LIMIT)
						++ctx.valbuf[ctx.value];
					else
						--ctx.valbuf[ctx.value];
					if (!ctx.foundlow
					   && (ctx.card == C_50 || ctx.count[C_50] == 0)) {
						ctx.valbuf[ctx.value] = (ctx.pp.mileage ? 10 : 20);
						ctx.foundlow = true;
					}
					// goto miles - fall through to miles code
					lbl_miles(ctx);
					break;

				case C_200:
					if (++ctx.count200 > 2) {
						ctx.valbuf[ctx.value] = 0;
						break;
					}
					// fall through
				case C_75:	case C_100:
					ctx.valbuf[ctx.value] = Math.floor(Value[ctx.card] / 8);
					if (ctx.pp.speed == C_LIMIT)
						--ctx.valbuf[ctx.value];
					else
						++ctx.valbuf[ctx.value];
					// miles label
					lbl_miles(ctx);
					break;

				case C_END_LIMIT:
					if (ctx.pp.safety[S_RIGHT_WAY_IDX] != S_UNKNOWN)
						ctx.valbuf[ctx.value] = (ctx.pp.safety[S_RIGHT_WAY_IDX] ==
							  S_PLAYED ? -1 : 1);
					else if (ctx.pp.speed == C_LIMIT &&
						 End - ctx.pp.mileage <= 50)
						ctx.valbuf[ctx.value] = 1;
					else if (ctx.pp.speed == C_LIMIT
					    || Numseen[C_LIMIT] != Numcards[C_LIMIT]) {
						ctx.safecard = S_RIGHT_WAY_IDX;
						ctx.oppos = C_LIMIT;
						lbl_repair(ctx);
					}
					else {
						ctx.valbuf[ctx.value] = 0;
						--ctx.count[C_END_LIMIT];
					}
					break;

				case C_REPAIRS:	case C_SPARE:	case C_GAS:
					ctx.safecard = safety(ctx.card) - S_CONV;
					ctx.oppos = opposite(ctx.card);
					if (ctx.pp.safety[ctx.safecard] != S_UNKNOWN)
						ctx.valbuf[ctx.value] = (ctx.pp.safety[ctx.safecard] ==
							  S_PLAYED ? -1 : 1);
					else if (ctx.pp.battle != ctx.oppos
					    && (Numseen[ctx.oppos] == Numcards[ctx.oppos] ||
						Numseen[ctx.oppos] + ctx.count[ctx.card] >
						Numcards[ctx.oppos])) {
						ctx.valbuf[ctx.value] = 0;
						--ctx.count[ctx.card];
					}
					else {
						lbl_repair(ctx);
					}
					break;

				case C_GO:
					if (ctx.pp.safety[S_RIGHT_WAY_IDX] != S_UNKNOWN)
						ctx.valbuf[ctx.value] = (ctx.pp.safety[S_RIGHT_WAY_IDX] ==
							  S_PLAYED ? -1 : 2);
					else if (ctx.pp.can_go
					 && Numgos + ctx.count[C_GO] == Numneed[C_GO]) {
						ctx.valbuf[ctx.value] = 0;
						--ctx.count[C_GO];
					}
					else {
						ctx.valbuf[ctx.value] = Numneed[C_GO] * 3;
						ctx.valbuf[ctx.value] += (Numseen[C_GO] - Numgos);
						ctx.valbuf[ctx.value] = Math.floor(ctx.valbuf[ctx.value] / (ctx.count[C_GO] * ctx.count[C_GO]));
						ctx.count[C_GO]--;
					}
					break;

				case C_LIMIT:
					if (ctx.op.mileage + 50 >= End) {
						ctx.valbuf[ctx.value] = (End == 700 && !ctx.cango) ? 1 : 0;
						break;
					}
					if (ctx.canstop || (ctx.cango && !ctx.op.can_go))
						ctx.valbuf[ctx.value] = 1;
					else {
						ctx.valbuf[ctx.value] = (ctx.pp.safety[S_RIGHT_WAY_IDX] !=
							  S_UNKNOWN ? 2 : 3);
						ctx.safecard = S_RIGHT_WAY_IDX;
						ctx.oppos = C_END_LIMIT;
						lbl_normbad(ctx);
					}
					break;

				case C_CRASH:	case C_EMPTY:	case C_FLAT:
					ctx.safecard = safety(ctx.card) - S_CONV;
					ctx.oppos = opposite(ctx.card);
					ctx.valbuf[ctx.value] = (ctx.pp.safety[ctx.safecard] != S_UNKNOWN ? 3 : 4);
					lbl_normbad(ctx);
					break;

				case C_STOP:
					if (ctx.op.safety[S_RIGHT_WAY_IDX] == S_PLAYED)
						ctx.valbuf[ctx.value] = -1;
					else {
						ctx.valbuf[ctx.value] = (ctx.pp.safety[S_RIGHT_WAY_IDX] !=
							  S_UNKNOWN ? 3 : 4);
						ctx.valbuf[ctx.value] *= Numcards[C_STOP] +
							  Numseen[C_GO];
						if (!ctx.pp.mileage || ctx.foundend ||
						    onecard(ctx.op))
							ctx.valbuf[ctx.value] += 5;
						if (!ctx.cango)
							ctx.valbuf[ctx.value] = Math.floor(ctx.valbuf[ctx.value] / ++ctx.badcount);
						if (ctx.op.mileage == 0)
							ctx.valbuf[ctx.value] += 5;
						if ((ctx.card == C_LIMIT &&
						     ctx.op.speed == C_LIMIT) ||
						    !ctx.op.can_go)
							ctx.valbuf[ctx.value] -= 5;
						if (ctx.cango && ctx.pp.safety[S_RIGHT_WAY_IDX] !=
							     S_UNKNOWN)
							ctx.valbuf[ctx.value] += 5;
					}
					break;

				case C_GAS_SAFE:	case C_DRIVE_SAFE:
				case C_SPARE_SAFE:	case C_RIGHT_WAY:
					ctx.valbuf[ctx.value] = ctx.cango ? 0 : 101;
					break;

				case C_INIT:
					ctx.valbuf[ctx.value] = 0;
					break;
			}
		}
		else
			ctx.valbuf[ctx.value] = ctx.cango ? 0 : 101;

		if (ctx.card != C_INIT) {
			if (ctx.valbuf[ctx.value] >= ctx.curmax) {
				ctx.nummax = ctx.i;
				ctx.curmax = ctx.valbuf[ctx.value];
			}
			if (ctx.valbuf[ctx.value] <= ctx.curmin) {
				ctx.nummin = ctx.i;
				ctx.curmin = ctx.valbuf[ctx.value];
			}
		}
		if (Debug)
			mvprintw(ctx.i + 6, 2, "%3d %-14s", ctx.valbuf[ctx.value],
				 C_name[ctx.pp.hand[ctx.i]]);
	}

	if (!ctx.pp.can_go && !is_repair(ctx.pp.battle))
		Numneed[opposite(ctx.pp.battle)]++;

	return lbl_play_it(ctx);
}

/*
 * miles label - check if mileage puts us at/over end
 */
function lbl_miles(ctx) {
	if (ctx.pp.mileage + Value[ctx.card] > End)
		ctx.valbuf[ctx.value] = (End == 700 ? ctx.card : 0);
	else if (ctx.pp.mileage + Value[ctx.card] == End) {
		ctx.valbuf[ctx.value] = (ctx.foundend ? ctx.card : V_VALUABLE);
		ctx.foundend = true;
	}
}

/*
 * repair label - calculate value for repair cards
 */
function lbl_repair(ctx) {
	ctx.valbuf[ctx.value] = Numcards[ctx.oppos] * 6;
	ctx.valbuf[ctx.value] += Numseen[ctx.card] - Numseen[ctx.oppos];
	if (!ctx.cango)
		ctx.valbuf[ctx.value] = Math.floor(ctx.valbuf[ctx.value] / (ctx.count[ctx.card] * ctx.count[ctx.card]));
	ctx.count[ctx.card]--;
}

/*
 * normbad label - calculate value for hazard cards
 */
function lbl_normbad(ctx) {
	if (ctx.op.safety[ctx.safecard] == S_PLAYED)
		ctx.valbuf[ctx.value] = -1;
	else {
		ctx.valbuf[ctx.value] *= Numneed[ctx.oppos] +
			  Numseen[ctx.oppos] + 2;
		if (!ctx.pp.mileage || ctx.foundend ||
		    onecard(ctx.op))
			ctx.valbuf[ctx.value] += 5;
		if (ctx.op.mileage == 0 || onecard(ctx.op))
			ctx.valbuf[ctx.value] += 5;
		if (ctx.op.speed == C_LIMIT)
			ctx.valbuf[ctx.value] -= 3;
		if (ctx.cango &&
		    ctx.pp.safety[ctx.safecard] != S_UNKNOWN)
			ctx.valbuf[ctx.value] += 3;
		if (!ctx.cango)
			ctx.valbuf[ctx.value] = Math.floor(ctx.valbuf[ctx.value] / ++ctx.badcount);
	}
}

/*
 * play_it label - decide to play or discard
 */
function lbl_play_it(ctx) {
	if (ctx.cango) {
		mvaddstr(MOVE_Y + 1, MOVE_X, "PLAY\n");
		setMovetype(M_PLAY);
		setCard_no(ctx.nummax);
	}
	else {
		if (is_safety(ctx.pp.hand[ctx.nummin])) {
			// NEVER discard a safety
			ctx.nummax = ctx.nummin;
			mvaddstr(MOVE_Y + 1, MOVE_X, "PLAY\n");
			setMovetype(M_PLAY);
			setCard_no(ctx.nummax);
		} else {
			mvaddstr(MOVE_Y + 1, MOVE_X, "DISCARD\n");
			setMovetype(M_DISCARD);
			setCard_no(ctx.nummin);
		}
	}
	mvprintw(MOVE_Y + 2, MOVE_X, "%16s", C_name[ctx.pp.hand[ctx.nummin >= 0 ? (ctx.cango ? ctx.nummax : ctx.nummin) : 0]]);
}

/*
 * Return true if the given player could conceivably win with his next card.
 */
export function onecard(pp) {
	let bat, spd, card;

	bat = pp.battle;
	spd = pp.speed;
	card = -1;
	if (pp.can_go || ((is_repair(bat) || bat == C_STOP || spd == C_LIMIT) &&
			   Numseen[S_RIGHT_WAY_IDX] != 0) ||
	    (bat >= 0 && Numseen[safety(bat)] != 0))
		switch (End - pp.mileage) {
		  case 200:
			if (pp.nummiles[C_200] == 2)
				return false;
			card = C_200;
			/* FALLTHROUGH */
		  case 100:
		  case 75:
			if (card == -1)
				card = (End - pp.mileage == 75 ? C_75 : C_100);
			if (spd == C_LIMIT)
				return Numseen[S_RIGHT_WAY_IDX] == 0;
		  case 50:
		  case 25:
			if (card == -1)
				card = (End - pp.mileage == 25 ? C_25 : C_50);
			return Numseen[card] != Numcards[card];
		}
	return false;
}
