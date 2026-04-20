/**
 * Morse Code Converter
 * Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { ConsoleStyleFactory } from '../ui/ConsoleStyleFactory.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { encode, decode } from './morse.js';

// Create styles
const Style = ConsoleStyleFactory.createStyles({
    SELECTOR: 'color-black bg-white',
    TITLE: 'color-cyan',
    SUBTITLE: 'color-yellow',
    GREEN: 'color-green'
});

/**
 * Main menu for Morse converter
 */
class MorseMenu {
    constructor() {
        this.mode = 'encode'; // 'encode' or 'decode'
        this.useSymbols = true; // true = symbols (.-), false = words (dit/daw)
        this.currentSection = 0; // 0 = mode, 1 = settings
        this.selectedSetting = 0; // 0 = symbols checkbox
        this.keyboard = KeyboardManager.createScoped();
        this.resolvePromise = null;
    }

    start() {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.setupKeyboardHandler();
            this.keyboard.start();
            this.display();
        });
    }

    setupKeyboardHandler() {
        this.keyboard.onCustom(
            () => true,
            (e) => {
                this.handleKey(e);
                this.display();
            },
            { preventDefault: true }
        );
    }

    handleKey(e) {
        switch (e.key) {
            case 'ArrowUp':
                if (this.currentSection === 0) {
                    this.mode = this.mode === 'encode' ? 'decode' : 'encode';
                }
                break;
            case 'ArrowDown':
                if (this.currentSection === 0) {
                    this.mode = this.mode === 'encode' ? 'decode' : 'encode';
                }
                break;
            case 'Tab':
                this.currentSection = (this.currentSection + 1) % 2;
                break;
            case ' ':
                if (this.currentSection === 1) {
                    this.useSymbols = !this.useSymbols;
                }
                break;
            case 'Enter':
                this.finish();
                break;
            case '1':
                this.mode = 'encode';
                this.finish();
                break;
            case '2':
                this.mode = 'decode';
                this.finish();
                break;
            case 'Escape':
                this.finish(true);
                break;
        }
    }

    finish(cancel = false) {
        this.keyboard.cleanup();
        if (this.resolvePromise) {
            this.resolvePromise(cancel ? null : { mode: this.mode, useSymbols: this.useSymbols });
        }
    }

    display() {
        Console.clearScreen();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.startNew()
            .startNewStyle(Style.TITLE)
            .addText("  ╔══════════════════════════════════════╗\n")
            .addText("  ║")
            .addText("          MORSE CODE CONVERTER       ", Style.SUBTITLE)
            .addText("║\n")
            .addText("  ╚══════════════════════════════════════╝")
            .display();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("           Select mode:");
        ConsoleLine.displayEmptyLine();

        // Encode option
        if (this.currentSection === 0 && this.mode === 'encode') {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText("1. Encode (Text → Morse)", Style.SELECTOR)
                .display();
        } else {
            ConsoleLine.displayText("    1. Encode (Text → Morse)");
        }

        // Decode option
        if (this.currentSection === 0 && this.mode === 'decode') {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText("2. Decode (Morse → Text)", Style.SELECTOR)
                .display();
        } else {
            ConsoleLine.displayText("    2. Decode (Morse → Text)");
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("           Settings:");
        ConsoleLine.displayEmptyLine();

        const symbolsCheckbox = this.useSymbols ? "[X]" : "[ ]";
        if (this.currentSection === 1) {
            ConsoleLine.startNew()
                .addText("  ► ")
                .addText(`${symbolsCheckbox} Use symbols (.- instead of dit/daw)`, Style.SELECTOR)
                .display();
        } else {
            ConsoleLine.displayText(`    ${symbolsCheckbox} Use symbols (.- instead of dit/daw)`);
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();

        ConsoleLine.displayText("Instructions:", Style.GREEN);
        ConsoleLine.displayText("  ↑↓     : Navigate modes");
        ConsoleLine.displayText("  TAB    : Switch mode/settings");
        ConsoleLine.displayText("  SPACE  : Toggle checkbox");
        ConsoleLine.displayText("  ENTER  : Confirm");
        ConsoleLine.displayText("  ESC    : Exit");
        ConsoleLine.displayText("  1/2    : Direct selection");
    }
}

/**
 * Read a line of text from keyboard input (with paste support)
 */
function readLine(prompt) {
    return new Promise((resolve) => {
        let inputBuffer = '';
        const keyboard = KeyboardManager.createScoped();

        updateDisplay();

        keyboard.onCustom(
            (e) => true,
            async (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                    try {
                        const text = await navigator.clipboard.readText();
                        inputBuffer += text;
                        updateDisplay();
                    } catch (err) {
                        console.error('Failed to read clipboard:', err);
                    }
                    return;
                }

                if (e.key === 'Enter') {
                    const container = document.getElementById('output-container');
                    if (container && container.lastChild) {
                        container.removeChild(container.lastChild);
                    }
                    ConsoleLine.displayText(prompt + inputBuffer);

                    keyboard.cleanup();
                    resolve(inputBuffer);
                    return;
                }

                if (e.key === 'Escape') {
                    keyboard.cleanup();
                    resolve(null);
                    return;
                }

                if (e.key === 'Backspace') {
                    if (inputBuffer.length > 0) {
                        inputBuffer = inputBuffer.slice(0, -1);
                        updateDisplay();
                    }
                    return;
                }

                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    inputBuffer += e.key;
                    updateDisplay();
                }
            }
        );

        function updateDisplay() {
            const container = document.getElementById('output-container');
            if (container && container.lastChild) {
                container.removeChild(container.lastChild);
            }
            ConsoleLine.displayText(prompt + inputBuffer + '_');
        }

        keyboard.start();
    });
}

/**
 * Encode mode
 */
async function encodeMode(useSymbols) {
    Console.clearScreen();
    ConsoleLine.displayText('ENCODE MODE');
    ConsoleLine.displayText('===========');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter text to convert to Morse code.');
    ConsoleLine.displayText('Empty line to return to menu.');
    ConsoleLine.displayText('');

    while (true) {
        const input = await readLine('> ');

        if (input === null || input.trim() === '') {
            break;
        }

        const lines = encode(input, useSymbols);
        ConsoleLine.displayText('');
        for (const line of lines) {
            ConsoleLine.displayText(line);
        }
        ConsoleLine.displayText('');
    }
}

/**
 * Decode mode
 */
async function decodeMode() {
    Console.clearScreen();
    ConsoleLine.displayText('DECODE MODE');
    ConsoleLine.displayText('===========');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter Morse code (. and -) to decode.');
    ConsoleLine.displayText('Each line is decoded immediately. Empty line to return to menu.');
    ConsoleLine.displayText('');

    let fullDecoded = '';

    while (true) {
        const input = await readLine('> ');

        if (input === null || input.trim() === '') {
            break;
        }

        const decoded = decode(input);
        if (decoded) {
            fullDecoded += decoded;
            ConsoleLine.displayText('Decoded: ' + decoded);
        }
        ConsoleLine.displayEmptyLine();
    }
}

export async function start() {
    Console.clearScreen();

    while (true) {
        const menu = new MorseMenu();
        const choice = await menu.start();

        if (choice === null) {
            break;
        }

        if (choice.mode === 'encode') {
            await encodeMode(choice.useSymbols);
        } else {
            await decodeMode();
        }

        Console.clearScreen();
    }

    ConsoleLine.displayText('');
    ConsoleLine.displayText('Thanks for using Morse Code Converter!');
}
