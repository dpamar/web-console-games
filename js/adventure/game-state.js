/**
 * Game state - all global variables from hdr.h and extern.h
 * Faithful port of C structures to JavaScript
 */

export class GameState {
    constructor() {
        // Location variables
        this.loc = 0;           // current location
        this.newloc = 0;        // new location
        this.oldloc = 0;        // old location
        this.oldlc2 = 0;        // old-old location

        // Input words
        this.wd1 = '';          // word 1
        this.wd2 = '';          // word 2

        // Command parsing
        this.verb = 0;          // verb number
        this.obj = 0;           // object number
        this.spk = 0;           // message to speak
        this.k = 0;             // general purpose
        this.k2 = 0;            // general purpose
        this.kq = 0;            // general purpose

        // Flags
        this.wzdark = false;    // was it dark?
        this.gaveup = false;    // gave up?
        this.blklin = true;     // blank line before output?
        this.demo = false;      // demo mode?

        // Data structures
        this.rtext = [];        // random text messages (RTXSIZ=205)
        this.mtext = [];        // magic messages (MAGSIZ=35)
        this.ptext = [];        // object descriptions (101)
        this.ltext = [];        // long location descriptions (LOCSIZ=141)
        this.stext = [];        // short location descriptions (LOCSIZ=141)
        this.ctext = [];        // class messages (CLSMAX=12)
        this.cval = [];         // class values (CLSMAX=12)
        this.clsses = 0;        // number of classes

        // Travel table
        this.travel = [];       // travel[location] = array of {conditions, tloc, tverb}

        // Hash table for vocabulary (HTSIZE=512)
        this.voc = new Array(512);
        for (let i = 0; i < 512; i++) {
            this.voc[i] = { val: 0, atab: '' };
        }

        // Object locations and properties
        this.plac = new Array(101).fill(0);     // initial object placement
        this.fixd = new Array(101).fill(0);     // fixed location data
        this.fixed = new Array(101).fill(0);    // is object fixed?
        this.place = new Array(101).fill(0);    // current object placement
        this.prop = new Array(101).fill(0);     // object properties
        this.links = new Array(201).fill(0);    // object link list
        this.atloc = new Array(141).fill(0);    // head of object list at location

        // Action defaults
        this.actspk = new Array(35).fill(0);    // default message for verb

        // Conditions
        this.cond = new Array(141).fill(0);     // condition bits for location
        this.setbit = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

        // Hints
        this.hntmax = 0;
        this.hints = [];        // hints[20][5]
        for (let i = 0; i < 20; i++) {
            this.hints[i] = [0, 0, 0, 0, 0];
        }
        this.hinted = new Array(20).fill(false);
        this.hintlc = new Array(20).fill(0);

        // Abbreviation
        this.abb = new Array(141).fill(0);
        this.abbnum = 5;

        // Treasures
        this.maxtrs = 0;
        this.tally = 0;
        this.tally2 = 0;

        // Object mnemonics (set during init)
        this.keys = 0;
        this.lamp = 0;
        this.grate = 0;
        this.cage = 0;
        this.rod = 0;
        this.rod2 = 0;
        this.steps = 0;
        this.bird = 0;
        this.door = 0;
        this.pillow = 0;
        this.snake = 0;
        this.fissur = 0;
        this.tablet = 0;
        this.clam = 0;
        this.oyster = 0;
        this.magzin = 0;
        this.dwarf = 0;
        this.knife = 0;
        this.food = 0;
        this.bottle = 0;
        this.water = 0;
        this.oil = 0;
        this.plant = 0;
        this.plant2 = 0;
        this.axe = 0;
        this.mirror = 0;
        this.dragon = 0;
        this.chasm = 0;
        this.troll = 0;
        this.troll2 = 0;
        this.bear = 0;
        this.messag = 0;
        this.vend = 0;
        this.batter = 0;
        this.nugget = 0;
        this.coins = 0;
        this.chest = 0;
        this.eggs = 0;
        this.tridnt = 0;
        this.vase = 0;
        this.emrald = 0;
        this.pyram = 0;
        this.pearl = 0;
        this.rug = 0;
        this.chain = 0;
        this.spices = 0;

        // Special words
        this.back = 0;
        this.look = 0;
        this.cave = 0;
        this.null = 0;
        this.entrnc = 0;
        this.dprssn = 0;
        this.enter = 0;
        this.stream = 0;

        // Verbs
        this.pour = 0;
        this.say = 0;
        this.lock = 0;
        this.throw = 0;
        this.find = 0;
        this.invent = 0;

        // Dwarf stuff
        this.chloc = 0;
        this.chloc2 = 0;
        this.dseen = new Array(7).fill(false);
        this.dloc = new Array(7).fill(0);
        this.odloc = new Array(7).fill(0);
        this.dflag = 0;
        this.daltlc = 0;

        // Combat
        this.tk = new Array(21).fill(0);
        this.stick = 0;
        this.dtotal = 0;
        this.attack = 0;

        // Counters and flags
        this.turns = 0;
        this.lmwarn = false;
        this.iwest = 0;
        this.knfloc = 0;
        this.detail = 0;
        this.maxdie = 0;
        this.numdie = 0;
        this.holdng = 0;
        this.dkill = 0;
        this.foobar = 0;
        this.bonus = 0;
        this.clock1 = 0;
        this.clock2 = 0;
        this.saved = 0;
        this.closng = false;
        this.panic = false;
        this.closed = false;
        this.scorng = false;

        // Game limits
        this.limit = 0;

        // Save game info
        this.saveday = 0;
        this.savet = 0;
        this.mxscor = 0;
        this.latncy = 0;
    }
}
