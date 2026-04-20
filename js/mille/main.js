/*	$NetBSD: mille.c,v 1.13 2003/08/07 09:37:25 agc Exp $	*/

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
 * @(#)mille.c	1.3 (Berkeley) 5/10/83
 */

import { initscr, delwin, newwin, leaveok, clearok, cbreak, noecho, mvcur, endwin, LINES, COLS, getCurscr, setStdscr } from '../ncurses/ncurses.js';
import {
	BOARD_Y, BOARD_X, SCORE_Y, SCORE_X, MILES_Y, MILES_X,
	PLAYER, COMP, other, ERR_Y, ERR_X, REALLYPROMPT
} from './constants.js';
import {
	Player, Play, Handstart, On_exit, Finished, Initstr, Debug,
	setPlay, setHandstart, setBoard, setScore, setMiles, setDebug, setOn_exit,
	Board, Score, Miles
} from './state.js';
import { shuffle, init, newboard } from './init.js';
import { domove } from './move.js';
import { newscore } from './init.js';
import { prboard } from './print.js';
import { check_more, getyn } from './misc.js';

/*
 * @(#)mille.c	1.3 (Berkeley) 5/10/83
 */

export async function main(ac, av) {
	let restore;

	// Debug mode check omitted

	restore = false;
	switch (ac) {
	  case 2:
		rest_f(av[1]);
		restore = true;
	  case 1:
		break;
	  default:
		console.log("usage: milles [ restore_file ]");
		return;
	}
	setPlay(PLAYER);
	let stdscr = initscr();
	delwin(stdscr);
	stdscr = newwin(BOARD_Y, BOARD_X, 0, 0);
	setBoard(stdscr);
	setStdscr(stdscr);  // Set ncurses stdscr to Board window
	setScore(newwin(SCORE_Y, SCORE_X, 0, 40));
	setMiles(newwin(MILES_Y, MILES_X, 17, 0));
	leaveok(Score, true);
	leaveok(Miles, true);
	let curscr = getCurscr();
	if (curscr) clearok(curscr, true);
	// srandom(getpid()) - use Date.now() in browser
	Math.seedrandom = Math.seedrandom || function() {};
	cbreak();
	noecho();
	// signal(SIGINT, rub) - browser doesn't have signals
	for (;;) {
		// Give browser a chance to render between games
		await new Promise(resolve => setTimeout(resolve, 0));

		if (!restore || (Player[PLAYER].total >= 5000
		    || Player[COMP].total >= 5000)) {
			if (Player[COMP].total < Player[PLAYER].total)
				Player[PLAYER].games++;
			else if (Player[COMP].total > Player[PLAYER].total)
				Player[COMP].games++;
			Player[COMP].total = 0;
			Player[PLAYER].total = 0;
		}
		do {
			if (!restore)
				setHandstart(setPlay(other(Handstart)));
			if (!restore || On_exit) {
				shuffle();
				init();
			}
			newboard();
			if (restore)
				mvwaddstr(Score, ERR_Y, ERR_X, Initstr);
			prboard();
			do {
				// Give browser a chance to render and process events
				await new Promise(resolve => setTimeout(resolve, 0));
				await domove();
				if (Finished)
					newscore();
				prboard();
			} while (!Finished);
			await check_more();
			restore = false;
			setOn_exit(false);
		} while (Player[COMP].total < 5000
		    && Player[PLAYER].total < 5000);
	}
}

/*
 *	Routine to trap rubouts, and make sure they really want to
 * quit.
 */
export async function rub(dummy) {
	// signal(SIGINT, SIG_IGN);
	if (await getyn(REALLYPROMPT))
		die(0);
	// signal(SIGINT, rub);
}

/*
 *	Time to go beddy-by
 */
export function die(code) {
	// signal(SIGINT, SIG_IGN);
	if (outf)
		; // fflush(outf);
	mvcur(0, COLS - 1, LINES - 1, 0);
	endwin();
	// Browser: just stop the game loop
	throw new Error('EXIT_' + code);
}

// Stubs and imports
let outf;
function rest_f(file) {
	// Stub - save/restore not implemented yet
}

import { mvwaddstr } from '../ncurses/ncurses.js';

export function setOutf(val) { outf = val; }
