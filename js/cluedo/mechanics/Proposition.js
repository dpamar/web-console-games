/**
 * Represents a Cluedo proposition (or accusation) consisting of
 * exactly one suspect, one weapon, and one room.
 * Immutable value object.
 */
export class Proposition {
    constructor(suspect, weapon, room) {
        this.suspect = suspect;
        this.weapon = weapon;
        this.room = room;
    }

    containsCard(card) {
        switch (card.type) {
            case 'SUSPECT':
                return card.equals(this.suspect);
            case 'WEAPON':
                return card.equals(this.weapon);
            case 'ROOM':
                return card.equals(this.room);
            default:
                return false;
        }
    }

    /**
     * Convert to array of Cards for easier processing by AI logic
     */
    getCards() {
        return [this.suspect, this.weapon, this.room];
    }

    /**
     * Two propositions are equal if all three components match
     */
    equals(other) {
        if (!other || !(other instanceof Proposition)) return false;
        return this.suspect.equals(other.suspect) &&
               this.weapon.equals(other.weapon) &&
               this.room.equals(other.room);
    }

    /**
     * Hash based on all three components for Set/Map usage
     */
    hashCode() {
        return `${this.suspect.hashCode()}_${this.weapon.hashCode()}_${this.room.hashCode()}`;
    }

    /**
     * String representation in French for display
     */
    toString() {
        return `${this.suspect}, ${this.weapon}, ${this.room}`;
    }
}
