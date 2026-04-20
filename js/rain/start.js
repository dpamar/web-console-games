/**
 * Rain - Interactive version for web console
 */

import { Console } from '../ui/Console.js';
import { ConsoleLine } from '../ui/ConsoleLine.js';
import { KeyboardManager } from '../core/KeyboardManager.js';
import { Rain } from './rain.js';

/**
 * Menu for setting delay value
 */
class DelayMenu {
    constructor() {
        this.delay = 120;
        this.keyboard = KeyboardManager.createScoped();
        this.resolvePromise = null;
    }

    start() {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.setupKeyboardHandler();
            this.keyboard.start();
            this.display();
        });
    }

    setupKeyboardHandler() {
        this.keyboard.onCustom(
            () => true,
            (e) => {
                this.handleKey(e);
                this.display();
            },
            { preventDefault: true }
        );
    }

    handleKey(e) {
        switch (e.key) {
            case 'Enter':
                this.finish();
                break;
            case 'Escape':
                this.finish(true);
                break;
            case 'Backspace':
                this.delay = Math.floor(this.delay / 10);
                break;
            default:
                // Direct number input
                if (e.key >= '0' && e.key <= '9') {
                    const num = parseInt(e.key);
                    const newDelay = this.delay * 10 + num;
                    if (newDelay < 10000) {
                        this.delay = newDelay;
                    }
                }
                break;
        }
    }

    finish(cancel = false) {
        this.keyboard.cleanup();
        if (this.resolvePromise) {
            // If delay is 0 (empty), use default 120
            const finalDelay = this.delay === 0 ? 120 : this.delay;
            this.resolvePromise(cancel ? null : finalDelay);
        }
    }

    display() {
        Console.clearScreen();

        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("  ╔══════════════════════════════════════╗");
        ConsoleLine.displayText("  ║           RAIN SETTINGS              ║");
        ConsoleLine.displayText("  ╚══════════════════════════════════════╝");
        ConsoleLine.displayEmptyLine();
        const displayValue = this.delay === 0 ? '' : `${this.delay} ms`;
        ConsoleLine.displayText(`           Delay: ${displayValue}`);
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("Instructions:");
        ConsoleLine.displayText("  0-9      : Type delay value");
        ConsoleLine.displayText("  BKSP     : Delete digit");
        ConsoleLine.displayText("  ENTER    : Confirm (default: 120)");
        ConsoleLine.displayText("  ESC      : Cancel");
        ConsoleLine.displayEmptyLine();
        ConsoleLine.displayText("Note: Lower delay = faster animation");
    }
}

/**
 * Canvas-based display for rain animation
 */
class RainDisplay {
    constructor(cols, lines) {
        this.cols = cols;
        this.lines = lines;
        this.cells = [];
        this.canvas = null;
        this.ctx = null;
        this.charWidth = 10;
        this.charHeight = 16;

        // Initialize cells
        for (let y = 0; y < this.lines; y++) {
            this.cells[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.cells[y][x] = ' ';
            }
        }
    }

    createCanvas() {
        const container = document.getElementById('output-container');
        if (!container) return;

        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.cols * this.charWidth;
        this.canvas.height = this.lines * this.charHeight;
        this.canvas.style.backgroundColor = '#000';
        this.canvas.style.display = 'block';

        this.ctx = this.canvas.getContext('2d');
        this.ctx.font = '14px monospace';
        this.ctx.textBaseline = 'top';

        container.appendChild(this.canvas);
    }

    setChar(y, x, ch) {
        if (y >= 0 && y < this.lines && x >= 0 && x < this.cols) {
            this.cells[y][x] = ch;
        }
    }

    refresh() {
        if (!this.ctx) return;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#0f0';
        for (let y = 0; y < this.lines; y++) {
            for (let x = 0; x < this.cols; x++) {
                const ch = this.cells[y][x];
                if (ch !== ' ') {
                    this.ctx.fillText(ch, x * this.charWidth, y * this.charHeight);
                }
            }
        }
    }
}

export async function start() {
    while (true) {
        // Show delay menu
        const menu = new DelayMenu();
        const delay = await menu.start();

        if (delay === null) {
            return; // User cancelled - return to main menu
        }

        // Set up display
        const cols = 80;
        const lines = 24;
        const display = new RainDisplay(cols, lines);
        display.createCanvas();

        // Set up rain animation
        const rain = new Rain(delay);
        rain.init(cols, lines);

        rain.onDraw = (y, x, ch) => {
            display.setChar(y, x, ch);
        };

        rain.onRefresh = () => {
            display.refresh();
        };

        // Set up ESC to quit - will return to rain menu
        const keyboard = KeyboardManager.createScoped();

        await new Promise((resolve) => {
            keyboard.onCustom(
                (e) => e.key === 'Escape',
                () => {
                    rain.stop();
                    keyboard.cleanup();
                    resolve();
                },
                { preventDefault: true }
            );

            keyboard.start();
            rain.start();
        });

        // Loop continues - back to rain menu
    }
}
