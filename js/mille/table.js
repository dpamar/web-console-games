/*	$NetBSD: table.c,v 1.7 2004/01/27 20:30:30 jsm Exp $	*/

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
 * @(#)table.c	1.1 (Berkeley) 4/1/82
 */

import {
	C_200, C_75, C_100, C_50, C_25,
	C_EMPTY, C_FLAT, C_CRASH, C_STOP, C_LIMIT,
	C_GAS, C_SPARE, C_REPAIRS, C_GO, C_END_LIMIT,
	C_GAS_SAFE, C_SPARE_SAFE, C_DRIVE_SAFE, C_RIGHT_WAY,
	Value, opposite, S_RIGHT_WAY, S_CONV, S_PLAYED
} from './constants.js';
import { is_repair, safety } from './types.js';
import { End } from './state.js';

export function canplay(pp, op, card) {
	switch (card) {
	  case C_200:
		if (pp.nummiles[C_200] == 2)
			break;
		/* FALLTHROUGH */
	  case C_75:	case C_100:
		if (pp.speed == C_LIMIT)
			break;
		/* FALLTHROUGH */
	  case C_50:
		if (pp.mileage + Value[card] > End)
			break;
		/* FALLTHROUGH */
	  case C_25:
		if (pp.can_go)
			return true;
		break;
	  case C_EMPTY:	case C_FLAT:	case C_CRASH:
	  case C_STOP:
		if (op.can_go && op.safety[safety(card) - S_CONV] != S_PLAYED)
			return true;
		break;
	  case C_LIMIT:
		if (op.speed != C_LIMIT &&
		    op.safety[S_RIGHT_WAY] != S_PLAYED &&
		    op.mileage + 50 < End)
			return true;
		break;
	  case C_GAS:	case C_SPARE:	case C_REPAIRS:
		if (pp.battle == opposite(card))
			return true;
		break;
	  case C_GO:
		if (!pp.can_go &&
		    (is_repair(pp.battle) || pp.battle == C_STOP))
			return true;
		break;
	  case C_END_LIMIT:
		if (pp.speed == C_LIMIT)
			return true;
	}
	return false;
}
