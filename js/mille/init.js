/*	$NetBSD: init.c,v 1.9 2003/08/07 09:37:25 agc Exp $	*/

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
 * @(#)init.c	1.1 (Berkeley) 4/1/82
 */

import { move, mvaddstr, mvaddch, werase, mvwaddstr, wmove, wclrtobot, wclrtoeol, clrtoeol, standout, standend, setStdscr, addch } from '../ncurses/ncurses.js';
import {
	NUM_SAFE, NUM_MILES, HAND_SZ, DECK_SZ, PLAYER, COMP,
	C_INIT, S_UNKNOWN, S_CONV, S_IN_HAND,
	W_FULL, MOVE_Y, MOVE_X, EXT_Y, EXT_X, is_safety,
	SCORE_Y, SCORE_X, BOARD_Y, BOARD_X, MILES_Y, MILES_X
} from './constants.js';
import {
	Player, Numseen, Numgos, Order, Topcard, Deck, Discard, Finished, End,
	setNumgos, setDiscard, setFinished, setEnd, setSh_discard, setTopcard,
	Board, Miles, Score, Window, Standalone
} from './state.js';
import { roll } from './roll.js';
import { account, sort, resetMoveState } from './move.js';
import { resetMiscState } from './misc.js';

export function init() {
	let pp;
	let i, j;
	let card;

	Numseen.fill(0);
	setNumgos(0);

	for (i = 0; i < 2; i++) {
		pp = Player[i];
		pp.hand[0] = C_INIT;
		for (j = 0; j < NUM_SAFE; j++) {
			pp.safety[j] = S_UNKNOWN;
			pp.coups[j] = false;
		}
		for (j = 1; j < HAND_SZ; j++) {
			setTopcard(Topcard - 1);
			pp.hand[j] = Deck[Topcard];
			if (i == COMP) {
				card = Deck[Topcard];
				account(card);
				if (is_safety(card))
					pp.safety[card - S_CONV] = S_IN_HAND;
			}
		}
		pp.mileage = 0;
		pp.hand_tot = 0;
		pp.safescore = 0;
		pp.coupscore = 0;
		pp.can_go = false;
		pp.speed = C_INIT;
		pp.battle = C_INIT;
		pp.new_speed = false;
		pp.new_battle = false;
		for (j = 0; j < NUM_MILES; j++)
			pp.nummiles[j] = 0;
	}
	if (Order)
		sort(Player[PLAYER].hand);
	setDiscard(C_INIT);
	setFinished(false);
	setEnd(700);
}

export function shuffle() {
	let i, r;
	let temp;

	for (i = 0; i < DECK_SZ; i++) {
		r = roll(1, DECK_SZ) - 1;
		if (r < 0 || r > DECK_SZ - 1) {
			console.warn("shuffle: card no. error: " + r);
			process.exit(1);
		}
		temp = Deck[r];
		Deck[r] = Deck[i];
		Deck[i] = temp;
	}
	setTopcard(DECK_SZ);
}

// Static variables (persist between calls)
let firstBoard = true;
let was_full = -1;
let last_win = -1;

export function newboard() {
	let i;
	let pp;

	if (firstBoard) {
		werase(Board);
		werase(Score);
		mvaddstr(5, 0, "--HAND--");
		mvaddch(6, 0, 'P');
		mvaddch(7, 0, '1');
		mvaddch(8, 0, '2');
		mvaddch(9, 0, '3');
		mvaddch(10, 0, '4');
		mvaddch(11, 0, '5');
		mvaddch(12, 0, '6');
		mvaddstr(13, 0, "--BATTLE--");
		mvaddstr(15, 0, "--SPEED--");
		mvaddstr(5, 20, "--DECK--");
		mvaddstr(7, 20, "--DISCARD--");
		mvaddstr(13, 20, "--BATTLE--");
		mvaddstr(15, 20, "--SPEED--");
		mvwaddstr(Miles, 0, 0, "--MILEAGE--");
		mvwaddstr(Miles, 0, 41, "--MILEAGE--");
		setSh_discard(-1);
		for (pp = Player[0], i = 0; i <= 1; pp = Player[++i]) {
			for (let j = 0; j < HAND_SZ; j++)
				pp.sh_hand[j] = -1;
			pp.sh_battle = -1;
			pp.sh_speed = -1;
			pp.sh_mileage = -1;
		}
		firstBoard = false;
	}
	else {
		for (i = 0; i < 5; i++) {
			move(i, 0);
			clrtoeol();
		}
		wmove(Miles, 1, 0);
		wclrtobot(Miles);
		wmove(Board, MOVE_Y + 1, MOVE_X);
		wclrtoeol(Board);
		wmove(Board, MOVE_Y + 2, MOVE_X);
		wclrtoeol(Board);
	}
	setSh_discard(-1);
	for (pp = Player[0], i = 0; i <= 1; pp = Player[++i]) {
		for (let j = 0; j < NUM_SAFE; j++)
			pp.sh_safety[j] = false;
		for (let j = 0; j < NUM_MILES; j++)
			pp.sh_nummiles[j] = 0;
		pp.sh_safescore = -1;
	}
	newscore();
}

export function newscore() {
	let i, new_;
	let pp;

	if (was_full < 0)
		was_full = (Window != W_FULL);
	setStdscr(Score);

	new_ = false;

	// Check if we need to redraw (first time or window mode changed)
	if (last_win < 0 || (Window == W_FULL || Finished) != was_full) {
		werase(Score);
		mvaddstr(0, 22,  "You   Comp   Value");
		mvaddstr(1, 2, "Milestones Played");
		mvaddstr(2, 8, "Each Safety");
		mvaddstr(3, 5, "All 4 Safeties");
		mvaddstr(4, 3, "Each Coup Fourre");
		mvaddstr(2, 37, "100");
		mvaddstr(3, 37, "300");
		mvaddstr(4, 37, "300");
		new_ = true;
	}
	if (new_) {
		for (i = 0; i < SCORE_Y; i++)
			mvaddch(i, 0, '|');
		move(SCORE_Y - 1, 1);
		for (i = 0; i < SCORE_X; i++)
			addch('_');
		for (pp = Player[0], i = 0; i <= 1; pp = Player[++i]) {
			pp.sh_hand_tot = -1;
			pp.sh_total = -1;
			pp.sh_games = -1;
			pp.sh_safescore = -1;
		}
	}
	Player[PLAYER].was_finished = !Finished;
	Player[COMP].was_finished = !Finished;
	if (Window == W_FULL || Finished) {
		if (!was_full || new_) {
			mvaddstr(5, 5, "Trip Completed");
			mvaddstr(6, 10, "Safe Trip");
			mvaddstr(7, 5, "Delayed Action");
			mvaddstr(8, 10, "Extension");
			mvaddstr(9, 11, "Shut-Out");
			mvaddstr(10, 21, "----   ----   -----");
			mvaddstr(11, 9, "Hand Total");
			mvaddstr(12, 20, "-----  -----");
			mvaddstr(13, 6, "Overall Total");
			mvaddstr(14, 15, "Games");
			mvaddstr(5, 37, "400");
			mvaddstr(6, 37, "300");
			mvaddstr(7, 37, "300");
			mvaddstr(8, 37, "200");
			mvaddstr(9, 37, "500");
		}
	}
	else
		if (was_full || new_) {
			mvaddstr(5, 21, "----   ----   -----");
			mvaddstr(6, 9, "Hand Total");
			mvaddstr(7, 20, "-----  -----");
			mvaddstr(8, 6, "Overall Total");
			mvaddstr(9, 15, "Games");
			mvaddstr(11, 2, "p: pick");
			mvaddstr(12, 2, "u: use #");
			mvaddstr(13, 2, "d: discard #");
			mvaddstr(14, 2, "w: toggle window");
			// Clear line before writing to avoid overlap
			move(11, 21);
			clrtoeol();
			if (!Order)
				mvaddstr(11, 21, "o: order hand");
			else
				mvaddstr(11, 21, "o: stop ordering");
			mvaddstr(12, 21, "r: reprint");
			if (!Standalone)
				mvaddstr(13, 21, "q: quit");
		}
	setStdscr(Board);
	was_full = (Window == W_FULL || Finished);
	last_win = Window;
}

/**
 * Reset game state for clean restart (when launched from menu)
 */
export function resetGame() {
	// Reset static variables in init.js
	firstBoard = true;
	was_full = -1;
	last_win = -1;

	// Reset static variables in move.js
	resetMoveState();

	// Reset static variables in misc.js
	resetMiscState();

	// Clear the output container
	const outputContainer = document.getElementById('output-container');
	if (outputContainer) {
		outputContainer.innerHTML = '';
	}
}
