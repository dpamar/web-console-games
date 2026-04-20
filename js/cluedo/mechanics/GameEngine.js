import { Deck } from '../models/Deck.js';
import { CardType } from '../models/CardType.js';
import { CluedoRandom } from '../utils/JavaRandom.js';
import { Player } from './Player.js';
import { Proposition } from './Proposition.js';
import { KnowledgeDebug } from '../logic/KnowledgeDebug.js';

const columnOffset = {
    [CardType.SUSPECT]: 0,
    [CardType.WEAPON]: 6,
    [CardType.ROOM]: 12
};

/**
 * Game modes available
 */
export const ModeJeu = {
    REEL: 'REEL',
    ENIGME: 'ENIGME'
};

/**
 * Main game engine for interactive Cluedo with advanced AI and interface.
 * Supports two modes: Real (player vs AI) and Mystery (observe AI game).
 */
export class CluedoGameInteractive {
    constructor(mode) {
        this.mode = mode;
        this.allCards = Deck.allCards();
        this.players = [];
        this.solution = this.generateSolution();
        this.currentPlayer = 1;
        this.gameOver = false;
        this.humanPlayer = 0;
        this.me = null;
        this.gameInterface = null;

        this.initializePlayers();
        this.distributeCards();
    }

    generateSolution() {
        const suspect = Deck.getRandomCardOfType(CardType.SUSPECT);
        const room = Deck.getRandomCardOfType(CardType.ROOM);
        const weapon = Deck.getRandomCardOfType(CardType.WEAPON);
        return new Proposition(suspect, weapon, room);
    }

    initializePlayers() {
        if (this.mode === ModeJeu.REEL) {
            this.humanPlayer = this.choosePlayerNumber();
        } else {
            this.humanPlayer = 0;
        }

        for (let i = 1; i <= 6; i++) {
            this.players.push(new Player(i));
        }
    }

    choosePlayerNumber() {
        const random = CluedoRandom.getInstance();
        return random.nextInt(6) + 1;
    }

    distributeCards() {
        const cardsToDistribute = [];
        this.allCards.forEach(card => {
            if (!this.solution.containsCard(card)) {
                cardsToDistribute.push(card);
            }
        });

        CluedoRandom.getInstance().shuffle(cardsToDistribute);

        let cardIndex = 0;
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                this.players[i].addCard(cardsToDistribute[cardIndex++]);
            }
        }
    }

    play() {
        this.gameInterface.addToHistory("=== CLUEDO - Mode " + this.mode + " ===");

        if (this.mode === ModeJeu.REEL) {
            this.me = this.players[this.humanPlayer - 1];
            this.gameInterface
                .addToHistory("Vous êtes le " + this.me.getName())
                .addToHistory("Vos cartes : " + this.formatCards(this.me.getMyCards()))
                .addToHistory("");

            this.prefillHumanPlayerGrid(this.me);
            this.initializeRealGame();
        } else {
            this.playMysteryMode();
        }
    }

    prefillHumanPlayerGrid(me) {
        const humanPlayerRow = this.humanPlayer - 1;

        for (let col = 0; col < 21; col++) {
            this.gameInterface.setCellValueNoHistory(humanPlayerRow, col, "--");
        }

        for (const card of me.getMyCards()) {
            const column = this.getColumnNumber(card);
            if (column !== -1) {
                for (let row = 0; row < 6; row++) {
                    this.gameInterface.setCellValueNoHistory(row, column, row === humanPlayerRow ? "++" : "--");
                }
            }
        }
    }

    getColumnNumber(card) {
        const allOfType = Deck.allCardsOfType(card.type);
        const index = allOfType.findIndex(c => c.equals(card));
        return columnOffset[card.type] + index;
    }

    formatCards(cards) {
        return cards.map(c => c.toString()).join(', ');
    }

    initializeRealGame() {
        if (this.currentPlayer === this.humanPlayer) {
            this.gameInterface.addToHistory("=== Votre tour (" + this.me.getName() + ") ===");
        } else {
            this.continueAIGame();
        }
    }

    handlePlayerAction(action) {
        KnowledgeDebug.logAction(action);
        if (this.gameOver) return;

        const proposition = action.proposition;
        this.gameInterface.addToHistory("Votre annonce : " + action.toString());

        if (this.mode === ModeJeu.ENIGME) {
            this.handleMysteryAccusation(proposition);
            return;
        }

        if (action.isFinal) {
            this.handleAccusation(this.me, proposition);
        } else {
            this.handleProposition(this.me, proposition);

            if (!this.gameOver) {
                this.moveToNextPlayer();
                this.continueAIGame();
            }
        }
    }

    handleAccusation(player, accusation) {
        if (accusation.equals(this.solution)) {
            this.gameInterface
                .addToHistory("🎉 BRAVO ! " + (player === this.me ? "Vous avez" : "Le " + player.getName() + " a") + " trouvé la solution !")
                .addToHistory("Solution : " + this.solution);
            this.gameOver = true;
        } else {
            this.gameInterface
                .addToHistory("❌ Accusation incorrecte ! " + (player === this.me ? "Vous avez" : "Le " + player.getName() + " a") + " perdu.")
                .addToHistory("La vraie solution était : " + this.solution);
            this.gameOver = true;
        }
    }

    handleProposition(requestingPlayer, proposition) {
        let nextPlayer = (requestingPlayer.getNumber() % 6) + 1;

        for (let i = 0; i < 5; i++) {
            const player = this.players[nextPlayer - 1];

            if (player === requestingPlayer) {
                nextPlayer = (nextPlayer % 6) + 1;
                continue;
            }

            const cardToShow = player.findCardToShow(proposition);

            if (cardToShow !== null) {
                this.gameInterface.addToHistory("Le " + player.getName() + " montre une carte.");

                for (const p of this.players) {
                    if (p === requestingPlayer) {
                        if (requestingPlayer === this.me) {
                            this.gameInterface.addToHistory("Vous voyez : " + cardToShow);
                        }
                        p.handleProposition(requestingPlayer.getNumber(), proposition, player.getNumber(), cardToShow);
                    } else {
                        p.handleProposition(requestingPlayer.getNumber(), proposition, player.getNumber(), cardToShow);
                    }
                }
                return;
            } else {
                this.gameInterface.addToHistory("Le " + player.getName() + " n'a rien à montrer.");

                for (const p of this.players) {
                    p.handleNoCardToShow(player.getNumber(), proposition);
                }
            }

            nextPlayer = (nextPlayer % 6) + 1;
        }

        this.gameInterface.addToHistory("Aucun joueur n'a pu montrer de carte.");
    }

    aiPlayerTurn(player) {
        this.gameInterface.addToHistory("--- Tour du " + player.getName() + " ---");

        const accusation = player.canAccuse();
        if (accusation !== null) {
            this.gameInterface.addToHistory("Le " + player.getName() + " fait une accusation : " + accusation);
            this.handleAccusation(player, accusation);
            return;
        }

        const proposition = player.generateProposition(this.allCards);
        this.gameInterface.addToHistory("Le " + player.getName() + " propose : " + proposition);
        this.handleProposition(player, proposition);
    }

    continueAIGame() {
        while (!this.gameOver && this.currentPlayer !== this.humanPlayer) {
            const currentAIPlayer = this.players[this.currentPlayer - 1];
            this.aiPlayerTurn(currentAIPlayer);

            if (!this.gameOver) {
                this.moveToNextPlayer();
            }
        }

        if (!this.gameOver) {
            this.gameInterface.addToHistory("=== Votre tour (" + this.me.getName() + ") ===");
        }
    }

    moveToNextPlayer() {
        this.currentPlayer = (this.currentPlayer % 6) + 1;
        this.players.forEach(p => p.updateDeductions());
    }

    playMysteryMode() {
        this.gameInterface
            .addToHistory("Mode énigme : vous observez une partie en cours...")
            .addToHistory("Un joueur va bientôt trouver la solution. A vous de deviner laquelle !");

        this.simulateMysteryGame();

        this.gameInterface
            .addToHistory("")
            .addToHistory("=== Un joueur s'apprête à accuser ! ===")
            .addToHistory("D'après vos observations, quelle est la solution ?");
    }

    simulateMysteryGame() {
        let turn = 0;

        while (true) {
            turn++;
            const player = this.players[this.currentPlayer - 1];

            const accusationPossible = player.canAccuse();
            if (accusationPossible !== null) {
                this.gameInterface.addToHistory("Tour " + turn + " - Le " + player.getName() + " a assez d'informations pour accuser !");
                break;
            }

            const proposition = player.generateProposition(this.allCards);
            this.gameInterface.addToHistory("Tour " + turn + " - " + player.getName() + " propose : " + proposition);
            this.handleProposition(player, proposition);

            this.moveToNextPlayer();
        }

        this.gameInterface.addToHistory("");
    }

    handleMysteryAccusation(accusation) {
        if (accusation.equals(this.solution)) {
            this.gameInterface
                .addToHistory("🎉 EXCELLENT ! Vous avez trouvé la solution !")
                .addToHistory("Vous avez résolu l'énigme en observant les indices !");
        } else {
            this.gameInterface
                .addToHistory("❌ Ce n'est pas la bonne solution...")
                .addToHistory("La vraie solution était : " + this.solution)
                .addToHistory("Essayez de mieux observer les indices la prochaine fois !");
        }
        this.gameOver = true;
    }

    shouldContinue() {
        return !this.gameOver;
    }

    setInterface(gameInterface) {
        this.gameInterface = gameInterface;
    }
}
