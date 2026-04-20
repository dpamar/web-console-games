/**
 * ncurses.js - Minimal ncurses-like library for web
 * Portage of ncurses functions used by Mille Bornes
 */

// Window structure
class NWindow {
    constructor(height, width, y, x) {
        this.height = height;
        this.width = width;
        this.begy = y;
        this.begx = x;
        this.cury = 0;
        this.curx = 0;

        // Buffer: 2D array of characters with attributes
        this.buffer = [];
        for (let i = 0; i < height; i++) {
            this.buffer[i] = [];
            for (let j = 0; j < width; j++) {
                this.buffer[i][j] = { ch: ' ', attr: 0 };
            }
        }

        // Dirty flag
        this.dirty = true;
    }

    clear() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                this.buffer[i][j] = { ch: ' ', attr: 0 };
            }
        }
        this.dirty = true;
    }
}

// Global state
let stdscr = null;
let curscr = null;
const windows = [];
let currentAttr = 0;
const A_STANDOUT = 1;
const A_NORMAL = 0;

// Output container
let outputContainer = null;

/**
 * Initialize ncurses
 */
export function initscr() {
    outputContainer = document.getElementById('output-container');
    if (!outputContainer) {
        throw new Error('output-container not found');
    }

    // Create standard screen (full terminal)
    stdscr = new NWindow(24, 80, 0, 0);
    curscr = stdscr;

    return stdscr;
}

/**
 * End ncurses mode
 */
export function endwin() {
    if (outputContainer) {
        outputContainer.textContent = '';
    }
    stdscr = null;
    curscr = null;
    windows.length = 0;
}

/**
 * Create a new window
 */
export function newwin(height, width, y, x) {
    const win = new NWindow(height, width, y, x);
    windows.push(win);
    return win;
}

/**
 * Delete a window
 */
export function delwin(win) {
    const idx = windows.indexOf(win);
    if (idx !== -1) {
        windows.splice(idx, 1);
    }
}

/**
 * Move cursor in window
 */
export function wmove(win, y, x) {
    if (y >= 0 && y < win.height && x >= 0 && x < win.width) {
        win.cury = y;
        win.curx = x;
        return 0;
    }
    return -1;
}

/**
 * Move cursor in stdscr
 */
export function move(y, x) {
    return wmove(stdscr, y, x);
}

/**
 * Add character at current position
 */
export function waddch(win, ch) {
    const chStr = typeof ch === 'string' ? ch : String.fromCharCode(ch);

    // Handle newline
    if (chStr === '\n') {
        win.curx = 0;
        win.cury++;
        win.dirty = true;
        return;
    }

    // Handle carriage return
    if (chStr === '\r') {
        win.curx = 0;
        win.dirty = true;
        return;
    }

    // Handle backspace
    if (chStr === '\b' || chStr === '\x08') {
        if (win.curx > 0) {
            win.curx--;
        }
        win.dirty = true;
        return;
    }

    if (win.cury < win.height && win.curx < win.width) {
        win.buffer[win.cury][win.curx] = {
            ch: chStr,
            attr: currentAttr
        };
        win.curx++;
        win.dirty = true;
    }
}

/**
 * Add character at current position in stdscr
 */
export function addch(ch) {
    waddch(stdscr, ch);
}

/**
 * Add character at position
 */
export function mvaddch(y, x, ch) {
    move(y, x);
    waddch(stdscr, ch);
}

/**
 * Add character at position in window
 */
export function mvwaddch(win, y, x, ch) {
    wmove(win, y, x);
    waddch(win, ch);
}

/**
 * Add string at current position
 */
export function waddstr(win, str) {
    for (let i = 0; i < str.length; i++) {
        if (win.curx >= win.width) break;
        waddch(win, str[i]);
    }
}

/**
 * Add string at current position in stdscr
 */
export function addstr(str) {
    waddstr(stdscr, str);
}

/**
 * Add string at position
 */
export function mvaddstr(y, x, str) {
    move(y, x);
    waddstr(stdscr, str);
}

/**
 * Add string at position in window
 */
export function mvwaddstr(win, y, x, str) {
    wmove(win, y, x);
    waddstr(win, str);
}

/**
 * Formatted print in window
 */
export function wprintw(win, fmt, ...args) {
    let str = fmt;
    let argIdx = 0;

    // Simple sprintf-like formatting
    str = str.replace(/%(-)?(\d+)?(\.\d+)?([sdfl])/g, (match, minus, width, precision, type) => {
        if (argIdx >= args.length) return match;

        let val = args[argIdx++];
        let result = '';

        if (type === 'd' || type === 'l') {
            result = String(Math.floor(val));
        } else if (type === 'f') {
            const prec = precision ? parseInt(precision.substring(1)) : 6;
            result = val.toFixed(prec);
        } else {
            result = String(val);
            // For strings, precision means max length
            if (precision) {
                const maxLen = parseInt(precision.substring(1));
                if (result.length > maxLen) {
                    result = result.substring(0, maxLen);
                }
            }
        }

        // Width padding
        if (width) {
            const w = parseInt(width);
            if (minus) {
                result = result.padEnd(w, ' ');
            } else {
                result = result.padStart(w, ' ');
            }
        }

        return result;
    });

    waddstr(win, str);
}

/**
 * Formatted print at position
 */
export function mvprintw(y, x, fmt, ...args) {
    move(y, x);
    wprintw(stdscr, fmt, ...args);
}

/**
 * Formatted print at position in window
 */
export function mvwprintw(win, y, x, fmt, ...args) {
    wmove(win, y, x);
    wprintw(win, fmt, ...args);
}

/**
 * Clear to end of line
 */
export function wclrtoeol(win) {
    for (let x = win.curx; x < win.width; x++) {
        win.buffer[win.cury][x] = { ch: ' ', attr: 0 };
    }
    win.dirty = true;
}

export function clrtoeol() {
    wclrtoeol(stdscr);
}

/**
 * Clear to bottom of window
 */
export function wclrtobot(win) {
    // Clear current line from cursor
    wclrtoeol(win);

    // Remaining lines
    for (let y = win.cury + 1; y < win.height; y++) {
        for (let x = 0; x < win.width; x++) {
            win.buffer[y][x] = { ch: ' ', attr: 0 };
        }
    }
    win.dirty = true;
}

export function clrtobot() {
    wclrtobot(stdscr);
}

/**
 * Erase window
 */
export function werase(win) {
    win.clear();
}

export function erase() {
    werase(stdscr);
}

/**
 * Clear window
 */
export function wclear(win) {
    win.clear();
}

export function clear() {
    wclear(stdscr);
}

/**
 * Set standout mode
 */
export function standout() {
    currentAttr = A_STANDOUT;
}

/**
 * End standout mode
 */
export function standend() {
    currentAttr = A_NORMAL;
}

/**
 * Set attribute
 */
export function attron(attr) {
    currentAttr |= attr;
}

export function attroff(attr) {
    currentAttr &= ~attr;
}

export function attrset(attr) {
    currentAttr = attr;
}

/**
 * Refresh window - render to DOM
 */
export function wrefresh(win) {
    if (!win.dirty) return;

    renderWindow(win);
    win.dirty = false;
}

export function refresh() {
    wrefresh(stdscr);
}

/**
 * Render window to DOM using safe DOM APIs
 */
function renderWindow(win) {
    if (!outputContainer) {
        console.error("renderWindow: no outputContainer!");
        return;
    }

    // Find or create window container
    let winDiv = win.domElement;
    if (!winDiv) {
        winDiv = document.createElement('div');
        winDiv.style.position = 'absolute';
        //winDiv.style.fontFamily = "'Courier New', monospace";
        //winDiv.style.fontSize = '16px';
        winDiv.style.lineHeight = '1.2';
        winDiv.style.whiteSpace = 'pre';
        winDiv.style.top = (win.begy * 1.2) + 'em';
        winDiv.style.left = (win.begx * 0.6) + 'em';
        winDiv.style.color = '#00ff00';
        winDiv.className = 'ncurses-window';
        outputContainer.appendChild(winDiv);
        win.domElement = winDiv;
        console.log("Created window at", win.begy, win.begx, "size", win.height, win.width);
    }

    // Clear existing content
    winDiv.textContent = '';

    // Render buffer line by line
    for (let y = 0; y < win.height; y++) {
        let lineSpan = null;
        let currentLineAttr = null;

        for (let x = 0; x < win.width; x++) {
            const cell = win.buffer[y][x];

            // Check if attribute changed or starting new line
            if (lineSpan === null || currentLineAttr !== cell.attr) {
                lineSpan = document.createElement('span');

                if (cell.attr & A_STANDOUT) {
                    lineSpan.style.backgroundColor = '#ffffff';
                    lineSpan.style.color = '#000000';
                }

                winDiv.appendChild(lineSpan);
                currentLineAttr = cell.attr;
            }

            // Add character
            lineSpan.textContent += cell.ch;
        }

        // Add newline except for last line
        if (y < win.height - 1) {
            winDiv.appendChild(document.createTextNode('\n'));
        }
    }
}

/**
 * Set cbreak mode (character at a time input)
 */
export function cbreak() {
    // No-op in web context
}

/**
 * Turn off echo
 */
export function noecho() {
    // No-op in web context
}

/**
 * Set cursor visibility
 */
export function curs_set(visibility) {
    // 0 = invisible, 1 = normal, 2 = very visible
    // No-op for now
}

/**
 * Leave cursor where it is
 */
export function leaveok(win, flag) {
    win.leaveok = flag;
}

/**
 * Clear OK flag
 */
export function clearok(win, flag) {
    win.clearok = flag;
}

/**
 * Insert/delete line optimization
 */
export function idlok(win, flag) {
    win.idlok = flag;
}

/**
 * Move physical cursor
 */
export function mvcur(oldy, oldx, newy, newx) {
    // No-op in web context
    return 0;
}

/**
 * Get a character (async in web)
 */
export function getch() {
    // This needs to be handled differently in async context
    // Will be overridden by game code
    return new Promise(resolve => {
        const handler = (e) => {
            document.removeEventListener('keydown', handler);
            resolve(e.key);
        };
        document.addEventListener('keydown', handler);
    });
}

/**
 * Set stdscr to a different window (for context switching)
 */
export function setStdscr(win) {
    stdscr = win;
}

/**
 * Get current stdscr
 */
export function getStdscr() {
    return stdscr;
}

/**
 * Get curscr
 */
export function getCurscr() {
    return curscr;
}

/**
 * Export globals and constants
 */
export { A_STANDOUT, A_NORMAL };
export const LINES = 24;
export const COLS = 80;
