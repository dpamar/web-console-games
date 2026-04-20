import { CluedoRandom } from '../utils/JavaRandom.js';
/**
 * Settings manager singleton - stores game configuration.
 * Equivalent to Java's SettingsManager class.
 */
class SettingsManager {
    constructor(seed, verbose, useHighlight) {
        this.seed = seed;
        this.verbose = verbose;
        this.useHighlight = useHighlight;
    }

    static initialize(seed, verbose, useHighlight) {
        instance = new SettingsManager(
            seed !== null && seed !== undefined ? seed : Date.now(),
            verbose,
            useHighlight
        );
        CluedoRandom.initialize(instance.seed);
    }

    static get() {
        return instance;
    }

    static seed() {
        return instance.seed;
    }

    static setSeed(seed) {
        instance.seed = seed;
        CluedoRandom.initialize(seed);
    }

    static verbose() {
        return instance.verbose;
    }

    static setVerbose(verbose) {
        instance.verbose = verbose;
    }

    static useHighlight() {
        return instance.useHighlight;
    }

    static setUseHighlight(useHighlight) {
        instance.useHighlight = useHighlight;
    }
}

let instance = null;

export { SettingsManager };
