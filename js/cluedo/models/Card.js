/**
 * Represents a Cluedo card (Suspect, Weapon, or Room).
 * Immutable value object.
 */
export class Card {
    constructor(type, value, name, shortName) {
        this.type = type;
        this.value = value;
        this.name = name;
        this.shortName = shortName;
    }

    equals(other) {
        if (!other || !(other instanceof Card)) return false;
        return this.type === other.type && this.value === other.value;
    }

    hashCode() {
        // Simple hash for Map/Set usage
        return `${this.type}_${this.value}`;
    }

    toString() {
        return this.name;
    }
}
