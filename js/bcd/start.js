/**
 * BCD - Punch Card Converter
 * Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { printcard } from './bcd.js';

/**
 * Read a line of text from keyboard input
 */
function readLine(prompt) {
    return new Promise((resolve) => {
        let inputBuffer = '';
        const keyboard = KeyboardManager.createScoped();

        // Display initial prompt with cursor
        updateDisplay();

        keyboard.onCustom(
            (e) => true, // Accept all keys
            async (e) => {
                // Handle Ctrl+V / Cmd+V for paste
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
                    // Remove cursor line and display final line
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

                // Only accept printable characters (not ctrl/meta combinations)
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    inputBuffer += e.key;
                    updateDisplay();
                }
            }
        );

        function updateDisplay() {
            // Remove last line
            const container = document.getElementById('output-container');
            if (container && container.lastChild) {
                container.removeChild(container.lastChild);
            }
            // Display prompt + input + cursor on same line
            ConsoleLine.displayText(prompt + inputBuffer + '_');
        }

        keyboard.start();
    });
}

export async function start() {
    Console.clearScreen();

    ConsoleLine.displayText('BCD - Punch Card Converter');
    ConsoleLine.displayText('=========================');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter text to convert to punch card format (max 48 characters per line).');
    ConsoleLine.displayText('Press ESC or enter an empty line to exit.');
    ConsoleLine.displayText('');

    while (true) {
        const input = await readLine('> ');

        // Exit on ESC or empty line
        if (input === null || input.trim() === '') {
            break;
        }

        // Convert and display
        const card = printcard(input);
        ConsoleLine.displayText('');
        const lines = card.split('\n');
        for (const line of lines) {
            ConsoleLine.displayText(line);
        }
        ConsoleLine.displayText('');
    }

    ConsoleLine.displayText('');
    ConsoleLine.displayText('Thanks for using BCD!');
}
