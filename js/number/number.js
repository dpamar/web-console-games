/**
 * Number - Convert numbers to English words
 * Ported from BSD games number.c
 */

const MAXNUM = 65;

const name1 = [
    "",         "one",      "two",      "three",
    "four",     "five",     "six",      "seven",
    "eight",    "nine",     "ten",      "eleven",
    "twelve",   "thirteen", "fourteen", "fifteen",
    "sixteen",  "seventeen","eighteen", "nineteen",
];

const name2 = [
    "",         "ten",      "twenty",   "thirty",
    "forty",    "fifty",    "sixty",    "seventy",
    "eighty",   "ninety",
];

const name3 = [
    "hundred",      "thousand",         "million",          "billion",
    "trillion",     "quadrillion",      "quintillion",      "sextillion",
    "septillion",   "octillion",        "nonillion",        "decillion",
    "undecillion",  "duodecillion",     "tredecillion",     "quattuordecillion",
    "quindecillion","sexdecillion",     "septendecillion",  "octodecillion",
    "novemdecillion","vigintillion",
];

function pfract(len) {
    const pref = [ "", "ten-", "hundred-" ];

    switch(len) {
        case 1:
            return "tenths.\n";
        case 2:
            return "hundredths.\n";
        default:
            return `${pref[len % 3]}${name3[Math.floor(len / 3)]}ths.\n`;
    }
}

function number(p, len) {
    let rval = 0;
    let result = "";

    switch (len) {
        case 3:
            if (p[0] !== '0') {
                rval = 1;
                result += `${name1[p.charCodeAt(0) - 48]} hundred`;
            }
            p = p.substring(1);
            // FALLTHROUGH
        case 2:
            const val = (p.charCodeAt(1) - 48) + (p.charCodeAt(0) - 48) * 10;
            if (val) {
                if (rval)
                    result += " ";
                if (val < 20)
                    result += name1[val];
                else {
                    result += name2[Math.floor(val / 10)];
                    if (val % 10)
                        result += `-${name1[val % 10]}`;
                }
                rval = 1;
            }
            break;
        case 1:
            if (p[0] !== '0') {
                rval = 1;
                result += name1[p.charCodeAt(0) - 48];
            }
    }
    return { rval, result };
}

function unit(len, p, lflag) {
    let rval = 0;
    let output = "";

    if (len > 3) {
        if (len % 3) {
            let off = len % 3;
            len -= off;
            const res = number(p, off);
            if (res.rval) {
                rval = 1;
                output += ` ${res.result} ${name3[Math.floor(len / 3)]}${lflag ? " " : ".\n"}`;
            }
            p = p.substring(off);
        }
        while (len > 3) {
            len -= 3;
            const res = number(p, 3);
            if (res.rval) {
                rval = 1;
                output += ` ${res.result} ${name3[Math.floor(len / 3)]}${lflag ? " " : ".\n"}`;
            }
            p = p.substring(3);
        }
    }
    const res = number(p, len);
    if (res.rval) {
        if (!lflag)
            output += ".\n";
        output = res.result + output;
        rval = 1;
    }
    return { rval, result: output };
}

export function convert(line, lflag = false) {
    let flen = 0;
    let fraction = null;
    let output = "";

    // Parse input
    line = line.trim();

    // Check for decimal point
    const dotIndex = line.indexOf('.');
    if (dotIndex !== -1) {
        fraction = line.substring(dotIndex + 1);
        line = line.substring(0, dotIndex);
        flen = fraction.length;
    }

    // Validate
    if (!line.match(/^-?\d+$/)) {
        throw new Error(`illegal number: ${line}`);
    }

    const len = line.replace('-', '').length;

    if (len > MAXNUM || (fraction !== null && flen > MAXNUM)) {
        throw new Error(`number too large, max ${MAXNUM} digits.`);
    }

    // Handle negative
    if (line[0] === '-') {
        output += `minus${lflag ? " " : "\n"}`;
        line = line.substring(1);
    }

    const res = len > 0 ? unit(len, line, lflag) : { rval: 0, result: "" };
    let rval = res.rval;
    output += res.result;

    if (fraction !== null && flen !== 0) {
        for (let i = 0; i < fraction.length; i++) {
            if (fraction[i] !== '0') {
                if (rval)
                    output += `${lflag ? " " : ""}and${lflag ? " " : "\n"}`;
                const fres = unit(flen, fraction, lflag);
                if (fres.rval) {
                    output += fres.result;
                    if (lflag)
                        output += " ";
                    output += pfract(flen);
                    rval = 1;
                }
                break;
            }
        }
    }

    if (!rval)
        output += `zero${lflag ? "" : ".\n"}`;
    if (lflag)
        output += "\n";

    return output;
}
