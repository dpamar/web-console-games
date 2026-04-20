/**
 * Main entry point for the web games collection.
 * Displays a game selector menu and launches the chosen game.
 */
import { Console } from './ui/Console.js';
import { GameSelector } from './GameSelector.js';

/**
 * Game registry - add new games here
 */
const GAMES = [
    {
        name: 'Adventure',
        module: './adventure/start.js',
        description: 'Colossal Cave Adventure'
    },
    {
        name: 'BCD',
        module: './bcd/start.js',
        description: 'Punch card converter'
    },
    {
        name: 'Caesar',
        module: './caesar/start.js',
        description: 'Caesar cipher encryption/decryption'
    },
    {
        name: 'Cluedo',
        module: './cluedo/main.js',
        description: 'Jeu de déduction Cluedo'
    },
    {
        name: 'Factor',
        module: './factor/start.js',
        description: 'Factorize numbers into primes'
    },
    {
        name: 'Mille Bornes',
        module: './mille/start.js',
        description: 'Course aux 1000 bornes'
    },
    {
        name: 'Morse',
        module: './morse/start.js',
        description: 'Morse code converter'
    },
    {
        name: 'Number',
        module: './number/start.js',
        description: 'Convert numbers to English words'
    },
    {
        name: 'Pig',
        module: './pig/start.js',
        description: 'Pig Latin converter'
    },
    {
        name: 'PPT',
        module: './ppt/start.js',
        description: 'Paper tape converter'
    },
    {
        name: 'Rain',
        module: './rain/start.js',
        description: 'Animated rain display'
    }
];

/**
 * Main application loop
 */
async function main() {
    while (true) {
        // Show game selector
        const selector = new GameSelector(GAMES);
        const selectedGame = await selector.start();

        // Launch the selected game
        try {
            Console.clearScreen();

            // Dynamically import and run the game
            const gameModule = await import(selectedGame.module);

            // If the game module exports a start function, call it
            if (gameModule.start) {
                await gameModule.start();
            } else if (gameModule.default) {
                // Otherwise try default export
                await gameModule.default();
            }

            // After game ends, return to menu
            Console.clearScreen();
        } catch (error) {
            console.error('Error loading game:', error);
            Console.clearScreen();
            alert(`Erreur lors du chargement du jeu: ${error.message}`);
        }
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
