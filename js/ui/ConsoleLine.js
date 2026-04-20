/**
 * ConsoleLine builder - creates styled text lines for console output.
 * Maps Java ConsoleLine class to DOM generation.
 *
 * Shared component for all web-console games.
 */
export class ConsoleLine {
    static snippetsWithColors = new Map();
    static settingsManager = null;

    /**
     * Set the settings manager for this console instance
     * (allows games to provide their own settings)
     */
    static setSettingsManager(manager) {
        ConsoleLine.settingsManager = manager;
    }

    /**
     * Register a snippet (card name, etc.) with a style for automatic highlighting
     */
    static setSnippetStyle(snippet, style) {
        ConsoleLine.snippetsWithColors.set(snippet, style);
    }

    /**
     * Clear all snippet styles
     */
    static clearSnippetStyles() {
        ConsoleLine.snippetsWithColors.clear();
    }

    constructor(skipHighlights, emptyStyle = '') {
        this.parts = [];
        this.styleStack = [];
        this.skipHighlights = skipHighlights;
        this.textLength = 0;
        this.emptyStyle = emptyStyle;
    }

    static startNew(emptyStyle = '') {
        return new ConsoleLine(false, emptyStyle);
    }

    static startNewSkippingHighlight(emptyStyle = '') {
        return new ConsoleLine(true, emptyStyle);
    }

    /**
     * Push a new style onto the stack
     */
    startNewStyle(style) {
        this.styleStack.push(style);
        return this;
    }

    /**
     * Pop the current style from the stack
     */
    endCurrentStyle() {
        if (this.styleStack.length > 0) {
            this.styleStack.pop();
        }
        return this;
    }

    /**
     * Combine multiple styles (CSS classes)
     */
    static combineStyles(...styles) {
        const nonEmpty = styles.filter(s => s && s !== '');
        return nonEmpty.join(' ');
    }

    /**
     * Add text with optional style (one-shot, doesn't affect stack)
     */
    addText(text, style = null) {
        if (style !== null && style !== undefined && style !== this.emptyStyle) {
            // One-shot style - if not EMPTY, it overrides the stack style
            this.parts.push({ text, style });
            this.textLength += text.length;
        } else {
            // Use current style from stack (including when style is EMPTY)
            const currentStyle = this.styleStack.length > 0
                ? this.styleStack[this.styleStack.length - 1]
                : this.emptyStyle;

            this.parts.push({ text, style: currentStyle });
            this.textLength += text.length;
        }
        return this;
    }

    /**
     * Apply snippet highlighting to text parts
     */
    applySnippetHighlighting(parts) {
        if (this.skipHighlights || (ConsoleLine.settingsManager && !ConsoleLine.settingsManager.useHighlight())) {
            return parts;
        }

        const result = [];

        for (const part of parts) {
            const text = part.text;
            const baseStyle = part.style;
            let lastIndex = 0;
            let matched = false;

            // Sort snippets by length (longest first) to match longer snippets first
            const sortedSnippets = Array.from(ConsoleLine.snippetsWithColors.keys())
                .sort((a, b) => b.length - a.length);

            // Find all snippet matches in this text part
            const matches = [];
            for (const snippet of sortedSnippets) {
                const regex = new RegExp('\\b' + snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({ start: match.index, end: match.index + snippet.length, snippet });
                }
            }

            // Sort matches by position
            matches.sort((a, b) => a.start - b.start);

            // Remove overlapping matches (keep first)
            const filteredMatches = [];
            let lastEnd = -1;
            for (const match of matches) {
                if (match.start >= lastEnd) {
                    filteredMatches.push(match);
                    lastEnd = match.end;
                }
            }

            // Build result with highlighted snippets
            if (filteredMatches.length === 0) {
                result.push(part);
            } else {
                for (const match of filteredMatches) {
                    // Add text before match
                    if (match.start > lastIndex) {
                        result.push({
                            text: text.substring(lastIndex, match.start),
                            style: baseStyle
                        });
                    }
                    // Add highlighted snippet
                    const snippetStyle = ConsoleLine.snippetsWithColors.get(match.snippet);
                    result.push({
                        text: text.substring(match.start, match.end),
                        style: ConsoleLine.combineStyles(baseStyle, snippetStyle)
                    });
                    lastIndex = match.end;
                }
                // Add remaining text
                if (lastIndex < text.length) {
                    result.push({
                        text: text.substring(lastIndex),
                        style: baseStyle
                    });
                }
            }
        }

        return result;
    }

    /**
     * Display the line by appending to DOM
     */
    display() {
        const container = document.getElementById('output-container');
        if (!container) return;

        // Check if user is scrolled to bottom (with 5px tolerance)
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 5;

        const lineDiv = document.createElement('div');
        lineDiv.className = 'console-line';

        // Apply snippet highlighting
        const highlightedParts = this.applySnippetHighlighting(this.parts);

        highlightedParts.forEach(part => {
            const span = document.createElement('span');
            span.className = part.style || '';
            // Always use textContent for security
            span.textContent = part.text;
            lineDiv.appendChild(span);
        });

        container.appendChild(lineDiv);

        // Auto-scroll to bottom if user was already at bottom
        if (isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }

    /**
     * Get the text length (without styles)
     */
    length() {
        return this.textLength;
    }

    // Static convenience methods

    static displayEmptyLine() {
        ConsoleLine.startNew().addText('').display();
    }

    static displayText(text, style = null) {
        if (style !== null && style !== undefined) {
            ConsoleLine.startNew().addText(text, style).display();
        } else {
            ConsoleLine.startNew().addText(text).display();
        }
    }
}
