import { Card } from './Card.js';
import { CardType } from './CardType.js';
import { CluedoRandom } from '../utils/JavaRandom.js';

/**
 * Represents Cluedo cards that can be a Suspect, Weapon, or Room.
 * Uses type-safe enum pattern with generic value storage.
 */

// Create all cards as module-level constants
const COLONEL_MUSTARD = new Card(CardType.SUSPECT, "COLONEL_MUSTARD", "Colonel Moutarde", "CM");
const REVEREND_GREEN = new Card(CardType.SUSPECT, "REVEREND_GREEN", "Docteur Olive", "DO");
const MRS_WHITE = new Card(CardType.SUSPECT, "MRS_WHITE", "Madame Blanche", "MB");
const MRS_PEACOCK = new Card(CardType.SUSPECT, "MRS_PEACOCK", "Madame Pervenche", "MP");
const MISS_SCARLETT = new Card(CardType.SUSPECT, "MISS_SCARLETT", "Mademoiselle Rose", "MR");
const PROFESSOR_PLUM = new Card(CardType.SUSPECT, "PROFESSOR_PLUM", "Professeur Violet", "PV");

const WRENCH = new Card(CardType.WEAPON, "WRENCH", "Clef anglaise", "CA");
const CHANDELIER = new Card(CardType.WEAPON, "CHANDELIER", "Chandelier", "CH");
const ROPE = new Card(CardType.WEAPON, "ROPE", "Corde", "CO");
const LEAD_PIPE = new Card(CardType.WEAPON, "LEAD_PIPE", "Matraque", "MA");
const KNIFE = new Card(CardType.WEAPON, "KNIFE", "Poignard", "PO");
const REVOLVER = new Card(CardType.WEAPON, "REVOLVER", "Revolver", "RE");

const LIBRARY = new Card(CardType.ROOM, "LIBRARY", "Bibliothèque", "BI");
const STUDY = new Card(CardType.ROOM, "STUDY", "Bureau", "BU");
const KITCHEN = new Card(CardType.ROOM, "KITCHEN", "Cuisine", "CU");
const LOUNGE = new Card(CardType.ROOM, "LOUNGE", "Grand salon", "GS");
const HALL = new Card(CardType.ROOM, "HALL", "Hall", "HA");
const DRAWING_ROOM = new Card(CardType.ROOM, "DRAWING_ROOM", "Petit salon", "PS");
const DINING_ROOM = new Card(CardType.ROOM, "DINING_ROOM", "Salle à manger", "SM");
const BILLIARD_ROOM = new Card(CardType.ROOM, "BILLIARD_ROOM", "Salle de billard", "SB");
const CONSERVATORY = new Card(CardType.ROOM, "CONSERVATORY", "Véranda", "VE");

// Create the array of all cards
const _allCards = [
    COLONEL_MUSTARD, REVEREND_GREEN, MRS_WHITE, MRS_PEACOCK, MISS_SCARLETT, PROFESSOR_PLUM,
    WRENCH, CHANDELIER, ROPE, LEAD_PIPE, KNIFE, REVOLVER,
    LIBRARY, STUDY, KITCHEN, LOUNGE, HALL, DRAWING_ROOM, DINING_ROOM, BILLIARD_ROOM, CONSERVATORY
];

export class Deck {
    // Export cards as static properties for backwards compatibility
    static COLONEL_MUSTARD = COLONEL_MUSTARD;
    static REVEREND_GREEN = REVEREND_GREEN;
    static MRS_WHITE = MRS_WHITE;
    static MRS_PEACOCK = MRS_PEACOCK;
    static MISS_SCARLETT = MISS_SCARLETT;
    static PROFESSOR_PLUM = PROFESSOR_PLUM;

    static WRENCH = WRENCH;
    static CHANDELIER = CHANDELIER;
    static ROPE = ROPE;
    static LEAD_PIPE = LEAD_PIPE;
    static KNIFE = KNIFE;
    static REVOLVER = REVOLVER;

    static LIBRARY = LIBRARY;
    static STUDY = STUDY;
    static KITCHEN = KITCHEN;
    static LOUNGE = LOUNGE;
    static HALL = HALL;
    static DRAWING_ROOM = DRAWING_ROOM;
    static DINING_ROOM = DINING_ROOM;
    static BILLIARD_ROOM = BILLIARD_ROOM;
    static CONSERVATORY = CONSERVATORY;

    static allCards() {
        return [..._allCards];
    }

    static allCardsOfType(type) {
        return _allCards.filter(card => card.type === type);
    }

    static getRandomCardOfType(type) {
        const pool = Deck.allCardsOfType(type);
        return pool[CluedoRandom.getInstance().nextInt(pool.length)];
    }
}

