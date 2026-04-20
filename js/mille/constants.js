/*	$NetBSD: mille.h,v 1.13 2004/01/27 20:30:30 jsm Exp $	*/

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
 *
 *	@(#)mille.h	8.1 (Berkeley) 5/31/93
 */

/*
 * @(#)mille.h	1.1 (Berkeley) 4/1/82
 */

/*
 * Miscellaneous constants
 */

export const HAND_SZ = 7;		/* number of cards in a hand	*/
export const DECK_SZ = 101;		/* number of cards in decks	*/
export const NUM_SAFE = 4;		/* number of saftey cards	*/
export const NUM_MILES = 5;		/* number of milestones types	*/
export const NUM_CARDS = 20;		/* number of types of cards	*/
export const BOARD_Y = 17;		/* size of board screen		*/
export const BOARD_X = 40;
export const MILES_Y = 7;		/* size of mileage screen	*/
export const MILES_X = 80;
export const SCORE_Y = 17;		/* size of score screen		*/
export const SCORE_X = 40;
export const MOVE_Y = 10;		/* Where to print move prompt	*/
export const MOVE_X = 20;
export const ERR_Y = 15;		/* Where to print errors	*/
export const ERR_X = 5;
export const EXT_Y = 4;			/* Where to put Extension	*/
export const EXT_X = 9;

export const PLAYER = 0;
export const COMP = 1;

export const W_SMALL = 0;		/* Small (initial) window	*/
export const W_FULL = 1;		/* Full (final) window		*/

/*
 * Move types
 */

export const M_DISCARD = 0;
export const M_DRAW = 1;
export const M_PLAY = 2;
export const M_ORDER = 3;

/*
 * Scores
 */

export const SC_SAFETY = 100;
export const SC_ALL_SAFE = 300;
export const SC_COUP = 300;
export const SC_TRIP = 400;
export const SC_SAFE = 300;
export const SC_DELAY = 300;
export const SC_EXTENSION = 200;
export const SC_SHUT_OUT = 500;

/*
 * safety descriptions
 */

export const S_UNKNOWN = 0;		/* location of safety unknown	*/
export const S_IN_HAND = 1;		/* safety in player's hand	*/
export const S_PLAYED = 2;		/* safety has been played	*/
export const S_GAS_SAFE = 0;		/* Gas safety card index	*/
export const S_SPARE_SAFE = 1;		/* Tire safety card index	*/
export const S_DRIVE_SAFE = 2;		/* Driveing safety card index	*/
export const S_RIGHT_WAY = 3;		/* Right-of-Way card index	*/
export const S_CONV = 15;		/* conversion from C_ to S_	*/

/*
 * card numbers
 */

export const C_INIT = -1;
export const C_25 = 0;
export const C_50 = 1;
export const C_75 = 2;
export const C_100 = 3;
export const C_200 = 4;
export const C_EMPTY = 5;
export const C_FLAT = 6;
export const C_CRASH = 7;
export const C_STOP = 8;
export const C_LIMIT = 9;
export const C_GAS = 10;
export const C_SPARE = 11;
export const C_REPAIRS = 12;
export const C_GO = 13;
export const C_END_LIMIT = 14;
export const C_GAS_SAFE = 15;
export const C_SPARE_SAFE = 16;
export const C_DRIVE_SAFE = 17;
export const C_RIGHT_WAY = 18;

/*
 * prompt types
 */

export const MOVEPROMPT = 0;
export const REALLYPROMPT = 1;
export const ANOTHERHANDPROMPT = 2;
export const ANOTHERGAMEPROMPT = 3;
export const SAVEGAMEPROMPT = 4;
export const SAMEFILEPROMPT = 5;
export const FILEPROMPT = 6;
export const EXTENSIONPROMPT = 7;
export const OVERWRITEFILEPROMPT = 8;

/*
 * macros
 */

export const other = (x) => (1 - x);
export const nextplay = () => { /* implemented in state */ };
export const nextwin = (x) => (1 - x);
export const opposite = (x) => (Opposite[x]);
export const is_safety = (x) => (x >= C_GAS_SAFE);

/*
 * Value array
 */
export const Value = [	/* Value of mileage cards	*/
	25, 50, 75, 100, 200
];

/*
 * Numcards array
 */
export const Numcards = [	/* Number of cards in deck		*/
	10,	/* C_25 */
	10,	/* C_50 */
	10,	/* C_75 */
	12,	/* C_100 */
	4,	/* C_200 */
	2,	/* C_EMPTY */
	2,	/* C_FLAT */
	2,	/* C_CRASH */
	4,	/* C_STOP */
	3,	/* C_LIMIT */
	6,	/* C_GAS */
	6,	/* C_SPARE */
	6,	/* C_REPAIRS */
	14,	/* C_GO */
	6,	/* C_END_LIMIT */
	1,	/* C_GAS_SAFE */
	1,	/* C_SPARE_SAFE */
	1,	/* C_DRIVE_SAFE */
	1,	/* C_RIGHT_WAY */
	0	/* C_INIT */
];

/*
 * Opposite array
 */
export const Opposite = [	/* Opposites of each card	*/
	C_25, C_50, C_75, C_100, C_200, C_GAS, C_SPARE,
	C_REPAIRS, C_GO, C_END_LIMIT, C_EMPTY, C_FLAT, C_CRASH,
	C_STOP, C_LIMIT, C_EMPTY, C_FLAT, C_CRASH, C_STOP, C_INIT
];

/*
 * C_name array
 */
const _cn = [	/* Card name buffer		*/
	"",
	"25",
	"50",
	"75",
	"100",
	"200",
	"Out of Gas",
	"Flat Tire",
	"Accident",
	"Stop",
	"Speed Limit",
	"Gasoline",
	"Spare Tire",
	"Repairs",
	"Go",
	"End of Limit",
	"Extra Tank",
	"Puncture Proof",
	"Driving Ace",
	"Right of Way"
];

export const C_name = _cn.slice(1);	/* Card names (skip first)	*/

/*
 * C_fmt
 */
export const C_fmt = "%-18.18s";	/* format for printing cards	*/
