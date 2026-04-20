/**
 * PPT - Paper Tape Converter
 * Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { encode, decode } from './ppt.js';

/**
 * Read a line of text from keyboard input (with paste support)
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

/**
 * Show menu and get mode selection
 */
async function selectMode() {
    return new Promise((resolve) => {
        const keyboard = KeyboardManager.createScoped();

        ConsoleLine.displayText('PPT - Paper Tape Converter');
        ConsoleLine.displayText('==========================');
        ConsoleLine.displayText('');
        ConsoleLine.displayText('Select mode:');
        ConsoleLine.displayText('  [E] Encode text to paper tape');
        ConsoleLine.displayText('  [D] Decode paper tape to text');
        ConsoleLine.displayText('  [ESC] Exit');
        ConsoleLine.displayText('');

        keyboard.onCustom(
            (e) => true,
            (e) => {
                const key = e.key.toUpperCase();
                if (key === 'E') {
                    keyboard.cleanup();
                    resolve('encode');
                } else if (key === 'D') {
                    keyboard.cleanup();
                    resolve('decode');
                } else if (e.key === 'Escape') {
                    keyboard.cleanup();
                    resolve(null);
                }
            }
        );

        keyboard.start();
    });
}

/**
 * Encode mode: read text lines and convert to paper tape
 */
async function encodeMode() {
    Console.clearScreen();
    ConsoleLine.displayText('ENCODE MODE');
    ConsoleLine.displayText('===========');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Enter text to convert to paper tape.');
    ConsoleLine.displayText('Press ESC or enter an empty line to return to menu.');
    ConsoleLine.displayText('');

    while (true) {
        const input = await readLine('> ');

        // Exit on ESC or empty line
        if (input === null || input.trim() === '') {
            break;
        }

        // Convert and display
        const tape = encode(input);
        ConsoleLine.displayText('');
        const lines = tape.split('\n');
        for (const line of lines) {
            ConsoleLine.displayText(line);
        }
        ConsoleLine.displayText('');
    }
}

/**
 * Decode mode: read paper tape lines and convert back to text
 */
async function decodeMode() {
    Console.clearScreen();
    ConsoleLine.displayText('DECODE MODE');
    ConsoleLine.displayText('===========');
    ConsoleLine.displayText('');
    ConsoleLine.displayText('Paste paper tape lines (or type them manually).');
    ConsoleLine.displayText('Each line is decoded immediately. Empty line to return to menu.');
    ConsoleLine.displayText('Press ESC to return to menu.');
    ConsoleLine.displayText('');

    let decodedText = '';

    while (true) {
        const input = await readLine('> ');

        // Exit on ESC
        if (input === null) {
            break;
        }

        // Empty line = exit decode mode
        if (input.trim() === '') {
            break;
        }

        // If input contains multiple lines (from paste), split and decode each
        const lines = input.split('\n');
        for (const line of lines) {
            if (line.trim() === '') continue;

            const decoded = decode(line);
            if (decoded) {
                decodedText += decoded;
            }
        }
        ConsoleLine.displayText(decodedText);
        ConsoleLine.displayEmptyLine();
    }
}

export async function start() {
    Console.clearScreen();

    while (true) {
        const mode = await selectMode();

        if (mode === null) {
            // Exit
            break;
        }

        if (mode === 'encode') {
            await encodeMode();
        } else if (mode === 'decode') {
            await decodeMode();
        }

        Console.clearScreen();
    }

    ConsoleLine.displayText('');
    ConsoleLine.displayText('Thanks for using PPT!');
}
