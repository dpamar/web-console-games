import { SettingsManager } from '../utils/SettingsManager.js';

/**
 * Debug logging system for knowledge grid operations.
 * Singleton that tracks logs per player and actions history.
 */
export class KnowledgeDebug {
    constructor() {
        this.logsPerPlayer = [
            [], [], [], [], [], []
        ];
        this.actions = [];
    }

    static initialize() {
        instance = new KnowledgeDebug();
    }

    static log(playerNumber, log) {
        if (!SettingsManager.verbose()) {
            return;
        }
        instance.logsPerPlayer[playerNumber - 1].push(log);
    }

    static getLogs(playerNumber) {
        return instance.logsPerPlayer[playerNumber - 1].join('\n');
    }

    static logAction(action) {
        instance.actions.push(action);
    }

    static getStepsToReproduce() {
        return instance.actions.map(a => a.toString()).join('\n');
    }
}

let instance = null;
