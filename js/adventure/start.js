/**
 * Adventure - Colossal Cave Adventure
 * Entry point
 */

import { ConsoleLine } from '../ui/ConsoleLine.js';
import { Console } from '../ui/Console.js';
import { startAdventure } from './main.js';

async function main() {
    while (true) {
        Console.clearScreen();

        // Display title
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText('═'.repeat(60));
        ConsoleLine.displayText(' '.repeat(10) + 'COLOSSAL CAVE ADVENTURE');
        ConsoleLine.displayText('═'.repeat(60));
        ConsoleLine.displayEmptyLine();

        try {
            await startAdventure();
        } catch (error) {
            ConsoleLine.displayEmptyLine();
            ConsoleLine.displayText('An error occurred:');
            ConsoleLine.displayText(error.message);
            ConsoleLine.displayEmptyLine();
            console.error('Adventure error:', error);
        }

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText('Press any key to start a new game...');

        await new Promise((resolve) => {
            const handler = () => {
                document.removeEventListener('keydown', handler);
                resolve();
            };
            document.addEventListener('keydown', handler);
        });
    }
}

export async function start() {
    Console.clearScreen();

    // Display title
    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayText('═'.repeat(60));
    ConsoleLine.displayText(' '.repeat(10) + 'COLOSSAL CAVE ADVENTURE');
    ConsoleLine.displayText('═'.repeat(60));
    ConsoleLine.displayEmptyLine();

    try {
        await startAdventure();
    } catch (error) {
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText('An error occurred:');
        ConsoleLine.displayText(error.message);
        ConsoleLine.displayEmptyLine();
        console.error('Adventure error:', error);
    }

    ConsoleLine.displayEmptyLine();
    ConsoleLine.displayText('Press any key to return to the main menu...');

    return new Promise((resolve) => {
        const handler = () => {
            document.removeEventListener('keydown', handler);
            resolve();
        };
        document.addEventListener('keydown', handler);
    });
}

// Auto-start when loaded via adventure.html
const isStandalone = window.location.pathname.includes('adventure.html');
if (isStandalone) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
}
