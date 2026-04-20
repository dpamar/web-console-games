/**
 * Main entry point for Cluedo web game.
 * Manages the game loop: menu -> game -> menu -> ...
 */

import { Console } from '../ui/Console.js';
import { MainMenu } from './ui/MainMenu.js';
import { InteractiveInterface } from './ui/InteractiveInterface.js';
import { SettingsManager } from './utils/SettingsManager.js';
import { CluedoRandom } from './utils/JavaRandom.js';
import { KnowledgeDebug } from './logic/KnowledgeDebug.js';
import { CluedoGameInteractive, ModeJeu } from './mechanics/GameEngine.js';

/**
 * Main game loop
 */
async function main(isStandalone = true) {
    // Parse URL parameters for seed, verbose, highlight
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const verboseParam = urlParams.get('verbose');
    const highlightParam = urlParams.get('no-highlight');

    const seed = seedParam ? parseInt(seedParam, 10) : Date.now();
    const verbose = verboseParam === 'true' || verboseParam === '1';
    const highlight = highlightParam !== 'true' && highlightParam !== '1';

    // Initialize settings
    SettingsManager.initialize(seed, verbose, highlight);
    KnowledgeDebug.initialize();

    // Main game loop
    while (true) {
        // Show menu
        console.log('Creating menu...');
        const menu = new MainMenu();
        console.log('Waiting for menu.start()...');
        const choix = await menu.start();
        console.log('Menu returned:', choix);

        // Determine game mode
        const mode = (choix === 0) ? ModeJeu.REEL : ModeJeu.ENIGME;
        console.log('Mode:', mode);

        // Create game interface and engine
        InteractiveInterface.init();
        const gameInterface = InteractiveInterface.get();
        gameInterface.setStandalone(isStandalone);

        const game = new CluedoGameInteractive(mode);
        game.setInterface(gameInterface);
        gameInterface.setGameEngine(game);

        // Start game
        game.play();
        await gameInterface.start(); // Wait for game to finish

        console.log('Game finished');

        // Check if user wants to return to main menu
        if (gameInterface.isReturnToMainMenuRequested()) {
            gameInterface.resetReturnToMainMenuRequest();
            Console.clearScreen();
            return; // Return to GameSelector
        }

        // Check if user wants to restart or quit
        if (gameInterface.isQuitRequested()) {
            gameInterface.resetQuitRequest();
            break;
        }
        if (gameInterface.isNewGameRequested()) {
            gameInterface.resetNewGameRequest();
            KnowledgeDebug.initialize();
        }
    }

    // Clear screen on exit
    Console.clearScreen();
}

/**
 * Export start function for use by game selector
 */
export async function start() {
    await main(false); // Not standalone when called from GameSelector
}

// Auto-start only when loaded via cluedo.html
// The main game selector will call start() explicitly
const isStandalone = window.location.pathname.includes('cluedo.html');
if (isStandalone) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
}
