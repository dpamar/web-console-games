/**
 * Caesar cipher - Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { printit, autoDecode } from './caesar.js';

/**
 * Menu for selecting shift value
 */
class ShiftMenu {
    constructor() {
        this.shift = 13; // ROT13 by default
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
                this.shift = (this.shift + 1) % 26;
                break;
            case 'ArrowDown':
                this.shift = (this.shift - 1 + 26) % 26;
                break;
            case 'Enter':
                this.finish();
                break;
            case 'Escape':
                this.finish(true);
                break;
            default:
                // Direct number input
                if (e.key >= '0' && e.key <= '9') {
                    const num = parseInt(e.key);
                    const newShift = this.shift * 10 + num;
                    if (newShift < 26) {
                        this.shift = newShift;
                    }
                }
                break;
        }
    }

    finish(cancel = false) {
        this.keyboard.cleanup();
        if (this.resolvePromise) {
            this.resolvePromise(cancel ? null : this.shift);
        }
    }

    display() {
        Console.clearScreen();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("  ╔══════════════════════════════════════╗");
        ConsoleLine.displayText("  ║        CAESAR CIPHER SETTINGS       ║");
        ConsoleLine.displayText("  ╚══════════════════════════════════════╝");
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText(`           Shift: ${this.shift}`);
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("Instructions:");
        ConsoleLine.displayText("  ↑↓       : Adjust shift");
        ConsoleLine.displayText("  0-9      : Type shift value");
        ConsoleLine.displayText("  ENTER    : Confirm");
        ConsoleLine.displayText("  ESC      : Cancel");
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("Note: ROT13 is shift 13");
    }
}

/**
 * Read a line of text from keyboard input
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

export async function start() {
    // Show shift menu
    const menu = new ShiftMenu();
    const shift = await menu.start();

    if (shift === null) {
        return; // User cancelled
    }

    Console.clearScreen();
    ConsoleLine.displayText(`Caesar Cipher (shift: ${shift})`);
    ConsoleLine.displayText('='.repeat(40));
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter text to encode/decode (one line at a time).');
    ConsoleLine.displayText('Empty line to exit.');
    ConsoleLine.displayText('');

    while (true) {
        const input = await readLine('> ');

        if (input === null || input.trim() === '') {
            break;
        }

        const result = printit(input, shift);
        ConsoleLine.displayText(result);
        ConsoleLine.displayText('');
    }

    ConsoleLine.displayText('');
    ConsoleLine.displayText('Thanks for using Caesar!');
}
