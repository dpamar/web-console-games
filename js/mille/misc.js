/*	$NetBSD: misc.c,v 1.11 2003/08/07 09:37:25 agc Exp $	*/

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
 * @(#)misc.c	1.2 (Berkeley) 3/28/83
 */

// Keyboard input queue for async readch
let keyQueue = [];
let keyWaiters = [];

// Setup keyboard listener
if (typeof document !== 'undefined') {
	document.addEventListener('keydown', (e) => {
		// Prevent default for game keys to avoid browser shortcuts
		if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
		}

		const key = e.key;

		// If someone is waiting for a key, resolve them immediately
		if (keyWaiters.length > 0) {
			const resolve = keyWaiters.shift();
			resolve(key);
		} else {
			// Otherwise queue the key
			keyQueue.push(key);
		}
	});
}

import { wmove, wclrtoeol, refresh, addstr, waddstr, clrtoeol, leaveok, addch, wrefresh, getCurscr } from '../ncurses/ncurses.js';
import {
	ERR_Y, ERR_X, PLAYER, COMP, HAND_SZ, NUM_SAFE,
	S_UNKNOWN, S_PLAYED, Value, C_LIMIT, C_STOP,
	C_200, EXTENSIONPROMPT, other, is_safety
} from './constants.js';
import {
	Player, End, Play, Saved, Topcard, Deck, On_exit,
	setEnd, setFinished, setSaved, setOn_exit,
	Score, Board
} from './state.js';
import { onecard } from './comp.js';
import { prompt } from './move.js';
import { die } from './main.js';

/*
 * @(#)misc.c	1.2 (Berkeley) 3/28/83
 */

const NUMSAFE = 4;

// Error message tracking - don't clear automatically, only on next move
let hasError = false;

export function error(str, ...args) {
	// Simple sprintf-like formatting
	let formatted = str;
	let argIdx = 0;
	formatted = formatted.replace(/%[sd]/g, () => {
		if (argIdx < args.length) {
			return String(args[argIdx++]);
		}
		return '';
	});

	wmove(Score, ERR_Y, ERR_X);
	waddstr(Score, formatted);
	wclrtoeol(Score);
	wrefresh(Score);
	// putchar('\07');  // Bell - skip in browser

	hasError = true;

	return false;
}

// Clear error message at start of next move
export function clearError() {
	if (hasError) {
		wmove(Score, ERR_Y, ERR_X);
		wclrtoeol(Score);
		wrefresh(Score);
		hasError = false;
	}
}

export async function getcard() {
	let c, c1;

	for (;;) {
		while ((c = await readch()) == '\n' || c == '\r' || c == ' ')
			continue;
		if (c >= 'a' && c <= 'z')
			c = c.toUpperCase();
		if (c == killchar() || c == erasechar())
			return -1;
		addstr(unctrl(c));
		clrtoeol();
		switch (c) {
		  case '1':	case '2':	case '3':
		  case '4':	case '5':	case '6':
			c = c.charCodeAt(0) - '0'.charCodeAt(0);
			break;
		  case '0':	case 'P':	case 'p':
			c = 0;
			break;
		  default:
			// putchar('\07');
			addch('\b');
			if (!isprint(c))
				addch('\b');
			c = -1;
			break;
		}
		refresh();
		if (c >= 0) {
			// Wait for Enter/Space to confirm, allow backspace to restart
			for (;;) {
				c1 = await readch();
				if (c1 == '\r' || c1 == '\n' || c1 == ' ') {
					return c;
				} else if (c1 == killchar()) {
					return -1;
				} else if (c1 == erasechar()) {
					// Backspace: erase the digit and go back to outer loop
					addch('\b');
					clrtoeol();
					refresh();
					break; // Exit inner loop, go back to outer loop to read char again
				}
				// Ignore other characters and continue waiting
			}
		}
	}
}

export async function check_ext(forcomp) {
	if (End == 700)
		if (Play == PLAYER) {
			if (await getyn(EXTENSIONPROMPT)) {
				if (!forcomp)
					setEnd(1000);
				return true;
			}
			else {
				if (!forcomp)
					setFinished(true);
				return false;
			}
		}
		else {
			let pp, op;
			let i, safe, miles;

			pp = Player[COMP];
			op = Player[PLAYER];
			for (safe = 0, i = 0; i < NUMSAFE; i++)
				if (pp.safety[i] != S_UNKNOWN)
					safe++;
			if (safe < 2) {
				setFinished(true);
				return false;
			}
			if (op.mileage == 0 || onecard(op)
			    || (op.can_go && op.mileage >= 500)) {
				setFinished(true);
				return false;
			}
			for (miles = 0, i = 0; i < NUMSAFE; i++)
				if (op.safety[i] != S_PLAYED
				    && pp.safety[i] == S_UNKNOWN)
					miles++;
			if (miles + safe == NUMSAFE) {
				setEnd(1000);
				return true;
			}
			for (miles = 0, i = 0; i < HAND_SZ; i++)
				if ((safe = pp.hand[i]) <= C_200)
					miles += Value[safe];
			if (miles + (Topcard - Deck) * 3 > 1000) {
				setEnd(1000);
				return true;
			}
			setFinished(true);
			return false;
		}
	else {
		setFinished(true);
		return false;
	}
}

/*
 *	Get a yes or no answer to the given question.  Saves are
 * also allowed.  Return TRUE if the answer was yes, FALSE if no.
 */
export async function getyn(promptno) {
	let c;

	setSaved(false);
	for (;;) {
		leaveok(Board, false);
		prompt(promptno);
		clrtoeol();
		refresh();
		switch (c = await readch()) {
		  case 'n':	case 'N':
			addch('N');
			refresh();
			leaveok(Board, true);
			return false;
		  case 'y':	case 'Y':
			addch('Y');
			refresh();
			leaveok(Board, true);
			return true;
		  case 's':	case 'S':
			addch('S');
			refresh();
			setSaved(save());
			continue;
		  case '\x0c':  // CTRL('L')
			const curscr = getCurscr();
			if (curscr) wrefresh(curscr);
			break;
		  default:
			addstr(unctrl(c));
			refresh();
			// putchar('\07');
			break;
		}
	}
}

/*
 *	Check to see if more games are desired.  If not, and game
 * came from a saved file, make sure that they don't want to restore
 * it.  Exit appropriately.
 */
export async function check_more() {
	setOn_exit(true);
	if (Player[PLAYER].total >= 5000 || Player[COMP].total >= 5000)
		if (await getyn(ANOTHERGAMEPROMPT))
			return;
		else {
			/*
			 * must do accounting normally done in main()
			 */
			if (Player[PLAYER].total > Player[COMP].total)
				Player[PLAYER].games++;
			else if (Player[PLAYER].total < Player[COMP].total)
				Player[COMP].games++;
			Player[COMP].total = 0;
			Player[PLAYER].total = 0;
		}
	else
		if (await getyn(ANOTHERHANDPROMPT))
			return;
	die(0);
}

export async function readch() {
	let key;

	// If we have a queued key, return it immediately
	if (keyQueue.length > 0) {
		key = keyQueue.shift();
	} else {
		// Otherwise wait for a key
		key = await new Promise((resolve) => {
			keyWaiters.push(resolve);
		});
	}

	// Convert browser key names to ncurses/C conventions
	if (key === 'Enter') return '\n';
	if (key === 'Backspace') return '\x08';
	if (key.length === 1) return key;

	// For other special keys, return as-is
	return key;
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

// Constants for prompt types
const ANOTHERGAMEPROMPT = 3;
const ANOTHERHANDPROMPT = 2;
const SAVEGAMEPROMPT = 4;

/**
 * Reset misc state for clean restart (when launched from menu)
 */
export function resetMiscState() {
	keyQueue = [];
	keyWaiters = [];
	hasError = false;
}
