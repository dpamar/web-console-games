/**
 * Game Selector - Main menu for choosing which game to play.
 *
 * Uses shared Console and KeyboardManager components.
 */
import { Console } from './ui/Console.js';
import { ConsoleLine } from './ui/ConsoleLine.js';
import { ConsoleStyleFactory } from './ui/ConsoleStyleFactory.js';
import { KeyboardManager } from './core/KeyboardManager.js';

// Create styles for the game selector
const Style = ConsoleStyleFactory.createStyles({
    SELECTOR: 'color-black bg-white',
    TITLE: 'color-cyan',
    SUBTITLE: 'color-yellow'
});

/**
 * GameSelector - displays a list of games and allows selection with arrow keys
 */
export class GameSelector {
    constructor(games) {
        this.games = games;
        this.selectedIndex = 0;
        this.keyboard = KeyboardManager.createScoped();
        this.resolvePromise = null;
        this.numberBuffer = '';
        this.numberTimeout = null;
    }

    /**
     * Display the menu and return a promise that resolves with the selected game
     */
    start() {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.setupKeyboardHandlers();
            this.keyboard.start();
            this.display();
        });
    }

    setupKeyboardHandlers() {
        // Arrow up
        this.keyboard.on('ArrowUp', () => {
            this.selectedIndex = (this.selectedIndex - 1 + this.games.length) % this.games.length;
            this.display();
        });

        // Arrow down
        this.keyboard.on('ArrowDown', () => {
            this.selectedIndex = (this.selectedIndex + 1) % this.games.length;
            this.display();
        });

        // Enter - select game
        this.keyboard.on('Enter', () => {
            this.finish();
        });

        // Number keys for direct selection (supports multi-digit numbers)
        this.keyboard.onCustom(
            (e) => e.key >= '0' && e.key <= '9',
            (e) => {
                // Clear previous timeout
                if (this.numberTimeout) {
                    clearTimeout(this.numberTimeout);
                }

                // Add digit to buffer
                this.numberBuffer += e.key;

                // Set timeout to process the number after 2s of no input
                this.numberTimeout = setTimeout(() => {
                    const num = parseInt(this.numberBuffer, 10);
                    this.numberBuffer = '';

                    if (num >= 1 && num <= this.games.length) {
                        this.selectedIndex = num - 1;
                        this.finish();
                    }
                }, 600);
            }
        );

        // Escape to quit
        this.keyboard.on('Escape', () => {
            this.resolvePromise(null);
            this.keyboard.cleanup();
        });
    }

    finish() {
        const selectedGame = this.games[this.selectedIndex];
        this.keyboard.cleanup();
        this.resolvePromise(selectedGame);
    }

    display() {
        Console.clearScreen();
        Console.setCursor();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.startNew()
            .startNewStyle(Style.TITLE)
            .addText("  ╔══════════════════════════════════════╗\n")
            .addText("  ║")
            .addText("           WEB GAMES MENU             ", Style.SUBTITLE)
            .addText("║\n")
            .addText("  ╚══════════════════════════════════════╝")
            .display();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("           Sélectionnez un jeu :");
        ConsoleLine.displayEmptyLine();

        for (let i = 0; i < this.games.length; i++) {
            const game = this.games[i];
            if (i === this.selectedIndex) {
                ConsoleLine.startNew()
                    .addText("  ► ")
                    .addText(`${i + 1}. ${game.name}`, Style.SELECTOR)
                    .display();
            } else {
                ConsoleLine.displayText(`    ${i + 1}. ${game.name}`);
            }
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("Instructions :", Style.TITLE);
        ConsoleLine.displayText("  ↑↓     : Naviguer entre les jeux");
        ConsoleLine.displayText("  ENTRÉE : Lancer le jeu sélectionné");
        ConsoleLine.displayText("  1-99   : Sélection directe par numéro");
    }
}
