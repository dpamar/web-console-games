/*	$NetBSD: print.c,v 1.11 2003/08/07 09:37:26 agc Exp $	*/

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
 * @(#)print.c	1.1 (Berkeley) 4/1/82
 */

import { mvaddstr, mvaddch, mvwaddstr, mvprintw, move, standout, addstr, standend, wrefresh, setStdscr } from '../ncurses/ncurses.js';
import {
	NUM_SAFE, S_PLAYED, S_CONV, HAND_SZ, PLAYER,
	C_25, C_200, C_name, C_fmt, COMP, W_FULL,
	EXT_Y, EXT_X
} from './constants.js';
import {
	Player, Board, Miles, Score, End, Topcard, Deck,
	Discard, Sh_discard, Finished, Window,
	setSh_discard
} from './state.js';
import { finalscore, extrapolate } from './end.js';

/*
 * @(#)print.c	1.1 (Berkeley) 4/1/82
 */

const COMP_STRT = 20;
const CARD_STRT = 2;

export function prboard() {
	let pp;
	let i, j, k, temp;

	for (k = 0; k < 2; k++) {
		pp = Player[k];
		temp = k * COMP_STRT + CARD_STRT;
		for (i = 0; i < NUM_SAFE; i++)
			if (pp.safety[i] == S_PLAYED && !pp.sh_safety[i]) {
				mvaddstr(i, temp, C_name[i + S_CONV]);
				if (pp.coups[i])
					mvaddch(i, temp - CARD_STRT, '*');
				pp.sh_safety[i] = true;
			}
		if (pp.battle != pp.sh_battle) {
			const battleName = pp.battle >= 0 ? C_name[pp.battle] : "";
			mvprintw(14, temp, C_fmt, battleName);
			pp.sh_battle = pp.battle;
		}
		if (pp.speed != pp.sh_speed) {
			const speedName = pp.speed >= 0 ? C_name[pp.speed] : "";
			mvprintw(16, temp, C_fmt, speedName);
			pp.sh_speed = pp.speed;
		}
		for (i = C_25; i <= C_200; i++) {
			let name;
			let end;

			if (pp.nummiles[i] == pp.sh_nummiles[i])
				continue;

			name = C_name[i];
			temp = k * 40;
			end = pp.nummiles[i];
			for (j = pp.sh_nummiles[i]; j < end; j++)
				mvwaddstr(Miles, i + 1, (j << 2) + temp, name);
			pp.sh_nummiles[i] = end;
		}
	}
	prscore(true);
	temp = CARD_STRT;
	pp = Player[PLAYER];
	for (i = 0; i < HAND_SZ; i++) {
		if (pp.hand[i] != pp.sh_hand[i]) {
			const cardName = pp.hand[i] >= 0 ? C_name[pp.hand[i]] : "";
			mvprintw(i + 6, temp, C_fmt, cardName);
			pp.sh_hand[i] = pp.hand[i];
		}
	}
	mvprintw(6, COMP_STRT + CARD_STRT, "%2d", Topcard - 0);
	if (Discard != Sh_discard) {
		const discardName = Discard >= 0 ? C_name[Discard] : "";
		mvprintw(8, COMP_STRT + CARD_STRT, C_fmt, discardName);
		setSh_discard(Discard);
	}
	if (End == 1000) {
		move(EXT_Y, EXT_X);
		standout();
		addstr("Extension");
		standend();
	}
	wrefresh(Board);
	wrefresh(Miles);
	wrefresh(Score);
}


const Score_fmt = "%4d";

export function prscore(for_real) {
	let pp;
	let x;

	setStdscr(Score);
	for (let p = 0; p < 2; p++) {
		pp = Player[p];
		x = p * 6 + 21;
		mvprintw(1, x, Score_fmt, pp.mileage);
		pp.sh_mileage = pp.mileage;
		if (pp.safescore != pp.sh_safescore) {
			mvprintw(2, x, Score_fmt, pp.safescore);
			if (pp.safescore == 400)
				mvaddstr(3, x + 1, "300");
			else
				mvaddstr(3, x + 1, "  0");
			mvprintw(4, x, Score_fmt, pp.coupscore);
			pp.sh_safescore = pp.safescore;
		}
		if (Window == W_FULL || Finished) {
			if (for_real)
				finalscore(pp);
			else
				extrapolate(pp);
			if (pp.hand_tot != pp.sh_hand_tot) {
				mvprintw(11, x, Score_fmt, pp.hand_tot);
				pp.sh_hand_tot = pp.hand_tot;
			}
			if (pp.total != pp.sh_total) {
				mvprintw(13, x, Score_fmt, pp.total);
				pp.sh_total = pp.total;
			}
			if (pp.games != pp.sh_games) {
				mvprintw(14, x, Score_fmt, pp.games);
				pp.sh_games = pp.games;
			}
		}
		else {
			if (pp.hand_tot != pp.sh_hand_tot) {
				mvprintw(6, x, Score_fmt, pp.hand_tot);
				pp.sh_hand_tot = pp.hand_tot;
			}
			if (pp.total != pp.sh_total) {
				mvprintw(8, x, Score_fmt, pp.total);
				pp.sh_total = pp.total;
			}
			if (pp.games != pp.sh_games) {
				mvprintw(9, x, Score_fmt, pp.games);
				pp.sh_games = pp.games;
			}
		}
	}
	setStdscr(Board);
}
