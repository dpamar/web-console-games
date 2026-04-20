import { Console } from '../../ui/Console.js';
import { ConsoleLine } from '../../ui/ConsoleLine.js';
import { ConsoleStyle } from './ConsoleStyle.js';
import { SettingsManager } from '../utils/SettingsManager.js';
import { KeyboardManager } from '../../core/KeyboardManager.js';

const OPTIONS = [
    "Mode réel (jouer contre l'IA)",
    "Mode énigme (observer et deviner)"
];

/**
 * Main menu interface for Cluedo game with elegant visual design.
 * Allows selection between Real mode (play against AI) and Mystery mode (observe and guess).
 * Uses arrow key navigation and displays the random seed for reproducible games.
 */
export class MainMenu {
    constructor() {
        this.selectedOption = 0;
        this.currentSection = 0; // 0 = game mode, 1 = settings
        this.selectedSetting = 0; // 0 = verbose, 1 = highlight, 2 = seed
        this.editingTextbox = false;
        this.seedInput = '';
        this.resolvePromise = null;
        this.finished = false;
        this.keyboard = KeyboardManager.createScoped();
    }

    /**
     * Display the menu and return a promise that resolves with the selected option
     */
    start() {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.setupKeyboardHandler();
            this.keyboard.start();
            this.display();
        });
    }

    setupKeyboardHandler() {
        // Use custom handler to route based on editing state
        this.keyboard.onCustom(
            () => true, // Match all keys
            (e) => {
                if (this.editingTextbox) {
                    this.handleTextboxKey(e);
                } else {
                    this.handleNavigationKey(e);
                }

                // Only redisplay if menu is still active
                if (!this.finished) {
                    this.display();
                }
            },
            { preventDefault: true }
        );
    }

    cleanup() {
        this.keyboard.cleanup();
    }


    handleTextboxKey(e) {
        switch (e.key) {
            case 'Escape':
                this.editingTextbox = false;
                this.seedInput = '';
                break;
            case 'Enter':
                this.editingTextbox = false;
                if (this.seedInput.length > 0) {
                    try {
                        const newSeed = parseInt(this.seedInput, 10);
                        if (!isNaN(newSeed)) {
                            SettingsManager.setSeed(newSeed);
                        }
                    } catch (e) {
                        // Invalid input, ignore
                    }
                }
                this.seedInput = '';
                break;
            case 'Backspace':
                if (this.seedInput.length > 0) {
                    this.seedInput = this.seedInput.slice(0, -1);
                }
                break;
            default:
                if ((e.key >= '0' && e.key <= '9') || (e.key === '-' && this.seedInput.length === 0)) {
                    if (this.seedInput.length < 19) {
                        this.seedInput += e.key;
                    }
                }
                break;
        }
    }

    handleNavigationKey(e) {
        switch (e.key) {
            case 'ArrowUp':
                if (this.currentSection === 0) {
                    this.selectedOption = (this.selectedOption - 1 + OPTIONS.length) % OPTIONS.length;
                } else {
                    this.selectedSetting = (this.selectedSetting - 1 + 3) % 3;
                }
                break;
            case 'ArrowDown':
                if (this.currentSection === 0) {
                    this.selectedOption = (this.selectedOption + 1) % OPTIONS.length;
                } else {
                    this.selectedSetting = (this.selectedSetting + 1) % 3;
                }
                break;
            case 'Tab':
                this.currentSection = (this.currentSection + 1) % 2;
                break;
            case ' ':
                if (this.currentSection === 1 && this.selectedSetting < 2) {
                    if (this.selectedSetting === 0) {
                        SettingsManager.setVerbose(!SettingsManager.verbose());
                    } else {
                        SettingsManager.setUseHighlight(!SettingsManager.useHighlight());
                    }
                }
                break;
            case 'Enter':
                if (this.currentSection === 1 && this.selectedSetting === 2) {
                    this.editingTextbox = true;
                    this.seedInput = SettingsManager.seed().toString();
                } else {
                    this.finishMenu();
                }
                break;
            case '1':
                this.selectedOption = 0;
                this.finishMenu();
                break;
            case '2':
                this.selectedOption = 1;
                this.finishMenu();
                break;
        }
    }

    finishMenu() {
        console.log('finishMenu called, selectedOption =', this.selectedOption);
        this.finished = true;
        this.cleanup();
        if (this.resolvePromise) {
            console.log('Resolving promise with', this.selectedOption);
            this.resolvePromise(this.selectedOption);
        } else {
            console.error('No resolvePromise!');
        }
    }

    display() {
        Console.clearScreen();
        Console.setCursor();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.startNew()
            .startNewStyle(ConsoleStyle.CYAN)
            .addText("  ╔══════════════════════════════════════╗\n")
            .addText("  ║")
            .addText("             CLUEDO GAME              ", ConsoleStyle.YELLOW)
            .addText("║\n")
            .addText("  ╚══════════════════════════════════════╝")
            .display();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.startNew()
            .addText("                 Seed: ")
            .addText(SettingsManager.seed().toString(), ConsoleStyle.GREEN)
            .display();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("           Choisissez le mode de jeu :");
        ConsoleLine.displayEmptyLine();

        for (let i = 0; i < OPTIONS.length; i++) {
            if (this.currentSection === 0 && i === this.selectedOption) {
                ConsoleLine.startNew()
                    .addText("  ► ")
                    .addText(`${i + 1}. ${OPTIONS[i]}`, ConsoleStyle.BLACK)
                    .display();
            } else {
                ConsoleLine.displayText(`    ${i + 1}. ${OPTIONS[i]}`);
            }
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("           Paramètres :");
        ConsoleLine.displayEmptyLine();

        const verboseCheckbox = SettingsManager.verbose() ? "[X]" : "[ ]";
        if (this.currentSection === 1 && this.selectedSetting === 0) {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText(`${verboseCheckbox} Verbose`, ConsoleStyle.BLACK)
                .display();
        } else {
            ConsoleLine.displayText(`    ${verboseCheckbox} Verbose`);
        }

        const highlightCheckbox = SettingsManager.useHighlight() ? "[X]" : "[ ]";
        if (this.currentSection === 1 && this.selectedSetting === 1) {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText(`${highlightCheckbox} Highlight`, ConsoleStyle.BLACK)
                .display();
        } else {
            ConsoleLine.displayText(`    ${highlightCheckbox} Highlight`);
        }

        const seedDisplay = this.editingTextbox ? this.seedInput + "_" : SettingsManager.seed().toString();
        const seedBox = `[${seedDisplay.padEnd(19, ' ')}]`;
        if (this.currentSection === 1 && this.selectedSetting === 2) {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText(`${seedBox} Seed`, this.editingTextbox ? ConsoleStyle.GREEN_ON_WHITE : ConsoleStyle.BLACK)
                .display();
        } else {
            ConsoleLine.displayText(`    ${seedBox} Seed`);
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("Instructions :", ConsoleStyle.GREEN);
        ConsoleLine.displayText("  ↑↓     : Naviguer entre les options");
        ConsoleLine.displayText("  TAB    : Basculer entre mode/paramètres");
        ConsoleLine.displayText("  ESPACE : Cocher/décocher (cases)");
        ConsoleLine.displayText("  ENTRÉE : Éditer seed / Valider");
        ConsoleLine.displayText("  ESC    : Annuler édition seed");
        ConsoleLine.displayText("  1/2    : Sélection directe par numéro");
    }
}
