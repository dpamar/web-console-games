/**
 * I/O functions - faithful port from io.c
 * Uses ConsoleLine for output and KeyboardManager for input
 */

import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';

/**
 * Test mode - for automated testing
 */
let testCommandQueue = [];
let testMode = false;

export function setTestMode(commands) {
    testCommandQueue = [...commands];
    testMode = commands.length > 0;
}

export function getTestStatus() {
    return {
        active: testMode,
        remaining: testCommandQueue.length
    };
}

/**
 * getin - get command from user (from io.c)
 * Reads two words from input
 */
export async function getin(state) {
    const line = await readLine('> ');

    if (line === null) {
        // EOF or escape
        state.wd1 = '';
        state.wd2 = '';
        return;
    }

    // Parse into two words
    const words = line.toLowerCase().trim().split(/\s+/);
    state.wd1 = words[0] || '';
    state.wd2 = words[1] || '';
}

/**
 * readLine - read a line of input from keyboard
 */
function readLine(prompt) {
    // Test mode: return next command from queue
    if (testMode && testCommandQueue.length > 0) {
        const command = testCommandQueue.shift();
        ConsoleLine.displayText(prompt + command);
        console.log(prompt + command);

        // Update test status if available
        if (window.updateTestStatus) {
            window.updateTestStatus(command, testCommandQueue.length);
        }

        // Return after small delay to simulate typing
        return new Promise((resolve) => {
            setTimeout(() => resolve(command), 5);
        });
    }

    return new Promise((resolve) => {
        let inputBuffer = '';
        let promptElement = null;
        const keyboard = KeyboardManager.createScoped();

        updateDisplay();

        keyboard.onCustom(
            (e) => true,
            async (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                    // Paste
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
                    if (container && promptElement && container.contains(promptElement)) {
                        container.removeChild(promptElement);
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

            if (promptElement && container.contains(promptElement)) {
                container.removeChild(promptElement);
            }

            const lineDiv = document.createElement('div');
            lineDiv.className = 'console-line';
            lineDiv.textContent = prompt + inputBuffer + '_';
            container.appendChild(lineDiv);
            promptElement = lineDiv;

            container.scrollTop = container.scrollHeight;
        }

        keyboard.start();
    });
}

/**
 * yes - confirm with rspeak (from io.c)
 */
export async function yes(state, x, y, z) {
    while (true) {
        rspeak(state, x);

        const line = await readLine('> ');
        const ch = line ? line.toLowerCase().trim().charAt(0) : '';

        let result = null;
        if (ch === 'y') {
            result = true;
        } else if (ch === 'n') {
            result = false;
        }

        if (result !== null) {
            if (result) {
                rspeak(state, y);
            } else {
                rspeak(state, z);
            }
            return result;
        }

        ConsoleLine.displayText('Please answer the question.');
    }
}

/**
 * yesm - confirm with mspeak (from io.c)
 */
export async function yesm(state, x, y, z) {
    while (true) {
        mspeak(state, x);

        const line = await readLine('> ');
        const ch = line ? line.toLowerCase().trim().charAt(0) : '';

        let result = null;
        if (ch === 'y') {
            result = true;
        } else if (ch === 'n') {
            result = false;
        }

        if (result !== null) {
            if (result) {
                mspeak(state, y);
            } else {
                mspeak(state, z);
            }
            return result;
        }

        ConsoleLine.displayText('Please answer the question.');
    }
}

/**
 * speak - print a message (from io.c)
 * Data is already decrypted in JSON, so just print it
 */
export function speak(state, msg) {
    if (!msg || !msg.seekadr || msg.txtlen === 0) {
        return;
    }

    const text = msg.seekadr;
    let nonfirst = false;

    // Split into lines
    const lines = text.split('\n');
    for (const line of lines) {
        // Check for end marker >$<
        if (line.includes('>$<')) {
            break;
        }

        if (line.trim()) {
            if (state.blklin && !nonfirst) {
                ConsoleLine.displayEmptyLine();
                nonfirst = true;
            }
            ConsoleLine.displayText(line);
        }
    }
}

/**
 * rspeak - print random message (from io.c)
 */
export function rspeak(state, msg) {
    if (msg !== 0 && state.rtext[msg]) {
        speak(state, state.rtext[msg]);
    }
}

/**
 * mspeak - print magic message (from io.c)
 */
export function mspeak(state, msg) {
    if (msg !== 0 && state.mtext[msg]) {
        speak(state, state.mtext[msg]);
    }
}

/**
 * pspeak - print object description with property (from io.c)
 * The ptext contains lines like:
 *   24  *Plant
 *   000 There is a tiny little plant...
 *   100 The plant spurts...
 *   200 There is a 12-foot-tall beanstalk...
 */
export function pspeak(state, m, skip) {
    if (!state.ptext[m] || !state.ptext[m].seekadr) {
        return;
    }

    const text = state.ptext[m].seekadr;
    const lines = text.split('\n');
    let nonfirst = false;

    // If skip < 0, print first line encountered (inventory mode)
    // Otherwise, use skip to select specific property
    const targetProp = (skip < 0) ? state.prop[m] : skip;
    const targetNum = 100 * targetProp;

    for (const line of lines) {
        // Check for end marker
        if (line.includes('>$<')) {
            break;
        }

        const tabIndex = line.indexOf('\t');
        if (tabIndex < 0) {
            continue;
        }

        const numStr = line.substring(0, tabIndex);
        const content = line.substring(tabIndex + 1);
        const num = parseInt(numStr, 10);

        if (isNaN(num)) {
            continue;
        }

        // If skip < 0, print first line and break (inventory mode)
        if (skip < 0) {
            if (content.trim()) {
                if (state.blklin && !nonfirst) {
                    ConsoleLine.displayEmptyLine();
                    nonfirst = true;
                }
                ConsoleLine.displayText(content);
            }
            break;
        }

        // Match the property number (normal mode)
        if (num === targetNum) {
            if (content.trim()) {
                if (state.blklin && !nonfirst) {
                    ConsoleLine.displayEmptyLine();
                    nonfirst = true;
                }
                ConsoleLine.displayText(content);
            }
            // Continue to get all lines with same property number
        } else if (nonfirst) {
            // Already found and printed matching lines, stop
            break;
        }
    }
}
