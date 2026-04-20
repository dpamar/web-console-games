/**
 * Represents a player action (proposition or accusation).
 */
export class Action {
    constructor(proposition, isFinal) {
        this.proposition = proposition;
        this.isFinal = isFinal;
    }

    toString() {
        return (this.isFinal ? "Accusation" : "Proposition") + " : " + this.proposition;
    }
}
