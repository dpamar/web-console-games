/**
 * Rain animation
 * Ported from BSD games rain.c
 */

/**
 * Rain animation engine
 */
export class Rain {
    constructor(delay = 120) {
        this.delay = delay; // in milliseconds
        this.running = false;
        this.cols = 0;
        this.lines = 0;
        this.xpos = [0, 0, 0, 0, 0];
        this.ypos = [0, 0, 0, 0, 0];
        this.j = 0;
        this.intervalId = null;
    }

    /**
     * Initialize the animation
     */
    init(cols, lines) {
        this.cols = cols - 4;
        this.lines = lines - 4;

        // Initialize positions
        for (let i = 4; i >= 0; i--) {
            this.xpos[i] = Math.floor(Math.random() * this.cols) + 2;
            this.ypos[i] = Math.floor(Math.random() * this.lines) + 2;
        }
        this.j = 0;
    }

    /**
     * Draw a character at position
     */
    drawChar(y, x, ch) {
        if (this.onDraw) {
            this.onDraw(y, x, ch);
        }
    }

    /**
     * Draw a string at position
     */
    drawString(y, x, str) {
        if (this.onDraw) {
            for (let i = 0; i < str.length; i++) {
                this.onDraw(y, x + i, str[i]);
            }
        }
    }

    /**
     * Single animation frame
     */
    frame() {
        const x = Math.floor(Math.random() * this.cols) + 2;
        const y = Math.floor(Math.random() * this.lines) + 2;

        this.drawChar(y, x, '.');

        this.drawChar(this.ypos[this.j], this.xpos[this.j], 'o');
        if (--this.j < 0) this.j = 4;

        this.drawChar(this.ypos[this.j], this.xpos[this.j], 'O');
        if (--this.j < 0) this.j = 4;

        this.drawChar(this.ypos[this.j] - 1, this.xpos[this.j], '-');
        this.drawString(this.ypos[this.j], this.xpos[this.j] - 1, '|.|');
        this.drawChar(this.ypos[this.j] + 1, this.xpos[this.j], '-');
        if (--this.j < 0) this.j = 4;

        this.drawChar(this.ypos[this.j] - 2, this.xpos[this.j], '-');
        this.drawString(this.ypos[this.j] - 1, this.xpos[this.j] - 1, '/ \\');
        this.drawString(this.ypos[this.j], this.xpos[this.j] - 2, '| O |');
        this.drawString(this.ypos[this.j] + 1, this.xpos[this.j] - 1, '\\ /');
        this.drawChar(this.ypos[this.j] + 2, this.xpos[this.j], '-');
        if (--this.j < 0) this.j = 4;

        this.drawChar(this.ypos[this.j] - 2, this.xpos[this.j], ' ');
        this.drawString(this.ypos[this.j] - 1, this.xpos[this.j] - 1, '   ');
        this.drawString(this.ypos[this.j], this.xpos[this.j] - 2, '     ');
        this.drawString(this.ypos[this.j] + 1, this.xpos[this.j] - 1, '   ');
        this.drawChar(this.ypos[this.j] + 2, this.xpos[this.j], ' ');

        this.xpos[this.j] = x;
        this.ypos[this.j] = y;

        if (this.onRefresh) {
            this.onRefresh();
        }
    }

    /**
     * Start the animation
     */
    start() {
        this.running = true;
        this.intervalId = setInterval(() => {
            if (this.running) {
                this.frame();
            }
        }, this.delay);
    }

    /**
     * Stop the animation
     */
    stop() {
        this.running = false;
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
