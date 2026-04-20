/**
 * Mille Bornes - Web entry point
 * Adapts the C main() for browser environment
 */

import { main, die, rub } from './main.js';
import { setDebug, setOn_exit, setStandalone } from './state.js';
import { resetGame } from './init.js';

/**
 * Start function for standalone mode
 */
async function startGame(standalone = true) {
    console.log("Mille Bornes starting...");
    // Set standalone mode
    setStandalone(standalone);
    try {
        // Initialize with no arguments (no save file)
        await main(1, []);
    } catch (err) {
        if (err.message && err.message.startsWith('EXIT_')) {
            console.log('Game exited normally');
        } else {
            console.error('Mille Bornes error:', err);
            console.error('Stack trace:', err.stack);
        }
    }
}

/**
 * Export start function for game selector
 */
export async function start() {
    // Reset game state when launched from menu
    resetGame();
    // Set non-standalone mode (launched from menu)
    await startGame(false);
}

// Auto-start if standalone
const isStandalone = window.location.pathname.includes('mille.html');
if (isStandalone) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startGame);
    } else {
        startGame();
    }
}

// Handle interrupts (Ctrl-C equivalent)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) {
        e.preventDefault();
        rub(0);
    }
});
