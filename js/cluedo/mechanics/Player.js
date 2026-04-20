import { KnowledgeGrid } from '../logic/KnowledgeGrid.js';
import { Deck } from '../models/Deck.js';
import { CardType } from '../models/CardType.js';
import { CluedoRandom } from '../utils/JavaRandom.js';
import { Proposition } from './Proposition.js';

/**
 * Represents a Cluedo player with AI logic for deduction and strategy.
 * Tracks own cards and maintains knowledge about other players' cards.
 * Can generate propositions and make accusations based on deductive reasoning.
 */
export class Player {
    constructor(number) {
        this.number = number;
        this.myCards = [];
        this.knowledgeGrid = new KnowledgeGrid(number);
    }

    getNumber() {
        return this.number;
    }

    addCard(card) {
        this.myCards.push(card);
        this.knowledgeGrid.addCardToPlayer(this.number - 1, card);
    }

    getMyCards() {
        return [...this.myCards];
    }

    hasCard(card) {
        return this.knowledgeGrid.playerHasCard(this.number - 1, card);
    }

    findCardToShow(proposition) {
        const availableCards = [];
        for (const card of proposition.getCards()) {
            if (this.hasCard(card)) {
                availableCards.push(card);
            }
        }

        if (availableCards.length === 0) {
            return null;
        }

        const random = CluedoRandom.getInstance();
        return availableCards[random.nextInt(availableCards.length)];
    }

    handleProposition(requestingPlayer, proposition, playerWhoShowed, cardShown) {
        if (playerWhoShowed === this.number) {
            return;
        }

        if (cardShown !== null) {
            if (requestingPlayer === this.number) {
                this.knowledgeGrid.addCardToPlayer(playerWhoShowed - 1, cardShown);
            } else {
                this.knowledgeGrid.addCombinationOfCardsToPlayer(playerWhoShowed - 1, ...proposition.getCards());
            }
        }
    }

    handleNoCardToShow(playerWithoutCards, proposition) {
        if (playerWithoutCards === this.number) {
            return;
        }
        for (const card of proposition.getCards()) {
            this.knowledgeGrid.removeCardFromPlayer(playerWithoutCards - 1, card);
        }
    }

    selectBestCard(type, uncertainCards) {
        if (uncertainCards.length === 0) {
            const fallbackCards = [];
            for (const card of Deck.allCardsOfType(type)) {
                if (!this.hasCard(card)) {
                    fallbackCards.push(card);
                }
            }
            if (fallbackCards.length === 0) {
                const allOfType = Deck.allCardsOfType(type);
                return allOfType[CluedoRandom.getInstance().nextInt(allOfType.length)];
            }
            return fallbackCards[CluedoRandom.getInstance().nextInt(fallbackCards.length)];
        }

        const potentialSolutionCards = [];
        for (const card of uncertainCards) {
            let couldBeSolution = true;
            for (let player = 0; player < 6; player++) {
                if (this.knowledgeGrid.playerHasCard(player, card)) {
                    couldBeSolution = false;
                    break;
                }
            }
            if (couldBeSolution) {
                potentialSolutionCards.push(card);
            }
        }

        const targetCards = potentialSolutionCards.length > 0 ? potentialSolutionCards : uncertainCards;
        return targetCards[CluedoRandom.getInstance().nextInt(targetCards.length)];
    }

    generateProposition(allCards) {
        const uncertainCards = {
            [CardType.SUSPECT]: [],
            [CardType.WEAPON]: [],
            [CardType.ROOM]: []
        };

        for (const card of allCards) {
            if (this.hasCard(card)) {
                continue;
            }

            let someoneDefinitelyHas = false;
            for (let player = 0; player < 6; player++) {
                if (this.knowledgeGrid.playerHasCard(player, card)) {
                    someoneDefinitelyHas = true;
                    break;
                }
            }

            if (!someoneDefinitelyHas) {
                uncertainCards[card.type].push(card);
            }
        }

        return new Proposition(
            this.selectBestCard(CardType.SUSPECT, uncertainCards[CardType.SUSPECT]),
            this.selectBestCard(CardType.WEAPON, uncertainCards[CardType.WEAPON]),
            this.selectBestCard(CardType.ROOM, uncertainCards[CardType.ROOM])
        );
    }

    canAccuse() {
        return this.knowledgeGrid.getSolutionProposition();
    }

    updateDeductions() {
        this.knowledgeGrid.refreshDeductions();
    }

    getName() {
        return `Joueur ${this.number}`;
    }

    toString() {
        return `${this.getName()} (cartes: ${this.myCards.join(', ')})`;
    }
}
