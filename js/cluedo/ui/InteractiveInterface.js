import { Console } from '../../ui/Console.js';
import { ConsoleLine } from '../../ui/ConsoleLine.js';
import { ConsoleStyle } from './ConsoleStyle.js';
import { UndoManager } from './UndoManager.js';
import { Deck } from '../models/Deck.js';
import { CardType } from '../models/CardType.js';
import { Action } from '../mechanics/Action.js';
import { Proposition } from '../mechanics/Proposition.js';
import { SettingsManager } from '../utils/SettingsManager.js';
import { KeyboardManager } from '../../core/KeyboardManager.js';

const EMPTY_CELL = "..";
const FOUND_CELL = "++";
const NOSHOW_CELL = "--";
const SOLUTION_CELL = "XX";

const playersCount = 6;
const cardsCount = Deck.allCards().length;

const SUSPECT_NAMES = Deck.allCardsOfType(CardType.SUSPECT).map(c => c.name);
const WEAPON_NAMES = Deck.allCardsOfType(CardType.WEAPON).map(c => c.name);
const ROOM_NAMES = Deck.allCardsOfType(CardType.ROOM).map(c => c.name);

const countsByType = {
    [CardType.SUSPECT]: SUSPECT_NAMES.length,
    [CardType.WEAPON]: WEAPON_NAMES.length,
    [CardType.ROOM]: ROOM_NAMES.length
};

const typeOffset = {
    [CardType.SUSPECT]: 0,
    [CardType.WEAPON]: SUSPECT_NAMES.length,
    [CardType.ROOM]: SUSPECT_NAMES.length + WEAPON_NAMES.length
};

/**
 * Grid inner class
 */
class Grid {
    constructor(rows, columns, undoManager) {
        this.grid = Array(rows).fill(null).map(() => Array(columns).fill(EMPTY_CELL));
        this.undoManager = undoManager;
    }

    set(row, column, value) {
        this.undoManager.addModification(row, column, this.grid[row][column], value);
        this.grid[row][column] = value;
    }

    setNoHistory(row, column, value) {
        this.grid[row][column] = value;
    }

    get(row, column) {
        return this.grid[row][column];
    }

    isEmpty(row, column) {
        return this.grid[row][column] === EMPTY_CELL;
    }

    isFound(row, column) {
        return this.grid[row][column] === FOUND_CELL;
    }

    isSolution(row, column) {
        return this.grid[row][column] === SOLUTION_CELL;
    }
}

/**
 * Zone enum
 */
const Zone = {
    GRID: 'GRID',
    INFORMATION: 'INFORMATION',
    INPUT: 'INPUT'
};

function getNextZone(zone) {
    switch (zone) {
        case Zone.GRID: return Zone.INFORMATION;
        case Zone.INFORMATION: return Zone.INPUT;
        case Zone.INPUT: return Zone.GRID;
    }
}

function getPreviousZone(zone) {
    switch (zone) {
        case Zone.GRID: return Zone.INPUT;
        case Zone.INFORMATION: return Zone.GRID;
        case Zone.INPUT: return Zone.INFORMATION;
    }
}

/**
 * Advanced interactive terminal interface for Cluedo game.
 */
export class InteractiveInterface {
    constructor() {
        this.undoManager = new UndoManager();
        this.grid = new Grid(playersCount, cardsCount, this.undoManager);
        this.activeRow = 0;
        this.activeColumn = 0;
        this.activeZone = Zone.GRID;

        this.informationLines = [];
        this.scrollInfos = 0;
        this.isSearchMode = false;
        this.queryTerm = "";
        this.searchResults = [];
        this.actualSearchResultIndex = -1;
        this.turnCount = "";
        this.informationLinePerTurn = new Map();

        this.activeInputList = 0;
        this.selectedSuspect = 0;
        this.selectedWeapon = 0;
        this.selectedRoom = 0;

        this.gameEngine = null;
        this._isNewGameRequested = false;
        this._isQuitRequested = false;
        this._isReturnToMainMenuRequested = false;
        this.isStandalone = true; // Par défaut standalone, peut être changé via setStandalone()
        this.confirmationEnCours = false;
        this.messageConfirmation = "";

        this.keyboard = KeyboardManager.createScoped();
        this.gameFinishedResolve = null;
    }

    static init() {
        instance = new InteractiveInterface();
    }

    static get() {
        return instance;
    }

    setActiveZone(value) {
        if (value === Zone.INPUT) {
            this.detectSolutionFromGrid(true);
        }
        this.activeZone = value;
    }

    setSelectedSuspect(value) {
        this.selectedSuspect = value;
    }

    setSelectedWeapon(value) {
        this.selectedWeapon = value;
    }

    setSelectedRoom(value) {
        this.selectedRoom = value;
    }

    addToHistory(ligne) {
        this.informationLines.push(ligne);
        return this;
    }

    setGameEngine(engine) {
        this.gameEngine = engine;
        return this;
    }

    setStandalone(standalone) {
        this.isStandalone = standalone;
        return this;
    }

    start() {
        Console.clearScreen();
        this.setupKeyboardHandler();
        this.keyboard.start();
        this.renderLoop();

        // Return a promise that resolves when game is finished
        return new Promise((resolve) => {
            this.gameFinishedResolve = resolve;
        });
    }

    setupKeyboardHandler() {
        // Use custom handler to route based on active zone
        this.keyboard.onCustom(
            () => true, // Match all keys
            (e) => this.handleKey(e),
            { preventDefault: true }
        );
    }

    cleanup() {
        this.keyboard.cleanup();
        Console.restoreTerminal();
    }

    renderLoop() {
        this.afficherInterface();
    }

    handleKey(e) {
        let shouldContinue = true;
        switch (this.activeZone) {
            case Zone.GRID:
                shouldContinue = this.gererToucheGrille(e);
                break;
            case Zone.INFORMATION:
                shouldContinue = this.gererToucheInformations(e);
                break;
            case Zone.INPUT:
                shouldContinue = this.gererTouchePropositions(e);
                break;
        }

        if (!shouldContinue) {
            // Game is finished (quit or new game)
            this.cleanup();
            if (this.gameFinishedResolve) {
                this.gameFinishedResolve();
            }
            return false; // Tell KeyboardManager to stop
        } else {
            this.renderLoop();
            return true;
        }
    }

    gererToucheGrille(e) {
        if (this.confirmationEnCours) {
            return this.gererConfirmation(e);
        }

        switch (e.key) {
            case 'Tab':
                if (e.shiftKey) {
                    this.setActiveZone(getPreviousZone(this.activeZone));
                } else {
                    this.setActiveZone(getNextZone(this.activeZone));
                }
                return true;
            case 'ArrowUp':
                this.activeRow = (this.activeRow - 1 + playersCount) % playersCount;
                return true;
            case 'ArrowDown':
                this.activeRow = (this.activeRow + 1) % playersCount;
                return true;
            case 'ArrowRight':
                this.activeColumn = (this.activeColumn + 1) % cardsCount;
                return true;
            case 'ArrowLeft':
                this.activeColumn = (this.activeColumn - 1 + cardsCount) % cardsCount;
                return true;
            case '+':
            case '=':
                this.markCellWithPlus(this.activeRow, this.activeColumn);
                return true;
            case '-':
            case '_':
                this.undoManager.startChange();
                this.modifyCell(this.activeRow, this.activeColumn, NOSHOW_CELL);
                this.undoManager.commit();
                return true;
            case 'x':
            case 'X':
                this.undoManager.startChange();
                this.markColumn(this.activeColumn, SOLUTION_CELL);
                this.undoManager.commit();
                return true;
            case 'Backspace':
            case 'Delete':
                this.undoManager.startChange();
                this.modifyCell(this.activeRow, this.activeColumn, EMPTY_CELL);
                this.undoManager.commit();
                return true;
            case 'u':
            case 'U':
                const undoCoords = this.undoManager.undo(this.grid);
                if (undoCoords) {
                    this.activeRow = undoCoords[0];
                    this.activeColumn = undoCoords[1];
                }
                return true;
            case 'r':
            case 'R':
                const redoCoords = this.undoManager.redo(this.grid);
                if (redoCoords) {
                    this.activeRow = redoCoords[0];
                    this.activeColumn = redoCoords[1];
                }
                return true;
            case 'n':
            case 'N':
                this.demanderNouvellePartie();
                return !this.isNewGameRequested();
            case 'q':
            case 'Q':
                if (!this.isStandalone) {
                    this.demanderRetourMenuPrincipal();
                    return !this.isReturnToMainMenuRequested();
                }
                return true;
            default:
                // Ignorer les touches de modification
                if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key.length > 1) {
                    return true;
                }
                // Accepter uniquement les caractères alphanumériques simples
                if ((e.key >= '0' && e.key <= '9') || (e.key >= 'a' && e.key <= 'z') || (e.key >= 'A' && e.key <= 'Z')) {
                    const cellule = this.grid.get(this.activeRow, this.activeColumn);
                    if (cellule.startsWith('.')) {
                        this.undoManager.startChange();
                        if (cellule === EMPTY_CELL) {
                            this.modifyCell(this.activeRow, this.activeColumn, '.' + e.key);
                        } else {
                            this.modifyCell(this.activeRow, this.activeColumn, cellule.substring(1) + e.key);
                        }
                        this.undoManager.commit();
                    }
                }
                return true;
        }
    }

    gererToucheInformations(e) {
        if (this.confirmationEnCours) {
            return this.gererConfirmation(e);
        }

        switch (e.key) {
            case 'Tab':
                if (e.shiftKey) {
                    this.setActiveZone(getPreviousZone(this.activeZone));
                } else {
                    this.setActiveZone(getNextZone(this.activeZone));
                }
                return true;
            case 'ArrowUp':
                this.scrollInfos = Math.max(0, this.scrollInfos - 1);
                return true;
            case 'ArrowDown':
                this.scrollInfos = Math.min(this.informationLines.length - 1, this.scrollInfos + 1);
                return true;
            case '/':
                this.isSearchMode = true;
                this.queryTerm = "";
                this.turnCount = "";
                return true;
            case 'Enter':
                if (this.isSearchMode) {
                    this.effectuerRecherche();
                    this.isSearchMode = false;
                }
                return true;
            case 'G':
                if (this.turnCount === "") {
                    this.scrollInfos = Math.max(0, this.informationLines.length - 1);
                } else {
                    const numeroTour = parseInt(this.turnCount, 10);
                    this.mettreAJourMapTours();
                    const ligneTour = this.informationLinePerTurn.get(numeroTour);
                    if (ligneTour !== undefined) {
                        this.scrollInfos = ligneTour;
                    }
                }
                this.turnCount = "";
                return true;
            case 'Backspace':
                if (this.isSearchMode && this.queryTerm.length > 0) {
                    this.queryTerm = this.queryTerm.slice(0, -1);
                } else if (this.turnCount.length > 0) {
                    this.turnCount = this.turnCount.slice(0, -1);
                }
                return true;
            case 'Escape':
                if (this.isSearchMode) {
                    this.isSearchMode = false;
                    this.queryTerm = "";
                    this.searchResults = [];
                    this.actualSearchResultIndex = -1;
                } else {
                    this.turnCount = "";
                }
                return true;
            case 'n':
                if (this.isSearchMode) {
                    this.queryTerm += e.key;
                } else if (this.searchResults.length > 0) {
                    this.actualSearchResultIndex = (this.actualSearchResultIndex + 1) % this.searchResults.length;
                    this.scrollInfos = this.searchResults[this.actualSearchResultIndex];
                }
                return true;
            case 'q':
            case 'Q':
                if (!this.isStandalone && !this.isSearchMode) {
                    this.demanderRetourMenuPrincipal();
                    return !this.isReturnToMainMenuRequested();
                } else if (this.isSearchMode) {
                    this.queryTerm += e.key;
                }
                return true;
            default:
                if (this.isSearchMode && e.key.length === 1) {
                    this.queryTerm += e.key;
                } else if (!this.isSearchMode && e.key >= '0' && e.key <= '9') {
                    this.turnCount += e.key;
                }
                return true;
        }
    }

    gererTouchePropositions(e) {
        if (this.confirmationEnCours) {
            return this.gererConfirmation(e);
        }

        switch (e.key) {
            case 'Tab':
                if (e.shiftKey) {
                    this.setActiveZone(getPreviousZone(this.activeZone));
                } else {
                    this.setActiveZone(getNextZone(this.activeZone));
                }
                return true;
            case 'ArrowUp':
                this.naviguerListeHaut();
                return true;
            case 'ArrowDown':
                this.naviguerListeBas();
                return true;
            case 'ArrowRight':
                this.activeInputList = (this.activeInputList + 1) % 3;
                return true;
            case 'ArrowLeft':
                this.activeInputList = (this.activeInputList - 1 + 3) % 3;
                return true;
            case 'Enter':
                if (this.gameEngine) {
                    this.gameEngine.handlePlayerAction(new Action(this.getUserProposal(), this.detectSolutionFromGrid(false)));
                }
                this.switchToInformationZoneAndScrollToEnd();
                return true;
            case 'a':
            case 'A':
                if (this.gameEngine) {
                    this.gameEngine.handlePlayerAction(new Action(this.getUserProposal(), true));
                }
                this.switchToInformationZoneAndScrollToEnd();
                return true;
            case 'n':
            case 'N':
                this.demanderNouvellePartie();
                return !this.isNewGameRequested();
            case 'q':
            case 'Q':
                if (!this.isStandalone) {
                    this.demanderRetourMenuPrincipal();
                    return !this.isReturnToMainMenuRequested();
                }
                return true;
            default:
                return true;
        }
    }

    gererConfirmation(e) {
        switch (e.key) {
            case 'o':
            case 'O':
                this.confirmationEnCours = false;
                if (this.messageConfirmation.includes("nouvelle partie")) {
                    this._isNewGameRequested = true;
                    this.messageConfirmation = "";
                    return false; // End game
                } else if (this.messageConfirmation.includes("Quitter")) {
                    this._isQuitRequested = true;
                    this.messageConfirmation = "";
                    return false; // End game
                } else if (this.messageConfirmation.includes("menu principal")) {
                    this._isReturnToMainMenuRequested = true;
                    this.messageConfirmation = "";
                    return false; // End game
                }
                this.messageConfirmation = "";
                return true;
            case 'n':
            case 'N':
                this.confirmationEnCours = false;
                this.messageConfirmation = "";
                return true;
            case 'Escape':
            case 'q':
                this.confirmationEnCours = false;
                this.messageConfirmation = "";
                return true;
            default:
                return true;
        }
    }

    switchToInformationZoneAndScrollToEnd() {
        this.setActiveZone(Zone.INFORMATION);
        this.scrollInfos = Math.max(0, this.informationLines.length - 1);
    }

    effectuerRecherche() {
        this.searchResults = [];
        this.actualSearchResultIndex = -1;

        for (let i = 0; i < this.informationLines.length; i++) {
            if (this.informationLines[i].toLowerCase().includes(this.queryTerm.toLowerCase())) {
                this.searchResults.push(i);
            }
        }

        if (this.searchResults.length > 0) {
            this.actualSearchResultIndex = 0;
            this.scrollInfos = this.searchResults[0];
        }
    }

    mettreAJourMapTours() {
        this.informationLinePerTurn.clear();
        let numeroTour = 0;

        for (let i = 0; i < this.informationLines.length; i++) {
            const ligne = this.informationLines[i];

            if (ligne.startsWith("--- Tour du Joueur") ||
                ligne.startsWith("=== Votre tour") ||
                (ligne.includes("Tour ") && (ligne.includes("Joueur") || ligne.includes("tour")))) {
                numeroTour++;
                this.informationLinePerTurn.set(numeroTour, i);
            }
        }
    }

    demanderNouvellePartie() {
        if (this.gameEngine && this.gameEngine.shouldContinue()) {
            this.confirmationEnCours = true;
            this.messageConfirmation = "Recommencer une nouvelle partie ? (O/N)";
        } else {
            this._isNewGameRequested = true;
        }
    }

    demanderQuitter() {
        if (this.gameEngine && this.gameEngine.shouldContinue()) {
            this.confirmationEnCours = true;
            this.messageConfirmation = "Quitter la partie en cours ? (O/N)";
        }
        // En fin de partie, ne rien faire (seul N fonctionne)
    }

    demanderRetourMenuPrincipal() {
        if (this.gameEngine && this.gameEngine.shouldContinue()) {
            this.confirmationEnCours = true;
            this.messageConfirmation = "Retourner au menu principal ? (O/N)";
        } else {
            this._isReturnToMainMenuRequested = true;
        }
    }

    markCellWithPlus(ligne, colonne) {
        if (ligne >= 0 && ligne < playersCount && colonne >= 0 && colonne < cardsCount) {
            this.undoManager.startChange();
            this.grid.set(ligne, colonne, FOUND_CELL);
            for (let i = 0; i < playersCount; i++) {
                if (i !== ligne && this.grid.isEmpty(i, colonne)) {
                    this.grid.set(i, colonne, NOSHOW_CELL);
                }
            }
            this.undoManager.commit();
        }
    }

    setCellValueNoHistory(row, column, value) {
        this.grid.setNoHistory(row, column, value);
    }

    markColumn(colonne, valeur) {
        if (colonne >= 0 && colonne < cardsCount) {
            for (let i = 0; i < playersCount; i++) {
                this.grid.set(i, colonne, valeur);
            }
        }
    }

    modifyCell(row, column, newValue) {
        this.grid.set(row, column, newValue);
    }

    naviguerListeHaut() {
        switch (this.activeInputList) {
            case 0:
                this.selectedSuspect = (this.selectedSuspect - 1 + SUSPECT_NAMES.length) % SUSPECT_NAMES.length;
                break;
            case 1:
                this.selectedWeapon = (this.selectedWeapon - 1 + WEAPON_NAMES.length) % WEAPON_NAMES.length;
                break;
            case 2:
                this.selectedRoom = (this.selectedRoom - 1 + ROOM_NAMES.length) % ROOM_NAMES.length;
                break;
        }
    }

    naviguerListeBas() {
        switch (this.activeInputList) {
            case 0:
                this.selectedSuspect = (this.selectedSuspect + 1) % SUSPECT_NAMES.length;
                break;
            case 1:
                this.selectedWeapon = (this.selectedWeapon + 1) % WEAPON_NAMES.length;
                break;
            case 2:
                this.selectedRoom = (this.selectedRoom + 1) % ROOM_NAMES.length;
                break;
        }
    }

    detectSolutionFromGrid(setValuesOnUI) {
        const suspect = this.getFoundIndexForType(CardType.SUSPECT);
        if (suspect === null) return false;
        const weapon = this.getFoundIndexForType(CardType.WEAPON);
        if (weapon === null) return false;
        const room = this.getFoundIndexForType(CardType.ROOM);
        if (room === null) return false;

        if (setValuesOnUI) {
            this.selectedSuspect = suspect;
            this.selectedWeapon = weapon;
            this.selectedRoom = room;
        }
        return true;
    }

    getFoundIndexForType(cardType) {
        const count = countsByType[cardType];
        for (let colIndex = 0; colIndex < count; colIndex++) {
            if (this.isColumnMarkedAsSolution(colIndex, cardType)) {
                return colIndex;
            }
        }
        return null;
    }

    isColumnMarkedAsSolution(column, type) {
        const offset = typeOffset[type];
        for (let row = 0; row < playersCount; row++) {
            if (this.grid.isSolution(row, offset + column)) {
                return true;
            }
        }
        return false;
    }

    getUserProposal() {
        const suspects = Deck.allCardsOfType(CardType.SUSPECT);
        const weapons = Deck.allCardsOfType(CardType.WEAPON);
        const rooms = Deck.allCardsOfType(CardType.ROOM);

        return new Proposition(
            suspects[this.selectedSuspect],
            weapons[this.selectedWeapon],
            rooms[this.selectedRoom]
        );
    }

    afficherInterface() {
        Console.clearScreen();
        Console.setCursor();

        const cards = Deck.allCards();
        for (let i = 0; i < cards.length; i++) {
            const style = this.obtenirCouleurColonne(i);
            ConsoleLine.setSnippetStyle(cards[i].name, style);
            ConsoleLine.setSnippetStyle(cards[i].shortName, style);
        }

        this.afficherGrille();

        const hauteurZone3 = this.calculerHauteurZone3();
        const hauteurZone2 = 48 - 10 - hauteurZone3 - 4;

        this.afficherInformations(hauteurZone2);
        this.afficherPropositions(hauteurZone3);
        this.afficherInstructions();
    }

    afficherGrille() {
        const separatorBar = ConsoleLine.startNew()
            .startNewStyle(this.activeZone === Zone.GRID ? ConsoleStyle.CYAN : ConsoleStyle.EMPTY)
            .addText("═══════════════════ Grille de réflexion ")
            .addText(`[${this.undoManager.getHistoryPosition()}/${this.undoManager.getHistorySize()}] `);

        const remaining = 61 - separatorBar.length();
        separatorBar.addText("═".repeat(remaining)).display();

        const headers = ConsoleLine.startNew().addText(" ");
        [CardType.SUSPECT, CardType.WEAPON, CardType.ROOM].forEach(type => {
            headers.addText("  ");
            Deck.allCardsOfType(type).forEach(card => {
                headers.addText(card.shortName + " ");
            });
        });
        headers.display();

        for (let joueur = 0; joueur < playersCount; joueur++) {
            const line = ConsoleLine.startNew()
                .addText((joueur + 1) + "  ")
                .startNewStyle(this.activeZone === Zone.GRID && this.activeRow === joueur ? ConsoleStyle.GRID_SELECTOR : ConsoleStyle.EMPTY);

            for (let carte = 0; carte < cardsCount; carte++) {
                const cellule = this.grid.get(joueur, carte);
                const cellFormat = (carte === this.activeColumn && joueur === this.activeRow) ? ConsoleStyle.WHITE_BG :
                    carte === this.activeColumn && this.activeZone === Zone.GRID ? ConsoleStyle.GRID_SELECTOR : ConsoleStyle.EMPTY;
                line.addText(cellule, cellFormat).addText(" ");

                if (carte === 5 || carte === 11) {
                    line.addText("  ");
                }
            }
            line.display();
        }
    }

    obtenirCouleurColonne(colonne) {
        let aXX = false;
        let aPlusPlus = false;

        for (let i = 0; i < playersCount; i++) {
            if (this.grid.isSolution(i, colonne)) {
                aXX = true;
            } else if (this.grid.isFound(i, colonne)) {
                aPlusPlus = true;
            }
        }

        if (aXX) return ConsoleStyle.SOLUTION_CARD_COLOR;
        if (aPlusPlus) return ConsoleStyle.ASSIGNED_CARD_COLOR;
        return ConsoleStyle.DEFAULT_CARD_COLOR;
    }

    afficherInformations(hauteurDisponible) {
        ConsoleLine.displayText("══════════════════ Informations de jeu ═══════════════════",
            this.activeZone === Zone.INFORMATION ? ConsoleStyle.CYAN : ConsoleStyle.EMPTY);

        const hauteurZone = hauteurDisponible - 1;
        const lignesContenu = Math.min(27, hauteurZone - 3);
        const debut = Math.max(0, Math.min(this.scrollInfos, Math.max(0, this.informationLines.length - lignesContenu)));
        this.scrollInfos = debut;

        for (let i = 0; i < lignesContenu; i++) {
            const index = debut + i;
            if (index < this.informationLines.length) {
                ConsoleLine.startNew()
                    .startNewStyle((this.searchResults.includes(index) && this.actualSearchResultIndex !== -1 && index === this.searchResults[this.actualSearchResultIndex]) ? ConsoleStyle.YELLOW : ConsoleStyle.EMPTY)
                    .addText(this.informationLines[index])
                    .display();
            } else {
                ConsoleLine.displayEmptyLine();
            }
        }

        if (this.isSearchMode) {
            ConsoleLine.displayText("Recherche: " + this.queryTerm + "_", ConsoleStyle.CYAN);
        } else if (this.searchResults.length > 0) {
            ConsoleLine.displayText(`Résultats: ${this.actualSearchResultIndex + 1}/${this.searchResults.length}`, ConsoleStyle.GREEN);
        } else if (this.turnCount !== "") {
            ConsoleLine.displayText(`Aller au tour: ${this.turnCount}_ (tapez G)`, ConsoleStyle.CYAN);
        } else {
            ConsoleLine.displayEmptyLine();
        }
    }

    afficherPropositions(hauteurDisponible) {
        if (this.activeZone === Zone.INPUT) {
            this.afficherPropositionsComplete();
        } else {
            ConsoleLine.displayText("═══════════════════════ Propositions ═══════════════════════");
        }

        const lignesUtilisees = this.calculerLignesUtiliseesZone3();
        for (let i = lignesUtilisees; i < hauteurDisponible; i++) {
            ConsoleLine.displayEmptyLine();
        }
    }

    calculerLignesUtiliseesZone3() {
        return this.activeZone === Zone.INPUT ? 14 : 1;
    }

    calculerHauteurZone3() {
        return this.activeZone === Zone.INPUT ? 14 : 1;
    }

    afficherPropositionsComplete() {
        const taillesListes = [20, 16, 18];
        const titresListes = ["SUSPECTS", "ARMES", "LIEUX"];

        ConsoleLine.displayText("════════════════ Propositions / Accusations ═══════════════", ConsoleStyle.CYAN);
        ConsoleLine.displayText("Sélectionnez suspect, arme et lieu:");
        ConsoleLine.displayEmptyLine();

        const entetes = ConsoleLine.startNew();
        for (let i = 0; i < 3; i++) {
            const active = this.activeInputList === i;
            // Format: "► SUSPECTS         " ou "  SUSPECTS         "
            const prefix = active ? "► " : "  ";
            const header = prefix + titresListes[i].padEnd(taillesListes[i], ' ');
            if (active) {
                entetes.addText(header, ConsoleStyle.CYAN);
            } else {
                entetes.addText(header);
            }
        }
        entetes.display();

        ConsoleLine.displayText(
            "  " + "-".repeat(taillesListes[0] - 2) + "  " +
            "  " + "-".repeat(taillesListes[1] - 2) + "  " +
            "  " + "-".repeat(taillesListes[2] - 2) + "  "
        );

        const maxElements = ROOM_NAMES.length;

        for (let i = 0; i < maxElements; i++) {
            const line = ConsoleLine.startNewSkippingHighlight();

            if (i < SUSPECT_NAMES.length) {
                const couleur = i === this.selectedSuspect ?
                    (this.activeInputList === 0 ? ConsoleStyle.BLACK : ConsoleStyle.CYAN) :
                    ConsoleStyle.EMPTY;
                line.addText(("  " + SUSPECT_NAMES[i]).padEnd(taillesListes[0] + 2, ' '), couleur);
            } else {
                line.addText(" ".repeat(taillesListes[0] + 2));
            }

            if (i < WEAPON_NAMES.length) {
                const couleur = i === this.selectedWeapon ?
                    (this.activeInputList === 1 ? ConsoleStyle.BLACK : ConsoleStyle.CYAN) :
                    ConsoleStyle.EMPTY;
                line.addText(("  " + WEAPON_NAMES[i]).padEnd(taillesListes[1] + 2, ' '), couleur);
            } else {
                line.addText(" ".repeat(taillesListes[1] + 2));
            }

            const couleur = i === this.selectedRoom ?
                (this.activeInputList === 2 ? ConsoleStyle.BLACK : ConsoleStyle.CYAN) :
                ConsoleStyle.EMPTY;
            line.addText(("  " + ROOM_NAMES[i]).padEnd(taillesListes[2] + 2, ' '), couleur).display();
        }
    }

    afficherInstructions() {
        if (this.confirmationEnCours) {
            ConsoleLine.displayText(this.messageConfirmation, ConsoleStyle.YELLOW);
            ConsoleLine.startNew()
                .addText("O", ConsoleStyle.GREEN)
                .addText(": Oui | ")
                .addText("N", ConsoleStyle.RED)
                .addText(": Non | ESC: Annuler")
                .display();
            ConsoleLine.displayEmptyLine();
        } else {
            ConsoleLine.displayText("Instructions:", ConsoleStyle.BLUE);
            const menuAction = this.isStandalone ? "" : " | Q: Menu principal";
            ConsoleLine.displayText("TAB/Shift-Tab: Zones | N: Nouvelle partie" + menuAction + " | Flèches: Naviguer");
            if (this.activeZone === Zone.GRID) {
                ConsoleLine.displayText("+: Possède | -: Ne possède pas | X: Personne n'a | Chiffres: Notes | U: Undo | R: Redo");
            } else if (this.activeZone === Zone.INFORMATION) {
                ConsoleLine.displayText("/: Recherche | n: Suivant | G: Fin | nG: Tour n (ex: 5G) | ESC: Annuler");
            } else {
                ConsoleLine.displayText("Gauche/Droite: Liste | Haut/Bas: Naviguer | ENTRÉE: Proposition | A: Accusation");
            }
        }
    }

    isNewGameRequested() {
        return this._isNewGameRequested;
    }

    isQuitRequested() {
        return this._isQuitRequested;
    }

    isReturnToMainMenuRequested() {
        return this._isReturnToMainMenuRequested;
    }

    resetNewGameRequest() {
        this._isNewGameRequested = false;
    }

    resetQuitRequest() {
        this._isQuitRequested = false;
    }

    resetReturnToMainMenuRequest() {
        this._isReturnToMainMenuRequested = false;
    }
}

let instance = null;
