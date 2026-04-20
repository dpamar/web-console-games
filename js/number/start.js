/**
 * Number - Convert numbers to English words
 * Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { convert } from './number.js';

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
    Console.clearScreen();
    ConsoleLine.displayText('Number - Convert numbers to English words');
    ConsoleLine.displayText('=========================================');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter numbers to convert (one per line).');
    ConsoleLine.displayText('Press ESC or enter empty line to exit.');
    ConsoleLine.displayText('');

    while (true) {
        const input = await readLine('> ');

        if (input === null || input.trim() === '') {
            break;
        }

        try {
            const result = convert(input.trim(), false);
            ConsoleLine.displayText(result);
        } catch (error) {
            ConsoleLine.displayText(`Error: ${error.message}`);
        }
        ConsoleLine.displayText('');
    }

    ConsoleLine.displayText('');
    ConsoleLine.displayText('Thanks for using Number!');
}
