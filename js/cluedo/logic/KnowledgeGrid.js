import { Deck } from '../models/Deck.js';
import { CardType } from '../models/CardType.js';
import { Proposition } from '../mechanics/Proposition.js';
import { KnowledgeException, KnowledgeExceptionType } from './KnowledgeException.js';
import { KnowledgeDebug } from './KnowledgeDebug.js';

const CARDS_PER_PLAYER = 3;

/**
 * Knowledge value types
 */
const KnowledgeValueType = {
    YES: 'YES',
    NO: 'NO',
    MAYBE: 'MAYBE'
};

/**
 * Represents knowledge about a single card for a player.
 * Uses bitmask for tracking combinations of possible cards.
 */
class KnowledgeValue {
    constructor(type, additionalData) {
        this.type = type;
        this.additionalData = additionalData;
    }

    static init() {
        return new KnowledgeValue(KnowledgeValueType.MAYBE, 0n);
    }

    hasCard() {
        return this.type === KnowledgeValueType.YES;
    }

    doesNotHaveCard() {
        return this.type === KnowledgeValueType.NO;
    }

    isMaybe() {
        return this.type === KnowledgeValueType.MAYBE;
    }

    isKnown() {
        return this.type !== KnowledgeValueType.MAYBE;
    }

    toString() {
        return `${this.type}/${this.additionalData}`;
    }

    isPartOfCombination(combinationNumber) {
        return !this.isKnown() && (this.additionalData & (1n << BigInt(combinationNumber))) !== 0n;
    }

    addCombination(combinationNumber) {
        if (!this.isKnown() && !this.isPartOfCombination(combinationNumber)) {
            return this.toggleCombination(combinationNumber);
        }
        return this;
    }

    toggleCombination(combinationNumber) {
        return new KnowledgeValue(KnowledgeValueType.MAYBE, this.additionalData ^ (1n << BigInt(combinationNumber)));
    }

    removeCombination(combinationNumber) {
        return this.isPartOfCombination(combinationNumber) ? this.toggleCombination(combinationNumber) : this;
    }
}

/**
 * Represents knowledge about one player's cards.
 */
class KnowledgeRow {
    constructor(playerNumber) {
        this.rowData = new Map();
        Deck.allCards().forEach(card => {
            this.rowData.set(card.hashCode(), KnowledgeValue.init());
        });
        this.finishedRow = false;
        this.playerNumber = playerNumber;
        this.combinationNumber = -1;
    }

    countCellsHaving(condition) {
        return this.getCardsHaving(condition).length;
    }

    getCardsHaving(condition) {
        const results = [];
        for (const [cardHash, value] of this.rowData) {
            if (condition(value)) {
                const card = Deck.allCards().find(c => c.hashCode() === cardHash);
                if (card) results.push(card);
            }
        }
        return results;
    }

    applyForAllCardsHaving(condition, modifier) {
        let hasBeenModified = false;
        const cards = this.getCardsHaving(condition);
        for (const card of cards) {
            hasBeenModified = modifier(card) || hasBeenModified;
        }
        return hasBeenModified;
    }

    checkAllYesCardsAreFound() {
        KnowledgeDebug.log(this.playerNumber + 1, `checkAllYesCardsAreFound for row ${this.playerNumber}`);
        if (this.countCellsHaving(v => v.hasCard()) !== CARDS_PER_PLAYER) {
            return false;
        }
        return this.applyForAllCardsHaving(v => v.isMaybe(), card => this.removeCard(card));
    }

    checkAllNoCardsAreFound() {
        KnowledgeDebug.log(this.playerNumber + 1, `checkAllNoCardsAreFound for row ${this.playerNumber}`);
        if (this.rowData.size - this.countCellsHaving(v => v.doesNotHaveCard()) !== CARDS_PER_PLAYER) {
            return false;
        }
        return this.applyForAllCardsHaving(v => v.isMaybe(), card => this.addCard(card));
    }

    checkForSingleForCombination(combination) {
        KnowledgeDebug.log(this.playerNumber + 1, `checkForSingleForCombination for row ${this.playerNumber}`);
        const cardsWithCombination = this.getCardsHaving(val => val.isPartOfCombination(combination));
        if (cardsWithCombination.length !== 1) {
            return false;
        }
        return this.addCard(cardsWithCombination[0]);
    }

    checkForSingleCombinations() {
        KnowledgeDebug.log(this.playerNumber + 1, `checkForSingleCombinations for row ${this.playerNumber}`);
        if (this.combinationNumber === -1) {
            return false;
        }
        let hasBeenModified = false;
        for (let currentCombination = 0; currentCombination <= this.combinationNumber; currentCombination++) {
            hasBeenModified = this.checkForSingleForCombination(currentCombination) || hasBeenModified;
        }
        return hasBeenModified;
    }

    checkCardsNeededToSatisfyCombinations() {
        KnowledgeDebug.log(this.playerNumber + 1, `checkCardsNeededToSatisfyCombinations for row ${this.playerNumber}`);
        const remainingCards = CARDS_PER_PLAYER - this.countCellsHaving(v => v.hasCard());

        if (remainingCards === 0) {
            return false;
        }

        this.simplifyCombination();
        if (this.combinationNumber === -1) {
            return false;
        }

        const target = (2n << BigInt(this.combinationNumber)) - 1n;
        let hasBeenModified = false;
        const candidatesForAllCombinations = this.getCardsHaving(val => val.additionalData === target);

        if (remainingCards === 1) {
            KnowledgeDebug.log(this.playerNumber + 1, `  1 remaining card for row ${this.playerNumber}`);
            if (candidatesForAllCombinations.length === 0) {
                new KnowledgeException.Builder(this.playerNumber + 1, KnowledgeExceptionType.CANNOT_SATISFY_ALL_COMBINATIONS)
                    .setPlayer(this.playerNumber)
                    .buildAndThrow();
            }
            if (candidatesForAllCombinations.length === 1) {
                KnowledgeDebug.log(this.playerNumber + 1, `  1 remaining card FOUND for row ${this.playerNumber}`);
                hasBeenModified = this.addCard(candidatesForAllCombinations[0]) || hasBeenModified;
            }
            hasBeenModified = this.applyForAllCardsHaving(val => val.isMaybe() && val.additionalData !== target, card => this.removeCard(card)) || hasBeenModified;
        } else if (remainingCards === 2) {
            KnowledgeDebug.log(this.playerNumber + 1, `  2 remaining cards for row ${this.playerNumber}`);
            if (candidatesForAllCombinations.length === 0 && this.combinationNumber >= 1) {
                KnowledgeDebug.log(this.playerNumber + 1, `  more than one combination ${this.playerNumber}`);
                hasBeenModified = this.applyForAllCardsHaving(val => val.isMaybe() && val.additionalData === 0n, card => this.removeCard(card)) || hasBeenModified;
            }
        }

        return hasBeenModified;
    }

    refreshRowV2() {
        if (this.finishedRow) {
            return false;
        }

        let hasBeenModified = false;

        hasBeenModified = this.checkForSingleCombinations() || hasBeenModified;
        hasBeenModified = this.checkAllYesCardsAreFound() || hasBeenModified;
        hasBeenModified = this.checkAllNoCardsAreFound() || hasBeenModified;
        hasBeenModified = this.checkCardsNeededToSatisfyCombinations() || hasBeenModified;

        this.updateFinishedRow();

        return hasBeenModified;
    }

    simplifyCombination() {
        let realCombinationNumber = 0;
        for (let currentCombination = 0; currentCombination <= this.combinationNumber; currentCombination++) {
            let isUsed = false;
            for (const card of Deck.allCards()) {
                if (this.rowData.get(card.hashCode()).isPartOfCombination(currentCombination)) {
                    isUsed = true;
                    if (currentCombination !== realCombinationNumber) {
                        const oldVal = this.rowData.get(card.hashCode());
                        const newVal = oldVal.toggleCombination(currentCombination).toggleCombination(realCombinationNumber);
                        this.rowData.set(card.hashCode(), newVal);
                    }
                }
            }
            if (isUsed) {
                realCombinationNumber++;
            }
        }
        this.combinationNumber = realCombinationNumber - 1;
    }

    updateFinishedRow() {
        this.finishedRow = Array.from(this.rowData.values()).every(v => v.isKnown());
    }

    getValue(card) {
        return this.rowData.get(card.hashCode());
    }

    setValue(card, value) {
        this.rowData.set(card.hashCode(), value);
        KnowledgeDebug.log(this.playerNumber + 1, `Set ${card} value to ${value} for row ${this.playerNumber}`);
    }

    addCard(card) {
        const currentValue = this.getValue(card);
        if (currentValue.hasCard()) {
            return false;
        }
        if (currentValue.doesNotHaveCard()) {
            new KnowledgeException.Builder(this.playerNumber + 1, KnowledgeExceptionType.TRUE_WHEN_ALREADY_FALSE)
                .setCard(card)
                .setPlayer(this.playerNumber)
                .buildAndThrow();
        }

        this.rowData.set(card.hashCode(), new KnowledgeValue(KnowledgeValueType.YES, 0n));

        if (currentValue.type === KnowledgeValueType.MAYBE) {
            for (let currentCombination = 0; currentCombination <= this.combinationNumber; currentCombination++) {
                if (!currentValue.isPartOfCombination(currentCombination)) continue;
                for (const c of Deck.allCards()) {
                    this.setValue(c, this.getValue(c).removeCombination(currentCombination));
                }
            }
        }
        return true;
    }

    removeCard(card) {
        const currentValue = this.getValue(card);
        if (currentValue.doesNotHaveCard()) {
            return false;
        }
        if (currentValue.hasCard()) {
            new KnowledgeException.Builder(this.playerNumber + 1, KnowledgeExceptionType.FALSE_WHEN_ALREADY_TRUE)
                .setCard(card)
                .setPlayer(this.playerNumber)
                .buildAndThrow();
        }
        this.rowData.set(card.hashCode(), new KnowledgeValue(KnowledgeValueType.NO, 0n));
        return true;
    }

    addOneOf(cards) {
        const cardValues = new Map();
        cards.forEach(card => cardValues.set(card, this.getValue(card)));

        if (Array.from(cardValues.values()).some(v => v.hasCard())) {
            return false;
        }

        if (Array.from(cardValues.values()).every(v => v.doesNotHaveCard())) {
            new KnowledgeException.Builder(this.playerNumber + 1, KnowledgeExceptionType.NO_POSSIBILITY_IN_SET)
                .setPlayer(this.playerNumber)
                .buildAndThrow();
        }

        const overlap = Array.from(cardValues.values())
            .filter(v => v.isMaybe())
            .map(v => v.additionalData)
            .reduce((x, y) => x & y, ~0n);

        if (overlap > 0n) {
            return false;
        }

        this.combinationNumber++;
        cardValues.forEach((value, card) => {
            this.setValue(card, value.addCombination(this.combinationNumber));
        });
        return true;
    }
}

/**
 * Main knowledge grid tracking what each player knows about cards.
 * Core of the AI deduction system.
 */
export class KnowledgeGrid {
    constructor(owner) {
        this.owner = owner;
        this.grid = [];
        for (let i = 0; i < 6; i++) {
            this.grid.push(new KnowledgeRow(i));
        }
    }

    playerHasCard(player, card) {
        return this.grid[player].getValue(card).hasCard();
    }

    addCardToPlayer(player, card) {
        if (!this.grid[player].addCard(card)) {
            return;
        }

        for (let i = 0; i < 6; i++) {
            if (i === player) continue;
            this.grid[i].removeCard(card);
        }
        this.refreshDeductions();
    }

    removeCardFromPlayer(player, card) {
        if (!this.grid[player].removeCard(card)) {
            return;
        }
        this.refreshDeductions();
    }

    addCombinationOfCardsToPlayer(player, ...cards) {
        if (!this.grid[player].addOneOf(cards)) {
            return;
        }
        this.refreshDeductions();
    }

    getSolution(type) {
        const targets = Deck.allCardsOfType(type);

        for (const c of targets) {
            if (this.grid.every(row => row.getValue(c).doesNotHaveCard())) {
                return c;
            }
        }

        let notFounds = targets.length;
        let result = null;
        for (const c of targets) {
            if (this.grid.some(row => row.getValue(c).hasCard())) {
                notFounds--;
            } else {
                result = c;
            }
        }

        if (notFounds === 1) {
            for (let i = 0; i < 6; i++) {
                this.removeCardFromPlayer(i, result);
            }
            return result;
        }
        return null;
    }

    refreshDeductions() {
        let needAnotherRefresh = true;
        while (needAnotherRefresh) {
            needAnotherRefresh = false;

            for (const row of this.grid) {
                needAnotherRefresh = row.refreshRowV2() || needAnotherRefresh;
            }

            this.getSolution(CardType.SUSPECT);
            this.getSolution(CardType.WEAPON);
            this.getSolution(CardType.ROOM);
        }
    }

    getSolutionProposition() {
        const suspect = this.getSolution(CardType.SUSPECT);
        const weapon = this.getSolution(CardType.WEAPON);
        const room = this.getSolution(CardType.ROOM);

        if (!suspect || !weapon || !room) {
            return null;
        }
        return new Proposition(suspect, weapon, room);
    }
}
