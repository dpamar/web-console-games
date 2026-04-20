/**
 * KeyboardManager - Centralized keyboard event handling for web-console games.
 *
 * Allows games to register handlers for specific keys or key combinations,
 * and provides a clean way to manage keyboard event lifecycle.
 */
export class KeyboardManager {
    constructor() {
        this.handlers = [];
        this.keyDownListener = null;
        this.isActive = false;
    }

    /**
     * Start listening to keyboard events
     */
    start() {
        if (this.isActive) return;

        this.keyDownListener = (e) => this.handleKeyDown(e);
        document.addEventListener('keydown', this.keyDownListener);
        this.isActive = true;
    }

    /**
     * Stop listening to keyboard events
     */
    stop() {
        if (!this.isActive) return;

        if (this.keyDownListener) {
            document.removeEventListener('keydown', this.keyDownListener);
            this.keyDownListener = null;
        }
        this.isActive = false;
    }

    /**
     * Handle key down event
     */
    handleKeyDown(e) {
        // Find matching handler
        for (const handler of this.handlers) {
            // For custom handlers (key === null), always try the callback
            // For regular handlers, check if key matches
            const shouldHandle = handler.key === null || this.matchesKey(e, handler.key, handler.modifiers);

            if (shouldHandle) {
                if (handler.preventDefault) {
                    e.preventDefault();
                }

                const result = handler.callback(e);

                // If callback returns false, stop listening
                if (result === false) {
                    this.stop();
                }

                // If not passthrough, stop propagation
                if (!handler.passthrough) {
                    break;
                }
            }
        }
    }

    /**
     * Check if event matches a key pattern
     */
    matchesKey(event, keyPattern, modifiers = {}) {
        // Check modifiers
        if (modifiers.shift !== undefined && event.shiftKey !== modifiers.shift) return false;
        if (modifiers.ctrl !== undefined && event.ctrlKey !== modifiers.ctrl) return false;
        if (modifiers.alt !== undefined && event.altKey !== modifiers.alt) return false;
        if (modifiers.meta !== undefined && event.metaKey !== modifiers.meta) return false;

        // Check key - can be a string or array of strings
        if (Array.isArray(keyPattern)) {
            return keyPattern.includes(event.key);
        }
        return event.key === keyPattern;
    }

    /**
     * Register a handler for a specific key or key combination
     *
     * @param {string|string[]} key - Key name or array of key names (e.g., 'Enter', ['ArrowUp', 'w'])
     * @param {function} callback - Function to call when key is pressed. Return false to stop the manager.
     * @param {Object} options - Additional options
     * @param {boolean} options.preventDefault - Whether to call preventDefault (default: true)
     * @param {boolean} options.passthrough - Whether to allow other handlers to run (default: false)
     * @param {Object} options.modifiers - Modifier keys (shift, ctrl, alt, meta)
     * @returns {function} Unregister function
     */
    on(key, callback, options = {}) {
        const handler = {
            key,
            callback,
            preventDefault: options.preventDefault !== false,
            passthrough: options.passthrough === true,
            modifiers: options.modifiers || {}
        };

        this.handlers.push(handler);

        // Return unregister function
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index > -1) {
                this.handlers.splice(index, 1);
            }
        };
    }

    /**
     * Register a handler with a custom matcher function
     *
     * @param {function} matcher - Function that receives the event and returns true if it should handle it
     * @param {function} callback - Function to call when matcher returns true
     * @param {Object} options - Additional options (preventDefault, passthrough)
     * @returns {function} Unregister function
     */
    onCustom(matcher, callback, options = {}) {
        const handler = {
            key: null,
            callback: (e) => {
                if (matcher(e)) {
                    return callback(e);
                }
            },
            preventDefault: options.preventDefault !== false,
            passthrough: options.passthrough === true,
            modifiers: {}
        };

        this.handlers.push(handler);

        return () => {
            const index = this.handlers.indexOf(handler);
            if (index > -1) {
                this.handlers.splice(index, 1);
            }
        };
    }

    /**
     * Clear all registered handlers
     */
    clearHandlers() {
        this.handlers = [];
    }

    /**
     * Create a scoped keyboard manager that automatically cleans up
     *
     * @returns {Object} Object with start/stop/on/cleanup methods
     */
    static createScoped() {
        const manager = new KeyboardManager();
        const unregisters = [];

        return {
            start() {
                manager.start();
            },
            stop() {
                manager.stop();
            },
            on(key, callback, options) {
                const unregister = manager.on(key, callback, options);
                unregisters.push(unregister);
                return unregister;
            },
            onCustom(matcher, callback, options) {
                const unregister = manager.onCustom(matcher, callback, options);
                unregisters.push(unregister);
                return unregister;
            },
            cleanup() {
                manager.stop();
                unregisters.forEach(fn => fn());
                unregisters.length = 0;
            }
        };
    }
}
