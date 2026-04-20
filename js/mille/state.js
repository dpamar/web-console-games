/*	$NetBSD: extern.c,v 1.7 2003/08/07 09:37:25 agc Exp $	*/

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
 * @(#)extern.c	1.1 (Berkeley) 4/1/82
 */

import {
	NUM_CARDS, DECK_SZ, COMP, W_SMALL,
	C_25, C_50, C_75, C_100, C_200,
	C_EMPTY, C_FLAT, C_CRASH, C_STOP, C_LIMIT,
	C_GAS, C_SPARE, C_REPAIRS, C_GO, C_END_LIMIT,
	C_GAS_SAFE, C_SPARE_SAFE, C_DRIVE_SAFE, C_RIGHT_WAY,
	other
} from './constants.js';
import { PLAY } from './player.js';

export let Debug = false;		/* set if debugging code on		*/
export let Finished = false;		/* set if current hand is finished	*/
export let Next = false;		/* set if changing players		*/
export let On_exit = false;		/* set if game saved on exiting		*/
export let Order = false;		/* set if hand should be sorted		*/
export let Saved = false;		/* set if game just saved		*/
export let Standalone = true;		/* set if running in standalone mode	*/

export let Initstr = new Array(100);	/* initial string for error field	*/
for (let i = 0; i < 100; i++) Initstr[i] = '\0';

export const Fromfile = null;		/* startup file for game		*/

export let Card_no = 0;			/* Card number for current move		*/
export let End = 0;			/* End value for current hand		*/
export let Handstart = COMP;		/* Player who starts hand		*/
export let Movetype = 0;		/* Current move type			*/
export let Play = 0;			/* Current player			*/
export let Numgos = 0;			/* Number of Go cards used by computer	*/
export let Window = W_SMALL;		/* Current window wanted		*/
export let Numseen = new Array(NUM_CARDS);	/* Number of cards seen in current hand	*/
for (let i = 0; i < NUM_CARDS; i++) Numseen[i] = 0;

export let Numneed = [		/* number of cards needed per hand	*/
	0,	/* C_25 */
	0,	/* C_50 */
	0,	/* C_75 */
	0,	/* C_100 */
	0,	/* C_200 */
	2,	/* C_EMPTY */
	2,	/* C_FLAT */
	2,	/* C_CRASH */
	4,	/* C_STOP */
	3,	/* C_LIMIT */
	2,	/* C_GAS */
	2,	/* C_SPARE */
	2,	/* C_REPAIRS */
	10,	/* C_GO */
	3,	/* C_END_LIMIT */
	1,	/* C_GAS_SAFE */
	1,	/* C_SPARE_SAFE */
	1,	/* C_DRIVE_SAFE */
	1,	/* C_RIGHT_WAY */
	0	/* C_INIT */
];

export let Discard = 0;			/* Top of discard pile			*/
export let Sh_discard = 0;		/* Last discard card shown		*/
export let Topcard = null;		/* Pointer to next card to be picked	*/

export let Deck = [			/* Current deck				*/
	C_25, C_25, C_25, C_25, C_25, C_25, C_25, C_25, C_25, C_25,
	C_50, C_50, C_50, C_50, C_50, C_50, C_50, C_50, C_50, C_50,
	C_75, C_75, C_75, C_75, C_75, C_75, C_75, C_75, C_75, C_75,
	C_100, C_100, C_100, C_100, C_100, C_100, C_100, C_100, C_100,
	C_100, C_100, C_100,
	C_200, C_200, C_200, C_200,
	C_EMPTY, C_EMPTY,
	C_FLAT, C_FLAT,
	C_CRASH, C_CRASH,
	C_STOP, C_STOP, C_STOP, C_STOP,
	C_LIMIT, C_LIMIT, C_LIMIT,
	C_GAS, C_GAS, C_GAS, C_GAS, C_GAS, C_GAS,
	C_SPARE, C_SPARE, C_SPARE, C_SPARE, C_SPARE, C_SPARE,
	C_REPAIRS, C_REPAIRS, C_REPAIRS, C_REPAIRS, C_REPAIRS,
		C_REPAIRS,
	C_END_LIMIT, C_END_LIMIT, C_END_LIMIT, C_END_LIMIT, C_END_LIMIT,
		C_END_LIMIT,
	C_GO, C_GO, C_GO, C_GO, C_GO, C_GO, C_GO, C_GO, C_GO, C_GO,
		C_GO, C_GO, C_GO, C_GO,
	C_GAS_SAFE, C_SPARE_SAFE, C_DRIVE_SAFE, C_RIGHT_WAY
];

export let outf = null;

export let Player = [new PLAY(), new PLAY()];	/* Player descriptions			*/

export let Board = null;		/* Playing field screen			*/
export let Miles = null;		/* Mileage screen			*/
export let Score = null;		/* Score screen				*/

// Setters for mutable state
export function setDebug(val) { Debug = val; }
export function setFinished(val) { Finished = val; }
export function setNext(val) { Next = val; }
export function setOn_exit(val) { On_exit = val; }
export function setOrder(val) { Order = val; }
export function setSaved(val) { Saved = val; }
export function setStandalone(val) { Standalone = val; }
export function setCard_no(val) { Card_no = val; }
export function setEnd(val) { End = val; }
export function setHandstart(val) { Handstart = val; return val; }
export function setMovetype(val) { Movetype = val; return val; }
export function setPlay(val) { Play = val; return val; }
export function setNumgos(val) { Numgos = val; return val; }
export function setWindow(val) { Window = val; return val; }
export function setDiscard(val) { Discard = val; }
export function setSh_discard(val) { Sh_discard = val; }
export function setTopcard(val) { Topcard = val; }
export function setBoard(val) { Board = val; }
export function setMiles(val) { Miles = val; }
export function setScore(val) { Score = val; }
export function setOutf(val) { outf = val; }

// nextplay implementation
export function nextplay() {
	Play = other(Play);
}
