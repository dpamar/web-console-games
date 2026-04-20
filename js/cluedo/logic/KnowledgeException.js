import { SettingsManager } from '../utils/SettingsManager.js';
import { KnowledgeDebug } from './KnowledgeDebug.js';

/**
 * Exception thrown when knowledge grid detects an inconsistency.
 * Contains context for debugging (seed, player, card, etc.)
 */
export class KnowledgeException extends Error {
    constructor(owner, seed, type, card, player) {
        super(`KnowledgeException: ${type}`);
        this.owner = owner;
        this.seed = seed;
        this.type = type;
        this.card = card;
        this.player = player;
    }

    toString() {
        return `KnowledgeException{` +
            `owner=${this.owner}, ` +
            `seed=${this.seed}, ` +
            `type=${this.type}, ` +
            `card=${this.card || 'N/A'}, ` +
            `player=${this.player}, ` +
            `\n -- steps to reproduce: \n${KnowledgeDebug.getStepsToReproduce()}` +
            `, \n -- additional logs=\n${KnowledgeDebug.getLogs(this.owner)}` +
            `}`;
    }

    static Builder = class {
        constructor(owner, type) {
            this.owner = owner;
            this.type = type;
            this.seed = SettingsManager.seed();
            this.card = null;
            this.player = -1;
        }

        setCard(card) {
            this.card = card;
            return this;
        }

        setPlayer(player) {
            this.player = player;
            return this;
        }

        buildAndThrow() {
            throw new KnowledgeException(this.owner, this.seed, this.type, this.card, this.player);
        }
    };
}

export const KnowledgeExceptionType = {
    TRUE_WHEN_ALREADY_FALSE: 'TRUE_WHEN_ALREADY_FALSE',
    FALSE_WHEN_ALREADY_TRUE: 'FALSE_WHEN_ALREADY_TRUE',
    NO_POSSIBILITY_IN_SET: 'NO_POSSIBILITY_IN_SET',
    TOO_MUCH_OPTIONS_FOR_SINGLE_SLOT: 'TOO_MUCH_OPTIONS_FOR_SINGLE_SLOT',
    CANNOT_SATISFY_ALL_COMBINATIONS: 'CANNOT_SATISFY_ALL_COMBINATIONS'
};
