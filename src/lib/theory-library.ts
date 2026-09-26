/**
 * Extended structure library. Merged into CHORDS / SCALES / ARPEGGIO_VARIANTS
 * by theory.ts. Only type imports here to avoid circular runtime imports.
 *
 * This list is a convenience, not a limit: any interval set can be built in the
 * lab and is analysed by `identify`, which falls back to a custom formula name.
 */
import type { ArpeggioVariant, ChordDef, Degree, ScaleDef } from "./theory";

type S = ScaleDef;
type C = ChordDef;

/* ------------------------------------------------------------------ scales */

export const EXTRA_SCALES: S[] = [
  // Melodic minor modes (1, 4 and 7 already exist as melodic-minor, lydian-dominant, altered)
  { id: "dorian-b2", name: "Dorian b2", aliases: ["Phrygian ♮6", "Javanese"], degrees: ["1", "b2", "b3", "4", "5", "6", "b7"], family: "Melodic minor modes", characteristic: "b2 with a natural 6.", theory: "Mode 2 of melodic minor. Used over sus(b9) chords.", modeOf: { family: "melodic-minor", index: 1 } },
  { id: "lydian-augmented", name: "Lydian augmented", degrees: ["1", "2", "3", "#4", "#5", "6", "7"], family: "Melodic minor modes", characteristic: "#4 and #5 together.", theory: "Mode 3 of melodic minor. The standard scale for maj7#5.", modeOf: { family: "melodic-minor", index: 2 } },
  { id: "mixolydian-b6", name: "Mixolydian b6", aliases: ["Aeolian dominant", "Hindu"], degrees: ["1", "2", "3", "4", "5", "b6", "b7"], family: "Melodic minor modes", characteristic: "Major 3rd with b6 and b7.", theory: "Mode 5 of melodic minor. Dominant sound with a minor-key b13.", modeOf: { family: "melodic-minor", index: 4 } },
  { id: "locrian-nat2", name: "Locrian ♮2", aliases: ["Half-diminished scale", "Aeolian b5"], degrees: ["1", "2", "b3", "4", "b5", "b6", "b7"], family: "Melodic minor modes", characteristic: "Locrian with a natural 9.", theory: "Mode 6 of melodic minor. The usual choice for m7b5 because the 9 is not an avoid note.", modeOf: { family: "melodic-minor", index: 5 } },

  // Harmonic minor modes (1 and 5 already exist)
  { id: "locrian-nat6", name: "Locrian ♮6", degrees: ["1", "b2", "b3", "4", "b5", "6", "b7"], family: "Harmonic minor modes", characteristic: "Locrian with a major 6.", theory: "Mode 2 of harmonic minor; the ii chord of a minor ii–V.", modeOf: { family: "harmonic-minor", index: 1 } },
  { id: "ionian-s5", name: "Ionian #5", aliases: ["Augmented major"], degrees: ["1", "2", "3", "4", "#5", "6", "7"], family: "Harmonic minor modes", characteristic: "Major scale with #5.", theory: "Mode 3 of harmonic minor. Fits maj7#5 with a natural 4.", modeOf: { family: "harmonic-minor", index: 2 } },
  { id: "dorian-s4", name: "Dorian #4", aliases: ["Ukrainian dorian", "Romanian minor"], degrees: ["1", "2", "b3", "#4", "5", "6", "b7"], family: "Harmonic minor modes", characteristic: "Dorian with a raised 4th.", theory: "Mode 4 of harmonic minor. An augmented 2nd between b3 and #4.", modeOf: { family: "harmonic-minor", index: 3 } },
  { id: "lydian-s2", name: "Lydian #2", degrees: ["1", "#2", "3", "#4", "5", "6", "7"], family: "Harmonic minor modes", characteristic: "#2 and #4 around a major 3rd.", theory: "Mode 6 of harmonic minor. Bright major sound with an augmented 2nd.", modeOf: { family: "harmonic-minor", index: 5 } },
  { id: "ultralocrian", name: "Ultralocrian", aliases: ["Altered bb7", "Super Locrian bb7"], degrees: ["1", "b2", "b3", "b4", "b5", "b6", "bb7"], family: "Harmonic minor modes", characteristic: "b4 (enharmonic 3) and bb7 (enharmonic 6).", theory: "Mode 7 of harmonic minor. Fits the diminished 7th chord built on the leading tone.", modeOf: { family: "harmonic-minor", index: 6 } },

  // Harmonic major modes (1 already exists)
  { id: "dorian-b5", name: "Dorian b5", degrees: ["1", "2", "b3", "4", "b5", "6", "b7"], family: "Harmonic major modes", characteristic: "Dorian with a flat 5.", theory: "Mode 2 of harmonic major; a m7b5 sound with a major 6.", modeOf: { family: "harmonic-major", index: 1 } },
  { id: "phrygian-b4", name: "Phrygian b4", degrees: ["1", "b2", "b3", "b4", "5", "b6", "b7"], family: "Harmonic major modes", characteristic: "b4 (enharmonic major 3) beside the b3.", theory: "Mode 3 of harmonic major.", modeOf: { family: "harmonic-major", index: 2 } },
  { id: "lydian-b3", name: "Lydian b3", aliases: ["Melodic minor #4"], degrees: ["1", "2", "b3", "#4", "5", "6", "7"], family: "Harmonic major modes", characteristic: "Minor 3rd with #4 and natural 7.", theory: "Mode 4 of harmonic major. A mMaj7 sound with a raised 11.", modeOf: { family: "harmonic-major", index: 3 } },
  { id: "mixolydian-b2", name: "Mixolydian b2", degrees: ["1", "b2", "3", "4", "5", "6", "b7"], family: "Harmonic major modes", characteristic: "Dominant with b9 but natural 13.", theory: "Mode 5 of harmonic major; fits 7b9 with a natural 13.", modeOf: { family: "harmonic-major", index: 4 } },
  { id: "lydian-aug-s2", name: "Lydian augmented #2", degrees: ["1", "#2", "3", "#4", "#5", "6", "7"], family: "Harmonic major modes", characteristic: "#2, #4 and #5.", theory: "Mode 6 of harmonic major.", modeOf: { family: "harmonic-major", index: 5 } },
  { id: "locrian-bb7", name: "Locrian bb7", degrees: ["1", "b2", "b3", "4", "b5", "b6", "bb7"], family: "Harmonic major modes", characteristic: "Locrian with a diminished 7th.", theory: "Mode 7 of harmonic major; fits a fully diminished 7th chord.", modeOf: { family: "harmonic-major", index: 6 } },

  // Other heptatonic
  { id: "neapolitan-minor", name: "Neapolitan minor", degrees: ["1", "b2", "b3", "4", "5", "b6", "7"], family: "Exotic", characteristic: "Harmonic minor with b2.", theory: "Harmonic minor with a lowered 2nd, the note of the Neapolitan chord." },
  { id: "neapolitan-major", name: "Neapolitan major", degrees: ["1", "b2", "b3", "4", "5", "6", "7"], family: "Exotic", characteristic: "Melodic minor with b2.", theory: "Melodic minor with a lowered 2nd." },
  { id: "hungarian-major", name: "Hungarian major", degrees: ["1", "#2", "3", "#4", "5", "6", "b7"], family: "Exotic", characteristic: "#2 and #4 on a dominant.", theory: "A dominant 7th scale with an augmented 2nd and raised 4th." },
  { id: "enigmatic", name: "Enigmatic", degrees: ["1", "b2", "3", "#4", "#5", "#6", "7"], family: "Exotic", characteristic: "Whole-tone run from 3 to #6.", theory: "Verdi's scala enigmatica; mostly whole tones above a b2." },
  { id: "persian", name: "Persian", degrees: ["1", "b2", "3", "4", "b5", "b6", "7"], family: "Exotic", characteristic: "b2, b5 and b6 around a major 3rd.", theory: "Double harmonic with a lowered 5th." },
  { id: "major-locrian", name: "Major Locrian", aliases: ["Arabian"], degrees: ["1", "2", "3", "4", "b5", "b6", "b7"], family: "Exotic", characteristic: "Major 3rd with b5 and b6.", theory: "Lower half major, upper half whole-tone; fits 7b5 / 7b13." },
  { id: "gypsy-minor", name: "Hungarian gypsy", degrees: ["1", "2", "b3", "#4", "5", "b6", "b7"], family: "Exotic", characteristic: "Natural minor with #4.", theory: "Aeolian with a raised 4th." },

  // Pentatonic / hexatonic
  { id: "dominant-pentatonic", name: "Dominant pentatonic", degrees: ["1", "2", "3", "5", "b7"], family: "Pentatonic / Blues", characteristic: "Major pentatonic with b7 instead of 6.", theory: "Outlines a 9th chord; fits dominant chords." },
  { id: "minor6-pentatonic", name: "Minor 6 pentatonic", degrees: ["1", "b3", "4", "5", "6"], family: "Pentatonic / Blues", characteristic: "Minor pentatonic with 6 instead of b7.", theory: "Dorian-flavoured pentatonic." },
  { id: "egyptian", name: "Suspended pentatonic", aliases: ["Egyptian"], degrees: ["1", "2", "4", "5", "b7"], family: "Pentatonic / Blues", characteristic: "No third.", theory: "Mode 2 of major pentatonic. Fits sus chords." },
  { id: "blues-minor-pent", name: "Blues minor pentatonic", aliases: ["Man Gong"], degrees: ["1", "b3", "4", "b6", "b7"], family: "Pentatonic / Blues", characteristic: "Minor pentatonic with b6 instead of 5.", theory: "Mode 3 of major pentatonic." },
  { id: "lydian-pentatonic", name: "Lydian pentatonic", degrees: ["1", "3", "#4", "5", "7"], family: "Pentatonic / Blues", characteristic: "Major triad plus #4 and 7.", theory: "A maj7#11 pentatonic." },
  { id: "hirajoshi", name: "Hirajoshi", degrees: ["1", "2", "b3", "5", "b6"], family: "World", characteristic: "Two half steps in a pentatonic.", theory: "Japanese pentatonic from the koto tradition." },
  { id: "iwato", name: "Iwato", degrees: ["1", "b2", "4", "b5", "b7"], family: "World", characteristic: "b2 and b5 with no third or fifth.", theory: "Japanese pentatonic; very dark and unstable." },
  { id: "kumoi", name: "Kumoi", degrees: ["1", "2", "b3", "5", "6"], family: "World", characteristic: "Minor 3rd with major 6.", theory: "Japanese pentatonic, a subset of Dorian." },
  { id: "pelog", name: "Pelog (approx.)", degrees: ["1", "b2", "b3", "5", "b6"], family: "World", characteristic: "Semitone clusters at both ends.", theory: "12-TET approximation of the Balinese/Javanese pelog selisir." },
  { id: "prometheus", name: "Prometheus", degrees: ["1", "2", "3", "#4", "6", "b7"], family: "Symmetric", characteristic: "Built from the mystic chord.", theory: "Scriabin's hexatonic; a subset of the whole tone and Lydian dominant." },
  { id: "tritone-scale", name: "Tritone scale", degrees: ["1", "b2", "3", "b5", "5", "b7"], family: "Symmetric", characteristic: "Two major triads a tritone apart.", theory: "Combines C and Gb triads; symmetric at the tritone." },

  // Bebop
  { id: "bebop-dominant", name: "Bebop dominant", degrees: ["1", "2", "3", "4", "5", "6", "b7", "7"], family: "Bebop", characteristic: "Mixolydian plus passing natural 7.", theory: "The passing tone keeps chord tones on the beats when you run it in 8ths." },
  { id: "bebop-major", name: "Bebop major", degrees: ["1", "2", "3", "4", "5", "#5", "6", "7"], family: "Bebop", characteristic: "Major plus passing #5.", theory: "Major scale with a chromatic passing tone between 5 and 6." },
  { id: "bebop-dorian", name: "Bebop dorian", degrees: ["1", "2", "b3", "3", "4", "5", "6", "b7"], family: "Bebop", characteristic: "Dorian plus passing major 3rd.", theory: "Dorian with a chromatic passing tone between b3 and 4." },
  { id: "bebop-melodic-minor", name: "Bebop melodic minor", degrees: ["1", "2", "b3", "4", "5", "#5", "6", "7"], family: "Bebop", characteristic: "Melodic minor plus passing #5.", theory: "Melodic minor with a passing tone between 5 and 6." },

  // Symmetric / octatonic+
  { id: "spanish-8", name: "Spanish 8-tone", degrees: ["1", "b2", "#2", "3", "4", "b5", "b6", "b7"], family: "World", characteristic: "Both b3 (as #2) and 3.", theory: "Phrygian dominant with added minor 3rd and b5, common in flamenco." },
  { id: "messiaen-3", name: "Messiaen mode 3", degrees: ["1", "2", "b3", "3", "#4", "5", "#5", "6", "7"], family: "Symmetric", characteristic: "Repeats every major 3rd.", theory: "Nine-note mode of limited transposition (only four transpositions)." },
  { id: "messiaen-4", name: "Messiaen mode 4", degrees: ["1", "b2", "2", "4", "#4", "5", "b6", "7"], family: "Symmetric", characteristic: "Repeats every tritone.", theory: "Eight-note mode of limited transposition." },
  // Hexatonic / additional
  { id: "major-hexatonic", name: "Major hexatonic", degrees: ["1", "2", "3", "4", "5", "6"], family: "Pentatonic / Blues", characteristic: "Major scale without the 7th.", theory: "Six-note subset shared by Ionian and Mixolydian." },
  { id: "minor-hexatonic", name: "Minor hexatonic", degrees: ["1", "2", "b3", "4", "5", "b7"], family: "Pentatonic / Blues", characteristic: "Minor scale without the 6th.", theory: "Six-note subset shared by Dorian and Aeolian." },
  { id: "oriental", name: "Oriental", degrees: ["1", "b2", "3", "4", "b5", "6", "b7"], family: "Exotic", characteristic: "b2 and b5 with a major 3rd and 6.", theory: "Two augmented 2nds; related to the double harmonic with b5 and b7." },
  { id: "leading-whole-tone", name: "Leading whole tone", degrees: ["1", "2", "3", "#4", "#5", "#6", "7"], family: "Symmetric", characteristic: "Whole-tone scale plus a leading tone.", theory: "Six whole steps then a half step back to the root." },
  { id: "six-tone-symmetric", name: "Six-tone symmetrical", degrees: ["1", "b2", "3", "4", "#5", "6"], family: "Symmetric", characteristic: "Alternating half and minor-3rd steps.", theory: "Union of two augmented triads a half step apart; repeats every major 3rd." },
];

/* ------------------------------------------------------------------ chords */

const ch = (
  id: string,
  name: string,
  suffix: string,
  degrees: Degree[],
  family: C["family"],
  theory: string,
  scales?: string[],
): C => (scales ? { id, name, suffix, degrees, family, theory, scales } : { id, name, suffix, degrees, family, theory });

export const EXTRA_CHORDS: C[] = [
  // Triads & power
  ch("majb5", "Major flat five", "(b5)", ["1", "3", "b5"], "Triads", "Major 3rd with a diminished 5th; the top of a 7b5.", ["lydian-dominant", "whole-tone"]),
  ch("5add9", "Power chord add 9", "5(add9)", ["1", "5", "9"], "Triads", "Root, 5th and 9th with no third. Quality stays open.", ["ionian", "aeolian"]),
  ch("octave", "Root and octave", "(no3 no5)", ["1"], "Triads", "Single pitch class; useful as a starting point for custom building."),

  // Sixths
  ch("m69", "Minor 6/9", "m6/9", ["1", "b3", "5", "6", "9"], "Sixths", "Minor triad with 6 and 9; the Dorian tonic chord.", ["dorian", "melodic-minor"]),
  ch("6sus4", "6 sus4", "6sus4", ["1", "4", "5", "6"], "Sixths", "Suspended 4th with a major 6th.", ["ionian", "mixolydian"]),

  // Sevenths
  ch("maj7b5", "Major 7 flat five", "maj7(b5)", ["1", "3", "b5", "7"], "Sevenths", "maj7 with a lowered 5th — enharmonically a maj7#11 without the 5.", ["lydian"]),
  ch("dimmaj7", "Diminished major 7", "dim(maj7)", ["1", "b3", "b5", "7"], "Diminished & augmented", "Diminished triad with a major 7th.", ["dim-whole-half"]),
  ch("maj7sus4", "Major 7 sus4", "maj7sus4", ["1", "4", "5", "7"], "Suspended & quartal", "Suspended 4th with a major 7th.", ["ionian"]),
  ch("7sus2", "7 sus2", "7sus2", ["1", "2", "5", "b7"], "Suspended & quartal", "Dominant with the 3rd replaced by the 2nd.", ["mixolydian"]),
  ch("m7s5", "Minor 7 sharp five", "m7(#5)", ["1", "b3", "#5", "b7"], "Sevenths", "Minor 7 with an augmented 5th (enharmonic to a b6).", ["aeolian"]),
  ch("7no5", "Dominant 7 (no 5)", "7(no5)", ["1", "3", "b7"], "Shell & rootless", "Shell voicing 1-3-b7: the smallest dominant.", ["mixolydian"]),
  ch("maj7no5", "Major 7 (no 5)", "maj7(no5)", ["1", "3", "7"], "Shell & rootless", "Shell voicing 1-3-7.", ["ionian", "lydian"]),
  ch("m7no5", "Minor 7 (no 5)", "m7(no5)", ["1", "b3", "b7"], "Shell & rootless", "Shell voicing 1-b3-b7.", ["dorian", "aeolian"]),
  ch("6no5", "6 (no 5)", "6(no5)", ["1", "3", "6"], "Shell & rootless", "Shell voicing 1-3-6.", ["ionian"]),
  ch("mmaj7no5", "Minor-major 7 (no 5)", "m(maj7)(no5)", ["1", "b3", "7"], "Shell & rootless", "Shell voicing 1-b3-7.", ["melodic-minor", "harmonic-minor"]),
  ch("dim7no5", "Diminished 7 shell", "°7(no5)", ["1", "b3", "bb7"], "Shell & rootless", "Shell 1-b3-bb7.", ["dim-whole-half"]),

  // Extensions
  ch("maj11", "Major 11", "maj11", ["1", "3", "5", "7", "9", "11"], "Extensions", "Full stack to the 11th; the natural 11 clashes with the 3rd, so it is often raised.", ["ionian"]),
  ch("maj13", "Major 13", "maj13", ["1", "3", "5", "7", "9", "13"], "Extensions", "maj9 with a 13th (11 omitted as the avoid note).", ["ionian", "lydian"]),
  ch("maj13s11", "Major 13 #11", "maj13(#11)", ["1", "3", "5", "7", "9", "#11", "13"], "Extensions", "The full Lydian stack.", ["lydian"]),
  ch("maj9s11", "Major 9 #11", "maj9(#11)", ["1", "3", "5", "7", "9", "#11"], "Extensions", "Lydian colour on a maj9.", ["lydian"]),
  ch("m13", "Minor 13", "m13", ["1", "b3", "5", "b7", "9", "11", "13"], "Extensions", "Dorian stack; the natural 13 marks it as Dorian.", ["dorian"]),
  ch("mmaj9", "Minor-major 9", "m(maj9)", ["1", "b3", "5", "7", "9"], "Extensions", "mMaj7 with a 9th.", ["melodic-minor", "harmonic-minor"]),
  ch("mmaj11", "Minor-major 11", "m(maj11)", ["1", "b3", "5", "7", "9", "11"], "Extensions", "Melodic-minor tonic stack.", ["melodic-minor"]),
  ch("m9b5", "Minor 9 flat five", "m9(b5)", ["1", "b3", "b5", "b7", "9"], "Extensions", "Half-diminished with natural 9.", ["locrian-nat2"]),
  ch("m11b5", "Minor 11 flat five", "m11(b5)", ["1", "b3", "b5", "b7", "9", "11"], "Extensions", "Half-diminished stack to the 11th.", ["locrian-nat2"]),
  ch("m7add11", "Minor 7 add 11", "m7(add11)", ["1", "b3", "5", "b7", "11"], "Extensions", "Minor 7 with an 11 and no 9.", ["dorian", "aeolian"]),
  ch("7add13", "Dominant 7 add 13", "7(13)", ["1", "3", "5", "b7", "13"], "Extensions", "Dominant with 13 and no 9.", ["mixolydian"]),
  ch("9sus4", "9 sus4", "9sus4", ["1", "4", "5", "b7", "9"], "Suspended & quartal", "Suspended dominant with a 9th; enharmonic to bVII/I.", ["mixolydian", "dorian"]),
  ch("13sus4", "13 sus4", "13sus4", ["1", "4", "5", "b7", "9", "13"], "Suspended & quartal", "Suspended dominant with 9 and 13.", ["mixolydian"]),
  ch("7susb9", "7 sus4 b9", "7sus4(b9)", ["1", "4", "5", "b7", "b9"], "Suspended & quartal", "The Phrygian sus chord.", ["dorian-b2", "phrygian"]),

  // Sus & add
  ch("madd11", "Minor add 11", "m(add11)", ["1", "b3", "5", "11"], "Sus & add", "Minor triad with an 11 and no 7.", ["aeolian", "dorian"]),
  ch("addS11", "Major add #11", "(add#11)", ["1", "3", "5", "#11"], "Sus & add", "Major triad with a Lydian #11.", ["lydian"]),
  ch("add13", "Major add 13", "(add13)", ["1", "3", "5", "13"], "Sus & add", "Same pitch classes as a 6 chord; spelled as a 13 when voiced above the octave."),
  ch("add9no3", "Add 9 (no 3)", "sus2(add4)", ["1", "2", "4", "5"], "Sus & add", "Both suspensions together; no third.", ["ionian", "mixolydian"]),
  ch("maj7add13", "Major 7 add 13", "maj7(add13)", ["1", "3", "5", "7", "13"], "Sus & add", "maj7 with a 13 and no 9.", ["ionian"]),

  // Altered dominant combinations
  ch("7b9b13", "7 b9 b13", "7(b9,b13)", ["1", "3", "5", "b7", "b9", "b13"], "Altered dominants", "Phrygian-dominant colour; resolves to a minor tonic.", ["phrygian-dominant", "altered"]),
  ch("7s9b13", "7 #9 b13", "7(#9,b13)", ["1", "3", "b7", "#9", "b13"], "Altered dominants", "Typical altered voicing (5 omitted).", ["altered"]),
  ch("7b9s11", "7 b9 #11", "7(b9,#11)", ["1", "3", "5", "b7", "b9", "#11"], "Altered dominants", "Half-whole diminished colour.", ["dim-half-whole"]),
  ch("7s9s11", "7 #9 #11", "7(#9,#11)", ["1", "3", "5", "b7", "#9", "#11"], "Altered dominants", "Half-whole diminished colour.", ["dim-half-whole"]),
  ch("7b9s9", "7 b9 #9", "7(b9,#9)", ["1", "3", "5", "b7", "b9", "#9"], "Altered dominants", "Both altered 9ths.", ["dim-half-whole", "altered"]),
  ch("7s5s9", "7 #5 #9", "7(#5,#9)", ["1", "3", "#5", "b7", "#9"], "Altered dominants", "Augmented dominant with #9.", ["altered"]),
  ch("7s5b9", "7 #5 b9", "7(#5,b9)", ["1", "3", "#5", "b7", "b9"], "Altered dominants", "Augmented dominant with b9.", ["altered", "phrygian-dominant"]),
  ch("7b5b9", "7 b5 b9", "7(b5,b9)", ["1", "3", "b5", "b7", "b9"], "Altered dominants", "Flat-five dominant with b9.", ["altered", "dim-half-whole"]),
  ch("7b5s9", "7 b5 #9", "7(b5,#9)", ["1", "3", "b5", "b7", "#9"], "Altered dominants", "Flat-five dominant with #9.", ["altered"]),
  ch("9s11", "9 #11", "9(#11)", ["1", "3", "5", "b7", "9", "#11"], "Altered dominants", "Lydian dominant stack.", ["lydian-dominant"]),
  ch("9s5", "9 #5", "9(#5)", ["1", "3", "#5", "b7", "9"], "Altered dominants", "Whole-tone dominant.", ["whole-tone"]),
  ch("9b5", "9 b5", "9(b5)", ["1", "3", "b5", "b7", "9"], "Altered dominants", "Whole-tone dominant.", ["whole-tone", "lydian-dominant"]),
  ch("13b9", "13 b9", "13(b9)", ["1", "3", "5", "b7", "b9", "13"], "Altered dominants", "Half-whole diminished dominant.", ["dim-half-whole", "mixolydian-b2"]),
  ch("13s9", "13 #9", "13(#9)", ["1", "3", "5", "b7", "#9", "13"], "Altered dominants", "Half-whole diminished dominant.", ["dim-half-whole"]),
  ch("13s11", "13 #11", "13(#11)", ["1", "3", "5", "b7", "9", "#11", "13"], "Altered dominants", "The full Lydian dominant stack.", ["lydian-dominant"]),
  ch("7b13no5", "7 b13 (no 5)", "7(b13)(no5)", ["1", "3", "b7", "b13"], "Altered dominants", "Dominant with b13 and the 5 omitted.", ["mixolydian-b6"]),

  // Diminished & augmented
  ch("augadd9", "Augmented add 9", "+(add9)", ["1", "3", "#5", "9"], "Diminished & augmented", "Augmented triad with 9.", ["whole-tone", "lydian-augmented"]),
  ch("augmaj9", "Augmented major 9", "maj9(#5)", ["1", "3", "#5", "7", "9"], "Diminished & augmented", "maj7#5 with 9.", ["lydian-augmented"]),
  ch("dim7add11", "Diminished 7 add 11", "°7(add11)", ["1", "b3", "b5", "bb7", "11"], "Diminished & augmented", "dim7 with natural 11 from the whole-half scale.", ["dim-whole-half"]),

  // Rootless
  ch("rl-maj9", "Maj9 rootless", "maj9 (rootless)", ["3", "5", "7", "9"], "Shell & rootless", "3-5-7-9: the root is left to the bass.", ["ionian", "lydian"]),
  ch("rl-m9", "m9 rootless", "m9 (rootless)", ["b3", "5", "b7", "9"], "Shell & rootless", "b3-5-b7-9: the root is left to the bass.", ["dorian", "aeolian"]),
  ch("rl-9", "9 rootless", "9 (rootless)", ["3", "5", "b7", "9"], "Shell & rootless", "3-5-b7-9: the root is left to the bass.", ["mixolydian"]),
  ch("rl-13a", "13 rootless (A form)", "13 (rootless A)", ["3", "13", "b7", "9"], "Shell & rootless", "3-13-b7-9, the classic left-hand A voicing.", ["mixolydian"]),
  ch("rl-13b", "13 rootless (B form)", "13 (rootless B)", ["b7", "9", "3", "13"], "Shell & rootless", "b7-9-3-13, the inverted B voicing.", ["mixolydian"]),
  ch("rl-7alt", "7alt rootless", "7alt (rootless)", ["3", "b7", "#9", "b13"], "Shell & rootless", "3-b7-#9-b13 — the typical altered voicing.", ["altered"]),
  ch("rl-m7b5", "m9b5 rootless", "m9(b5) (rootless)", ["b3", "b5", "b7", "9"], "Shell & rootless", "b3-b5-b7-9.", ["locrian-nat2"]),
  ch("guide-3-7", "Dominant guide tones", "7 (3 & b7 only)", ["3", "b7"], "Shell & rootless", "Just the tritone that defines a dominant.", ["mixolydian"]),

  // Upper structures & slash
  ch("ust-II", "UST II (D/C7)", "13(#11) UST II", ["1", "3", "b7", "9", "#11", "13"], "Upper structures & slash", "Major triad a whole step above the root over a dominant shell: 9-#11-13.", ["lydian-dominant"]),
  ch("ust-bVI", "UST bVI (Ab/C7)", "7(#9,b13) UST bVI", ["1", "3", "b7", "#9", "b13"], "Upper structures & slash", "Major triad on b6 over a dominant shell: b13-1-#9.", ["altered"]),
  ch("ust-bV", "UST bV (Gb/C7)", "7(b9,#11) UST bV", ["1", "3", "b7", "b9", "#11"], "Upper structures & slash", "Major triad a tritone above: #11-b7-b9.", ["dim-half-whole"]),
  ch("ust-VI", "UST VI (A/C7)", "13(b9) UST VI", ["1", "3", "b7", "b9", "13"], "Upper structures & slash", "Major triad on 6 over a dominant shell: 13-b9-3.", ["dim-half-whole"]),
  ch("ust-bIII", "UST bIII (Eb/C7)", "7(#9) UST bIII", ["1", "3", "b7", "#9", "5"], "Upper structures & slash", "Major triad on b3: #9-5-b7.", ["dim-half-whole"]),
  ch("slash-II", "II/I (D/C)", "II/I", ["1", "2", "#4", "6"], "Upper structures & slash", "Major triad a step above the bass: implies Lydian.", ["lydian"]),
  ch("slash-bVII", "bVII/I (Bb/C)", "bVII/I", ["1", "b7", "9", "4"], "Upper structures & slash", "Major triad a step below the bass: a 9sus4 without the 5.", ["mixolydian"]),
  ch("slash-bII", "bII/I (Db/C)", "bII/I", ["1", "b2", "4", "b6"], "Upper structures & slash", "Major triad a half step above: implies Phrygian.", ["phrygian"]),
  ch("slash-IV", "IV/I (F/C)", "IV/I", ["1", "4", "6"], "Upper structures & slash", "Subdominant triad over the tonic bass (1-4-6).", ["ionian"]),
  ch("slash-V", "V/I (G/C)", "V/I", ["1", "5", "7", "9"], "Upper structures & slash", "Dominant triad over the tonic: maj9 without the 3rd.", ["ionian", "lydian"]),
  ch("slash-bVI", "bVI/I (Ab/C)", "bVI/I", ["1", "b3", "b6"], "Upper structures & slash", "Enharmonically an Ab major triad in 1st inversion over C.", ["aeolian"]),

  // Quartal / quintal / clusters
  ch("quartal3", "Quartal triad", "(4ths ×3)", ["1", "4", "b7"], "Suspended & quartal", "Two stacked perfect 4ths.", ["dorian", "mixolydian"]),
  ch("quartal4", "Quartal 4-note", "(4ths ×4)", ["1", "4", "b7", "b10"], "Suspended & quartal", "Three stacked perfect 4ths (the top note is b3 an octave up).", ["dorian"]),
  ch("so-what", "So What voicing", "m11 (So What)", ["1", "4", "b7", "b10", "12"], "Suspended & quartal", "Three 4ths plus a major 3rd on top — a m11 sound.", ["dorian"]),
  ch("quintal3", "Quintal triad", "(5ths ×3)", ["1", "5", "9"], "Suspended & quartal", "Two stacked perfect 5ths."),
  ch("quintal4", "Quintal 4-note", "(5ths ×4)", ["1", "5", "9", "13"], "Suspended & quartal", "Three stacked 5ths: 1-5-9-13."),
  ch("mystic", "Mystic chord", "(mystic)", ["1", "#11", "b7", "10", "13", "9"], "Suspended & quartal", "Scriabin's chord of 4ths: augmented, diminished and perfect.", ["prometheus"]),
  ch("cl-chrom", "Chromatic cluster", "(cluster b2)", ["1", "b2", "2"], "Clusters", "Three adjacent semitones."),
  ch("cl-wt", "Whole-tone cluster", "(cluster 1-2-3)", ["1", "2", "3"], "Clusters", "Three adjacent whole tones."),
  ch("cl-min", "Minor cluster", "(cluster 1-2-b3)", ["1", "2", "b3"], "Clusters", "Whole step plus half step."),
  ch("cl-mixed", "Mixed cluster", "(cluster 1-b2-b3)", ["1", "b2", "b3"], "Clusters", "Half step plus whole step."),
  ch("cl-4", "Four-note cluster", "(cluster 1-2-3-4)", ["1", "2", "3", "4"], "Clusters", "Four adjacent scale steps."),
  // --- expansion 2 ---
  ch("69s11", "6/9 #11", "6/9(#11)", ["1", "3", "5", "6", "9", "#11"], "Sixths", "6/9 with a Lydian #11.", ["lydian"]),
  ch("m69maj7", "Minor 6/9 major 7", "m6/9(maj7)", ["1", "b3", "5", "6", "7", "9"], "Sixths", "Melodic-minor tonic with 6, 7 and 9.", ["melodic-minor"]),
  ch("6sus2", "6 sus2", "6sus2", ["1", "2", "5", "6"], "Sixths", "Suspended 2nd with a major 6th.", ["major-pentatonic", "ionian"]),
  ch("7add6", "7/6", "7/6", ["1", "3", "5", "6", "b7"], "Sixths", "Dominant with the 6 inside the octave; same pitch classes as 13(no9).", ["mixolydian"]),
  ch("6add11", "6 add 11", "6(add11)", ["1", "3", "5", "6", "11"], "Sixths", "Major 6 with a natural 11.", ["ionian"]),
  ch("m7b9", "Minor 7 b9", "m7(b9)", ["1", "b3", "5", "b7", "b9"], "Extensions", "Minor 7 with a minor 9th.", ["phrygian", "dorian-b2"]),
  ch("m7b5b9", "Minor 7 b5 b9", "m7(b5,b9)", ["1", "b3", "b5", "b7", "b9"], "Extensions", "Half-diminished with b9.", ["locrian"]),
  ch("m7b5add11", "Minor 7 b5 add 11", "m7(b5,add11)", ["1", "b3", "b5", "b7", "11"], "Extensions", "Half-diminished with 11 and no 9.", ["locrian", "locrian-nat2"]),
  ch("mmaj13", "Minor-major 13", "m(maj13)", ["1", "b3", "5", "7", "9", "13"], "Extensions", "mMaj9 with a 13th.", ["melodic-minor"]),
  ch("m13no11", "Minor 13 (no 11)", "m13(no11)", ["1", "b3", "5", "b7", "9", "13"], "Extensions", "Dorian 13 with the 11 omitted.", ["dorian"]),
  ch("11no3", "11 (no 3)", "11(no3)", ["1", "5", "b7", "9", "11"], "Extensions", "Dominant 11 with the 3rd omitted; same pitch classes as 9sus4.", ["mixolydian"]),
  ch("maj13no9", "Major 13 (no 9)", "maj7(13)", ["1", "3", "7", "13"], "Extensions", "maj7 shell plus 13.", ["ionian"]),
  ch("addb9", "Major add b9", "(addb9)", ["1", "3", "5", "b9"], "Sus & add", "Major triad with a minor 9th.", ["phrygian-dominant"]),
  ch("maddb6", "Minor add b6", "m(addb6)", ["1", "b3", "5", "b6"], "Sus & add", "Minor triad with b6.", ["aeolian", "harmonic-minor"]),
  ch("sus4add9", "sus4 add 9", "sus4(add9)", ["1", "4", "5", "9"], "Sus & add", "Suspended 4th with a 9th.", ["mixolydian", "ionian"]),
  ch("maj7sus2", "Major 7 sus2", "maj7sus2", ["1", "2", "5", "7"], "Suspended & quartal", "Suspended 2nd with a major 7th.", ["ionian", "lydian"]),
  ch("madd9add11", "Minor add 9 add 11", "m(add9,add11)", ["1", "b3", "5", "9", "11"], "Sus & add", "Minor triad with 9 and 11, no 7.", ["aeolian", "dorian"]),
  ch("13sus4b9", "13 sus4 b9", "13sus4(b9)", ["1", "4", "5", "b7", "b9", "13"], "Suspended & quartal", "Sus dominant with b9 and natural 13.", ["mixolydian-b2", "dorian-b2"]),
  ch("9b13", "9 b13", "9(b13)", ["1", "3", "5", "b7", "9", "b13"], "Altered dominants", "Dominant with natural 9 and b13.", ["mixolydian-b6"]),
  ch("13b9s11", "13 b9 #11", "13(b9,#11)", ["1", "3", "b7", "b9", "#11", "13"], "Altered dominants", "Half-whole diminished stack.", ["dim-half-whole"]),
  ch("7b9s11b13", "7 b9 #11 b13", "7(b9,#11,b13)", ["1", "3", "b7", "b9", "#11", "b13"], "Altered dominants", "Altered-scale tensions except #9.", ["altered"]),
  ch("7b9s9b13", "7 b9 #9 b13", "7(b9,#9,b13)", ["1", "3", "b7", "b9", "#9", "b13"], "Altered dominants", "Altered-scale tensions except #11.", ["altered"]),
  ch("7alt-full", "7alt (all tensions)", "7(b9,#9,#11,b13)", ["1", "3", "b7", "b9", "#9", "#11", "b13"], "Altered dominants", "Every tone of the altered scale.", ["altered"]),
  ch("7sus4s9", "7 sus4 #9", "7sus4(#9)", ["1", "4", "5", "b7", "#9"], "Altered dominants", "Suspended dominant with #9 (b3 above the octave).", ["dorian", "aeolian"]),
  ch("dim7add9", "Diminished 7 add 9", "°7(add9)", ["1", "b3", "b5", "bb7", "9"], "Diminished & augmented", "dim7 with the natural 9 from the whole-half scale.", ["dim-whole-half"]),
  ch("dim7addmaj7", "Diminished 7 add maj7", "°7(add maj7)", ["1", "b3", "b5", "bb7", "7"], "Diminished & augmented", "dim7 with a major 7th from the whole-half scale.", ["dim-whole-half"]),
  ch("augmaj7s11", "Augmented major 7 #11", "maj7(#5,#11)", ["1", "3", "#5", "7", "#11"], "Diminished & augmented", "Lydian augmented stack.", ["lydian-augmented"]),
  ch("dimadd9", "Diminished add 9", "°(add9)", ["1", "b3", "b5", "9"], "Diminished & augmented", "Diminished triad with 9.", ["locrian-nat2", "dim-whole-half"]),
  ch("shell-m6", "Minor 6 shell", "m6(no5)", ["1", "b3", "6"], "Shell & rootless", "Shell voicing 1-b3-6.", ["dorian"]),
  ch("shell-m7b5", "m7b5 shell", "m7(b5)(no3)", ["1", "b5", "b7"], "Shell & rootless", "Shell voicing 1-b5-b7.", ["locrian"]),
  ch("rl-m11", "m11 rootless", "m11 (rootless)", ["b3", "b7", "9", "11"], "Shell & rootless", "b3-b7-9-11 with the root left to the bass.", ["dorian"]),
  ch("rl-maj13", "maj13 rootless", "maj13 (rootless)", ["3", "7", "9", "13"], "Shell & rootless", "3-7-9-13 with the root left to the bass.", ["ionian"]),
  ch("rl-7b9", "7b9 rootless", "7(b9) (rootless)", ["3", "5", "b7", "b9"], "Shell & rootless", "3-5-b7-b9; the same notes as a diminished 7th.", ["dim-half-whole"]),
  ch("rl-13b9", "13b9 rootless", "13(b9) (rootless)", ["3", "13", "b7", "b9"], "Shell & rootless", "3-13-b7-b9.", ["dim-half-whole"]),
  ch("rl-69", "6/9 rootless", "6/9 (rootless)", ["3", "6", "9"], "Shell & rootless", "3-6-9 with the root left to the bass.", ["major-pentatonic"]),
  ch("guide-maj", "Major 7 guide tones", "maj7 (3 & 7 only)", ["3", "7"], "Shell & rootless", "3rd and major 7th only."),
  ch("guide-min", "Minor 7 guide tones", "m7 (b3 & b7 only)", ["b3", "b7"], "Shell & rootless", "Minor 3rd and minor 7th only."),
  ch("ust-bII", "UST bII (Db/C7)", "7(b9,11,b13) UST bII", ["1", "3", "b7", "b9", "11", "b13"], "Upper structures & slash", "Major triad a half step above over a dominant shell: b9-11-b13."),
  ch("ust-IIm", "UST IIm (Dm/C7)", "13 UST IIm", ["1", "3", "b7", "9", "11", "13"], "Upper structures & slash", "Minor triad on 2 over a dominant shell: 9-11-13.", ["mixolydian"]),
  ch("ust-bIIIm", "UST bIIIm (Ebm/C7)", "7(#9,#11) UST bIIIm", ["1", "3", "b7", "#9", "#11"], "Upper structures & slash", "Minor triad on b3 over a dominant shell: #9-#11-b7.", ["dim-half-whole", "altered"]),
  ch("slash-IIm", "IIm/I (Dm/C)", "IIm/I", ["1", "2", "4", "6"], "Upper structures & slash", "Minor triad a step above the bass: 9-11-13 with no 3rd.", ["dorian", "ionian"]),
  ch("slash-VII", "VII/I (B/C)", "VII/I", ["1", "7", "#9", "#11"], "Upper structures & slash", "Major triad a half step below the bass."),
  ch("slash-bVIIm", "bVIIm/I (Bbm/C)", "bVIIm/I", ["1", "b7", "b9", "11"], "Upper structures & slash", "Minor triad a step below the bass: a sus(b9) sound.", ["phrygian", "dorian-b2"]),
  ch("petrushka", "Petrushka chord", "(Petrushka)", ["1", "3", "5", "b9", "#11", "b7"], "Upper structures & slash", "Two major triads a tritone apart (C and F#).", ["tritone-scale"]),
  ch("quartal-aug", "Quartal (perfect + augmented)", "(4th + aug4th)", ["1", "4", "7"], "Suspended & quartal", "Perfect 4th stacked with an augmented 4th."),
  ch("quartal5", "Quartal 5-note", "(4ths ×5)", ["1", "4", "b7", "b10", "b13"], "Suspended & quartal", "Four stacked perfect 4ths.", ["aeolian"]),
  ch("quintal5", "Quintal 5-note", "(5ths ×5)", ["1", "5", "9", "13", "3"], "Suspended & quartal", "Four stacked perfect 5ths: the major pentatonic as a chord.", ["major-pentatonic"]),
  ch("viennese", "Viennese trichord", "(0-1-6)", ["1", "b2", "#4"], "Clusters", "Semitone plus tritone; set class 3-5."),
  ch("cl-chrom4", "Chromatic 4-note cluster", "(cluster 1-b2-2-b3)", ["1", "b2", "2", "b3"], "Clusters", "Four adjacent semitones."),
  ch("cl-wt4", "Whole-tone 4-note cluster", "(cluster 1-2-3-#4)", ["1", "2", "3", "#4"], "Clusters", "Four adjacent whole tones.", ["whole-tone", "lydian"]),
];

/* ------------------------------------------------------------------ arpeggios */

const is7 = (x: Degree) => x === "7" || x === "b7" || x === "bb7";
const isThird = (x: Degree) => x === "3" || x === "b3";

export const EXTRA_ARPEGGIOS: ArpeggioVariant[] = [
  {
    id: "seventh",
    name: "Seventh chord (1-3-5-7)",
    transform: (d) => d.filter((x) => ["1", "3", "b3", "4", "2", "5", "b5", "#5"].includes(x) || is7(x)),
    theory: "Keep the four-note core; extensions removed.",
  },
  {
    id: "no5",
    name: "Drop the 5th",
    transform: (d) => d.filter((x) => x !== "5"),
    theory: "The perfect 5th adds little colour; removing it makes room for tensions.",
  },
  {
    id: "guide",
    name: "Guide tones (3 & 7)",
    transform: (d) => d.filter((x) => isThird(x) || is7(x)),
    theory: "The two notes that define quality and voice-lead between chords.",
  },
  {
    id: "to9",
    name: "Extend to 9",
    transform: (d) => (d.some((x) => /9$/.test(x)) ? d : [...d, "9"]),
    theory: "Add the natural 9 unless an altered 9 is already present.",
  },
  {
    id: "to11",
    name: "Extend to 11",
    transform: (d) => {
      const out = [...d];
      if (!out.some((x) => /9$/.test(x))) out.push("9");
      if (!out.some((x) => /11$/.test(x))) out.push(d.includes("3") ? "#11" : "11");
      return out;
    },
    theory: "Stack to the 11th. Over a major 3rd the #11 is used, since a natural 11 clashes a b9 above it.",
  },
  {
    id: "to13",
    name: "Extend to 13",
    transform: (d) => {
      const out = [...d];
      if (!out.some((x) => /9$/.test(x))) out.push("9");
      if (!out.some((x) => /13$/.test(x) || x === "6")) out.push("13");
      return out;
    },
    theory: "Stack 9 and 13; the 11 is left out as the usual avoid note.",
  },
  {
    id: "69",
    name: "6/9 form",
    transform: (d) => {
      const out = d.filter((x) => !is7(x));
      if (!out.includes("6")) out.push("6");
      if (!out.some((x) => /9$/.test(x))) out.push("9");
      return out;
    },
    theory: "Replace the 7th with 6 and 9 — a pentatonic-like, stable sound.",
  },
  {
    id: "add6",
    name: "Add the 6th",
    transform: (d) => (d.includes("6") || d.includes("13") ? d : [...d, "6"]),
    theory: "The 6 within the octave rather than the 13 above it.",
  },
  {
    id: "altered",
    name: "Altered tensions (b9 #9 b13)",
    transform: (d) => {
      const base = d.filter((x) => !/9$|13$|^5$|^#5$|^b5$/.test(x));
      return [...base, "b9", "#9", "b13"];
    },
    theory: "Replace the natural 5/9/13 with the altered tensions from the altered scale.",
  },
  {
    id: "rootless-ext",
    name: "Rootless + 9",
    transform: (d) => {
      const out = d.filter((x) => x !== "1");
      if (!out.some((x) => /9$/.test(x))) out.push("9");
      return out;
    },
    theory: "Drop the root and add the 9 — the basis of left-hand A/B voicings.",
  },
  {
    id: "upper-5",
    name: "Upper structure (from the 5th)",
    transform: (d) => {
      const i = d.findIndex((x) => x === "5" || x === "b5" || x === "#5");
      return i < 0 ? d : [...d.slice(i), ...d.slice(0, i)];
    },
    theory: "Start from the 5th so the top of the chord reads as its own triad or seventh.",
  },

  { id: "r37", name: "Root, 3rd & 7th", transform: (d) => d.filter((x) => x === "1" || isThird(x) || is7(x)), theory: "Root with the two quality-defining tones." },
  { id: "rootless-no5", name: "Rootless, no 5th", transform: (d) => d.filter((x) => x !== "1" && x !== "5"), theory: "Root and perfect 5th removed; thirds, sevenths and tensions remain." },
  { id: "from3", name: "Starting from the 3rd", transform: (d) => rotateTo(d, isThird), theory: "Same tones reordered from the 3rd." },
  { id: "from7", name: "Starting from the 7th", transform: (d) => rotateTo(d, is7), theory: "Same tones reordered from the 7th." },
  { id: "top3", name: "Upper triad (top three tones)", transform: (d) => (d.length > 3 ? d.slice(-3) : d), theory: "The highest three tones of the stack in isolation." },
  { id: "sus4", name: "Suspend the 3rd (4)", transform: (d) => uniq(d.map((x) => (isThird(x) ? "4" : x))), theory: "3rd replaced by the perfect 4th." },
  { id: "sus2", name: "Suspend the 3rd (2)", transform: (d) => uniq(d.map((x) => (isThird(x) ? "2" : x))), theory: "3rd replaced by the major 2nd." },
  { id: "addmaj7", name: "Add major 7", transform: (d) => (d.some(is7) ? d : [...d, "7"]), theory: "Adds a major 7th when no 7th is present." },
  { id: "addb7", name: "Add minor 7", transform: (d) => (d.some(is7) ? d : [...d, "b7"]), theory: "Adds a minor 7th when no 7th is present." },
  { id: "b9", name: "With b9", transform: (d) => [...d.filter((x) => !/9$/.test(x)), "b9"], theory: "Any 9th replaced by the minor 9th." },
  { id: "s9", name: "With #9", transform: (d) => [...d.filter((x) => !/9$/.test(x)), "#9"], theory: "Any 9th replaced by the augmented 9th." },
  { id: "s11", name: "With #11", transform: (d) => [...d.filter((x) => !/11$/.test(x)), "#11"], theory: "Any 11th replaced by the augmented 11th." },
  { id: "b13", name: "With b13", transform: (d) => [...d.filter((x) => !/13$/.test(x) && x !== "6"), "b13"], theory: "Any 13th/6th replaced by the minor 13th." },
  { id: "half-dim", name: "Half-diminished form", transform: (d) => withCore(d, "b3", "b5", "b7"), theory: "3rd, 5th and 7th set to b3, b5, b7; tensions kept." },
  { id: "full-dim", name: "Diminished 7 form", transform: (d) => withCore(d, "b3", "b5", "bb7"), theory: "3rd, 5th and 7th set to b3, b5, bb7; tensions kept." },
  { id: "aug-form", name: "Augmented 5th form", transform: (d) => uniq(d.map((x) => (x === "5" || x === "b5" ? "#5" : x))), theory: "The 5th raised to #5." },
];

function uniq(d: Degree[]): Degree[] {
  return d.filter((x, i) => d.indexOf(x) === i);
}
function rotateTo(d: Degree[], pred: (x: Degree) => boolean): Degree[] {
  const i = d.findIndex(pred);
  return i < 0 ? d : [...d.slice(i), ...d.slice(0, i)];
}
function withCore(d: Degree[], third: Degree, fifth: Degree, seventh: Degree): Degree[] {
  const rest = d.filter((x) => !isThird(x) && !["4", "2", "5", "b5", "#5"].includes(x) && !is7(x) && x !== "6");
  return uniq(["1", third, fifth, seventh, ...rest.filter((x) => x !== "1")]);
}
