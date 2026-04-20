/**
 * Console style factory - allows each game to define its own styles.
 *
 * Each game should create its own style object by calling createStyles()
 * and passing game-specific style definitions.
 */
export class ConsoleStyleFactory {
    /**
     * Create a style object with base styles plus custom game styles
     *
     * @param {Object} customStyles - Game-specific styles to merge with base styles
     * @returns {Object} Complete style object with EMPTY constant and all defined styles
     */
    static createStyles(customStyles = {}) {
        const baseStyles = {
            EMPTY: '',

            // Basic colors
            BLUE: 'color-blue',
            CYAN: 'color-cyan',
            GREEN: 'color-green',
            RED: 'color-red',
            WHITE_BG: 'color-black bg-white',
            YELLOW: 'color-yellow',
            BLACK: 'color-black bg-white',
            GREEN_ON_WHITE: 'color-green bg-white',
        };

        const styles = { ...baseStyles, ...customStyles };

        // Add helper method for compatibility
        styles.value = function(style) {
            return style;
        };

        return styles;
    }
}
