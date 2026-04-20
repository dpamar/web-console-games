/*	$NetBSD: move.c,v 1.15 2004/11/05 21:30:32 dsl Exp $	*/

/*
 * Copyright (c) 1983, 1993
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
 * @(#)move.c	1.2 (Berkeley) 3/28/83
 */

import { move, addch, addstr, refresh, leaveok, standout, standend, mvwaddstr, wclrtoeol, clrtoeol, wrefresh, getCurscr, wmove } from '../ncurses/ncurses.js';
import {
	HAND_SZ, PLAYER, COMP, M_DISCARD, M_PLAY, M_DRAW, M_ORDER,
	C_INIT, is_safety, Value, C_200, C_100, C_75, C_50, C_25,
	C_GAS, C_SPARE, C_REPAIRS, C_GO, C_STOP, C_END_LIMIT,
	C_EMPTY, C_FLAT, C_CRASH, C_LIMIT,
	C_GAS_SAFE, C_SPARE_SAFE, C_DRIVE_SAFE, C_RIGHT_WAY,
	opposite, S_CONV, S_PLAYED, S_RIGHT_WAY, S_IN_HAND, NUM_SAFE,
	SC_COUP, SC_SAFETY, SC_ALL_SAFE, other, C_name,
	W_SMALL, W_FULL, MOVEPROMPT, MOVE_Y, MOVE_X
} from './constants.js';
import {
	Player, Play, Movetype, Card_no, Next, Order, Topcard, Deck,
	Discard, Finished, End, Debug, outf, Numseen, Numgos, Window,
	On_exit, Score, Board, Standalone,
	setNext, setCard_no, setMovetype, setDiscard, setFinished,
	setOn_exit, setNumgos, setOrder, setTopcard, setWindow, nextplay
} from './state.js';
import { is_repair, safety } from './types.js';
import { error, getcard, readch, check_ext, clearError } from './misc.js';
import { Numcards } from './constants.js';
import { calcmove } from './comp.js';
import { canplay } from './table.js';
import { rub } from './main.js';
import { prboard, prscore } from './print.js';
import { newscore } from './init.js';
import { undoex } from './end.js';

/*
 * @(#)move.c	1.2 (Berkeley) 3/28/83
 */

const CTRL = (c) => (c.charCodeAt(0) - 'A'.charCodeAt(0) + 1);

// Static variables (persist between calls)
let last_ex = false;	/* set if last command was E */
let last_prompt = -1;	/* last prompt displayed */

export async function domove() {
	let pp;
	let i, j;
	let goodplay;

	pp = Player[Play];
	if (!pp) {
		console.error("domove: Player[Play] is undefined, Play =", Play);
		return;
	}
	for (i = 0, j = 0; i < HAND_SZ; i++)
		if (pp.hand[i] != -1)
			j++;
	if (!j) {
		nextplay();
		return;
	}
	if (Play == PLAYER)
		await getmove();
	else
		calcmove();
	setNext(false);
	goodplay = true;
	switch (Movetype) {
	  case M_DISCARD:
		if (haspicked(pp)) {
			if (pp.hand[Card_no] == C_INIT)
				if (Card_no == 6)
					setFinished(true);
				else
					error("no card there");
			else {
				if (is_safety(pp.hand[Card_no])) {
					error("discard a safety?");
					goodplay = false;
					break;
				}
				setDiscard(pp.hand[Card_no]);
				pp.hand[Card_no] = C_INIT;
				setNext(true);
				if (Play == PLAYER)
					account(Discard);
			}
		}
		else
			error("must pick first");
		break;
	  case M_PLAY:
		goodplay = await playcard(pp);
		break;
	  case M_DRAW:
		setCard_no(0);
		if (Topcard <= 0)
			error("no more cards");
		else if (haspicked(pp))
			error("already picked");
		else {
			setTopcard(Topcard - 1);
			pp.hand[0] = Deck[Topcard];
			if (Debug)
				console.log("DOMOVE: Draw " + C_name[Deck[Topcard]]);
			// acc: label (replaced goto with inline)
			if (Play == COMP) {
				account(Deck[Topcard]);
				if (is_safety(Deck[Topcard]))
					pp.safety[Deck[Topcard]-S_CONV] = S_IN_HAND;
			}
			if (pp.hand[1] == C_INIT && Topcard > 0) {
				setCard_no(1);
				setTopcard(Topcard - 1);
				pp.hand[1] = Deck[Topcard];
				if (Debug)
					console.log("DOMOVE: Draw " + C_name[Deck[Topcard]]);
				// // goto acc; // FIXME: label removed - inline the code instead
				if (Play == COMP) {
					account(Deck[Topcard]);
					if (is_safety(Deck[Topcard]))
						pp.safety[Deck[Topcard]-S_CONV] = S_IN_HAND;
				}
			}
			pp.new_battle = false;
			pp.new_speed = false;
		}
		break;

	  case M_ORDER:
		break;
	}
	/*
	 * move blank card to top by one of two methods.  If the
	 * computer's hand was sorted, the randomness for picking
	 * between equally valued cards would be lost
	 */
	if (Order && Movetype != M_DRAW && goodplay && pp == Player[PLAYER])
		sort(pp.hand);
	else
		for (i = 1; i < HAND_SZ; i++)
			if (pp.hand[i] == C_INIT) {
				for (j = 0; pp.hand[j] == C_INIT; j++)
					if (j >= HAND_SZ) {
						j = 0;
						break;
					}
				pp.hand[i] = pp.hand[j];
				pp.hand[j] = C_INIT;
			}
	if (Topcard <= 0)
		check_go();
	if (Next)
		nextplay();
}

/*
 *	Check and see if either side can go.  If they cannot,
 * the game is over
 */
export function check_go() {
	let card;
	let pp, op;
	let i;

	for (let p = 0; p < 2; p++) {
		pp = Player[p];
		op = (p == COMP ? Player[PLAYER] : Player[COMP]);
		for (i = 0; i < HAND_SZ; i++) {
			card = pp.hand[i];
			if (is_safety(card) || canplay(pp, op, card)) {
				if (Debug) {
					console.log("CHECK_GO: can play " + C_name[card] + " (" + card + "), ");
					console.log("is_safety(card) = " + is_safety(card) + ", ");
					console.log("canplay(pp, op, card) = " + canplay(pp, op, card));
				}
				return;
			}
			else if (Debug)
				console.log("CHECK_GO: cannot play " + C_name[card]);
		}
	}
	setFinished(true);
}

export async function playcard(pp) {
	let v;
	let card;

	/*
	 * check and see if player has picked
	 */
	switch (pp.hand[Card_no]) {
	  default:
		if (!haspicked(pp))
			return error("must pick first");
	  case C_GAS_SAFE:	case C_SPARE_SAFE:
	  case C_DRIVE_SAFE:	case C_RIGHT_WAY:
		break;
	}

	card = pp.hand[Card_no];
	if (Debug)
		console.log("PLAYCARD: Card = " + C_name[card]);
	setNext(false);
	switch (card) {
	  case C_200:
		if (pp.nummiles[C_200] == 2)
			return error("only two 200's per hand");
	  case C_100:	case C_75:
		if (pp.speed == C_LIMIT)
			return error("limit of 50");
	  case C_50:
		if (pp.mileage + Value[card] > End)
			return error("puts you over " + End);
	  case C_25:
		if (!pp.can_go)
			return error("cannot move now");
		pp.nummiles[card]++;
		v = Value[card];
		pp.total += v;
		pp.hand_tot += v;
		if ((pp.mileage += v) == End)
			await check_ext(false);
		break;

	  case C_GAS:	case C_SPARE:	case C_REPAIRS:
		if (pp.battle != opposite(card))
			return error("can't play \"" + C_name[card] + "\"");
		pp.battle = card;
		if (pp.safety[S_RIGHT_WAY] == S_PLAYED)
			pp.can_go = true;
		break;

	  case C_GO:
		if (pp.battle != C_INIT && pp.battle != C_STOP
		    && !is_repair(pp.battle))
			return error("cannot play \"Go\" on a \"" + C_name[pp.battle] + "\"");
		pp.battle = C_GO;
		pp.can_go = true;
		break;

	  case C_END_LIMIT:
		if (pp.speed != C_LIMIT)
			return error("not limited");
		pp.speed = C_END_LIMIT;
		break;

	  case C_EMPTY:	case C_FLAT:	case C_CRASH:
	  case C_STOP:
		pp = Player[other(Play)];
		if (!pp.can_go)
			return error("opponent cannot go");
		else if (pp.safety[safety(card) - S_CONV] == S_PLAYED)
			return error("opponent is protected");
		pp.battle = card;
		pp.new_battle = true;
		pp.can_go = false;
		pp = Player[Play];
		break;

	  case C_LIMIT:
		pp = Player[other(Play)];
		if (pp.speed == C_LIMIT)
			return error("opponent has limit");
		if (pp.safety[S_RIGHT_WAY] == S_PLAYED)
			return error("opponent is protected");
		pp.speed = C_LIMIT;
		pp.new_speed = true;
		pp = Player[Play];
		break;

	  case C_GAS_SAFE:	case C_SPARE_SAFE:
	  case C_DRIVE_SAFE:	case C_RIGHT_WAY:
		if (pp.battle == opposite(card)
		    || (card == C_RIGHT_WAY && pp.speed == C_LIMIT)) {
			if (!(card == C_RIGHT_WAY && !is_repair(pp.battle))) {
				pp.battle = C_GO;
				pp.can_go = true;
			}
			if (card == C_RIGHT_WAY && pp.speed == C_LIMIT)
				pp.speed = C_INIT;
			if (pp.new_battle
			    || (pp.new_speed && card == C_RIGHT_WAY)) {
				pp.coups[card - S_CONV] = true;
				pp.total += SC_COUP;
				pp.hand_tot += SC_COUP;
				pp.coupscore += SC_COUP;
			}
		}
		/*
		 * if not coup, must pick first
		 */
		else if (pp.hand[0] == C_INIT && Topcard > 0)
			return error("must pick first");
		pp.safety[card - S_CONV] = S_PLAYED;
		pp.total += SC_SAFETY;
		pp.hand_tot += SC_SAFETY;
		if ((pp.safescore += SC_SAFETY) == NUM_SAFE * SC_SAFETY) {
			pp.total += SC_ALL_SAFE;
			pp.hand_tot += SC_ALL_SAFE;
		}
		if (card == C_RIGHT_WAY) {
			if (pp.speed == C_LIMIT)
				pp.speed = C_INIT;
			if (pp.battle == C_STOP || pp.battle == C_INIT) {
				pp.can_go = true;
				pp.battle = C_INIT;
			}
			if (!pp.can_go && is_repair(pp.battle))
				pp.can_go = true;
		}
		setNext(-1);
		break;

	  case C_INIT:
		error("no card there");
		setNext(-1);
		break;
	}
	if (pp == Player[PLAYER])
		account(card);
	pp.hand[Card_no] = C_INIT;
	setNext(Next == -1 ? false : true);
	return true;
}

export async function getmove() {
	let c;

	if (last_ex) {
		undoex();
		prboard();
		last_ex = false;
	}

	for (;;) {
		prompt(MOVEPROMPT);
		leaveok(Board, false);
		refresh();
		while ((c = await readch()) == killchar() || c == erasechar())
			continue;
		if (c >= 'a' && c <= 'z')
			c = c.toUpperCase();
		if (isprint(c) && !isspace(c)) {
			addch(c);
			refresh();
		}
		switch (c) {
		  case 'P':		/* Pick */
			clearError(); // Clear error on valid command
			setMovetype(M_DRAW);
			leaveok(Board, true);
			return;
		  case 'U':		/* Use Card */
		  case 'D':		/* Discard Card */
			{
				const cardno = await getcard();
				if (cardno < 0) {
					// User cancelled, erase the command letter and continue loop
					addch('\b');
					clrtoeol();
					refresh();
					continue; // Go back to start of loop, don't break
				}
				clearError(); // Clear error on valid command
				setCard_no(cardno);
				setMovetype(c == 'U' ? M_PLAY : M_DISCARD);
				leaveok(Board, true);
				return;
			}
		  case 'O':		/* Order */
			clearError(); // Clear error on valid command
			setOrder(!Order);
			if (Window == W_SMALL) {
				// Clear only the order line (line 11) to avoid erasing "r: reprint" on line 12
				wmove(Score, 11, 21);
				wclrtoeol(Score);
				if (!Order)
					mvwaddstr(Score, 11, 21,
						  "o: order hand");
				else
					mvwaddstr(Score, 11, 21,
						  "o: stop ordering");
				wrefresh(Score);
			}
			setMovetype(M_ORDER);
			leaveok(Board, true);
			return;
		  case 'Q':		/* Quit */
			if (!Standalone) {
				await rub(0);		/* Same as a rubout */
			}
			break;
		  case 'W':		/* Window toggle */
			setWindow(Window == W_SMALL ? W_FULL : W_SMALL);
			newscore();
			prscore(true);
			wrefresh(Score);
			break;
		  case 'R':		/* Redraw screen */
		  case '\x0c':  // CTRL('L')
			const curscr = getCurscr();
			if (curscr) wrefresh(curscr);
			break;
		  case 'S':		/* Save game - not supported in browser */
			error("Save not supported in browser");
			break;
		  case 'E':		/* Extrapolate */
			if (last_ex)
				break;
			setFinished(true);
			if (Window != W_FULL)
				newscore();
			prscore(false);
			wrefresh(Score);
			last_ex = true;
			setFinished(false);
			break;
		  case '\r':		/* Ignore RETURNs and	*/
		  case '\n':		/* Line Feeds		*/
		  case ' ':		/* Spaces		*/
		  case '\0':		/* and nulls		*/
			break;
		  case 'Z':		/* Debug code */
			// Debug code omitted for browser
			break;
		  default:
			error("unknown command: " + unctrl(c));
			break;
		}
	}
	leaveok(Board, true);
}

/*
 * return whether or not the player has picked
 */
export function haspicked(pp) {
	let card;

	if (Topcard <= 0)
		return true;
	switch (pp.hand[Card_no]) {
	  case C_GAS_SAFE:	case C_SPARE_SAFE:
	  case C_DRIVE_SAFE:	case C_RIGHT_WAY:
		card = 1;
		break;
	  default:
		card = 0;
		break;
	}
	return (pp.hand[card] != C_INIT);
}

export function account(card) {
	let oppos;

	if (card == C_INIT)
		return;
	++Numseen[card];
	if (Play == COMP)
		switch (card) {
		  case C_GAS_SAFE:
		  case C_SPARE_SAFE:
		  case C_DRIVE_SAFE:
			oppos = opposite(card);
			setNumgos(Numgos + Numcards[oppos] - Numseen[oppos]);
			break;
		  case C_CRASH:
		  case C_FLAT:
		  case C_EMPTY:
		  case C_STOP:
			setNumgos(Numgos + 1);
			break;
		}
}

export function prompt(promptno) {
	const names = [
				">>:Move:",
				"Really?",
				"Another hand?",
				"Another game?",
				"Save game?",
				"Same file?",
				"file:",
				"Extension?",
				"Overwrite file?",
			];

	if (promptno == last_prompt)
		move(MOVE_Y, MOVE_X + names[promptno].length + 1);
	else {
		move(MOVE_Y, MOVE_X);
		if (promptno == MOVEPROMPT)
			standout();
		addstr(names[promptno]);
		if (promptno == MOVEPROMPT)
			standend();
		addch(' ');
		last_prompt = promptno;
	}
	clrtoeol();
}

export function sort(hand) {
	let cp, tp;
	let temp;

	for (cp = 0; cp < HAND_SZ - 1; cp++)
		for (tp = cp + 1; tp < HAND_SZ; tp++)
			if (hand[cp] > hand[tp]) {
				temp = hand[cp];
				hand[cp] = hand[tp];
				hand[tp] = temp;
			}
}

// Helper functions
function killchar() {
	return '\x15';  // CTRL-U
}

function erasechar() {
	return '\x08';  // Backspace
}

function unctrl(c) {
	if (typeof c === 'string') {
		c = c.charCodeAt(0);
	}
	if (c < 32) {
		return '^' + String.fromCharCode(c + 64);
	}
	if (c == 127) {
		return '^?';
	}
	return String.fromCharCode(c);
}

function isprint(c) {
	if (typeof c === 'string') {
		c = c.charCodeAt(0);
	}
	return c >= 32 && c < 127;
}

function isspace(c) {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

/**
 * Reset move state for clean restart (when launched from menu)
 */
export function resetMoveState() {
	last_ex = false;
	last_prompt = -1;
}
