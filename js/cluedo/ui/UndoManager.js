/**
 * Manages undo/redo history for grid modifications.
 */
class CellChange {
    constructor(row, column, oldValue, newValue) {
        this.row = row;
        this.column = column;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    undo(grid) {
        grid.setNoHistory(this.row, this.column, this.oldValue);
    }

    redo(grid) {
        grid.setNoHistory(this.row, this.column, this.newValue);
    }

    coordinates() {
        return [this.row, this.column];
    }
}

class HistoryItem {
    constructor() {
        this.changes = [];
    }

    addModification(cellChange) {
        this.changes.push(cellChange);
    }

    undo(grid) {
        this.changes.forEach(change => change.undo(grid));
    }

    redo(grid) {
        this.changes.forEach(change => change.redo(grid));
    }
}

export class UndoManager {
    constructor() {
        this.history = [];
        this.historyPosition = 0;
        this.currentChange = null;
    }

    getHistorySize() {
        return this.history.length;
    }

    getHistoryPosition() {
        return this.historyPosition;
    }

    startChange() {
        if (this.currentChange !== null) {
            throw new Error("Change already in progress");
        }
        this.currentChange = new HistoryItem();
    }

    addModification(row, column, oldValue, newValue) {
        if (this.currentChange === null) {
            return;
        }
        this.currentChange.addModification(new CellChange(row, column, oldValue, newValue));
    }

    commit() {
        if (this.currentChange === null) {
            throw new Error("No change in progress");
        }
        this.truncateNextItems();
        this.history.push(this.currentChange);
        this.historyPosition = this.history.length;
        this.currentChange = null;
    }

    canUndo() {
        return this.historyPosition > 0;
    }

    undo(grid) {
        if (this.canUndo()) {
            const item = this.history[--this.historyPosition];
            item.undo(grid);
            return item.changes.length > 0 ? item.changes[0].coordinates() : null;
        }
        return null;
    }

    canRedo() {
        return this.historyPosition < this.history.length;
    }

    redo(grid) {
        if (this.canRedo()) {
            const item = this.history[this.historyPosition++];
            item.redo(grid);
            return item.changes.length > 0 ? item.changes[0].coordinates() : null;
        }
        return null;
    }

    truncateNextItems() {
        if (this.history.length > this.historyPosition) {
            this.history.splice(this.historyPosition);
        }
    }
}
