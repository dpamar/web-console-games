/**
 * Console adapter for web - replaces ANSI terminal codes with DOM manipulation.
 * Maps Java Console class behavior to browser environment.
 *
 * Shared component for all web-console games.
 */
export class Console {
    /**
     * Clear screen - equivalent to ANSI "\u001B[2J"
     */
    static clearScreen() {
        const container = document.getElementById('output-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Set cursor to top-left - equivalent to ANSI "\u001B[1;1H"
     * In web, this scrolls to top of container
     */
    static setCursor() {
        const container = document.getElementById('output-container');
        if (container) {
            container.scrollTop = 0;
        }
    }

    /**
     * Restore terminal - no-op in web environment
     * In Java this runs stty commands to restore terminal state
     */
    static restoreTerminal() {
        // Nothing to do in web - terminal state is managed by browser
    }
}
