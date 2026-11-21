import type { DeepMap } from "./index";

export const DEEP_B: DeepMap = {
  "4.1": {
    dive: [
      ["Pitch collection versus centre", "A scale is a set of notes; a mode is that set heard from a particular home note. E Phrygian and C major use the same seven notes, but the music is Phrygian only when E functions as the resting point. Everything in modal writing is about making the ear accept a centre that is not the default."],
      ["The five centring tools", "Bass: sustain or return to the root. Melody: start, end and linger on it. Harmony: let a chord on the root recur and resolve. Metre: place the root on strong beats and long durations. Cadence: end phrases on it. Any one is weak; four or five together are decisive."],
      ["Why the characteristic note matters", "Compare the mode with the major or minor scale it most resembles. Phrygian differs from natural minor only in its ♭2, so the ♭2 is what identifies it. Giving that note prominence, and the chord that contains it (♭II), makes the mode audible."],
      ["Pedal points", "A held or repeated root lets the upper harmony wander without losing the centre. Because the bass never leaves, dissonant colour notes sound like deliberate colour, not like a key change."],
    ],
    method: ["Choose a mode and a root", "Write its scale and mark the characteristic note", "Set the centre with bass, melody and phrase ends", "Add the characteristic chord", "Test by humming the note that feels like home at the end"],
    check: [
      ["Why is E F G A B C D not automatically E Phrygian?", "It is only Phrygian if E is heard as the centre."],
      ["What is Phrygian's characteristic note?", "The ♭2."],
      ["What does a pedal point do?", "It anchors the centre while the harmony above changes."],
    ],
  },
  "4.2": {
    dive: [
      ["The single-note difference", "Natural minor (Aeolian) has ♭6; Dorian has natural 6. All other notes match. Dorian is therefore minor with a brighter, more hopeful lift."],
      ["Chords that prove each", "Dorian gives a major IV chord and a minor ii. Aeolian gives a minor iv and a diminished ii°. Playing the IV chord in major or minor tells the ear which mode you are in more clearly than any scale run."],
      ["Why pentatonic hides it", "The minor pentatonic omits the 2nd and 6th, exactly the notes that distinguish Dorian from Aeolian (and Phrygian). Players using only pentatonic cannot show a mode. To express Dorian you must put the natural 6th somewhere prominent."],
      ["Using the 6th", "As a melody note, resolve it up to the 7th or down to the 5th; as a chord note, make it the top of a m6 chord; as a bass note, make it the colour of a vamp."],
    ],
    method: ["Write the A Dorian and A Aeolian scales", "Mark the one note that differs", "Build the IV chord in each and compare", "Write a melody that lingers on the 6th in each", "Describe the emotion of each"],
    check: [
      ["Which note differs between A Dorian and A Aeolian?", "F♯ in Dorian and F natural in Aeolian."],
      ["Which IV chord belongs to Dorian?", "Major IV."],
      ["Why is pentatonic neutral between them?", "It skips the 6th."],
    ],
  },
  "4.3": {
    dive: [
      ["The tritone above the root", "Lydian's ♯4 forms a tritone with the root. In major the 4th wants to fall to the 3rd; in Lydian the raised 4th instead leans upward to the 5th. That gives a lifted, floating sound."],
      ["Chord colour", "The II chord is major, and Cmaj7(♯11) contains the colour note inside a tonic chord. Bright tonic chords with the ♯11 are the signature Lydian sound."],
      ["Key-centre risk", "A major II chord is a dominant-looking D to C. Moving D7 to G would pull the ear to G. Keeping the bass on C, ending phrases on C and not resolving the D chord to G prevents the shift."],
      ["Voicing it", "Choose voicings that keep the root in the bass and expose the ♯4 near the top, so the colour is heard clearly."],
    ],
    method: ["Write C major and C Lydian side by side", "Mark F versus F♯", "Build the II chord and Cmaj7(♯11)", "Hold a C pedal and test a D chord over it", "End on C and describe the feeling"],
    check: [
      ["What is Lydian's characteristic note?", "The raised 4th."],
      ["Which diatonic chord shows it besides the tonic?", "The major II chord."],
      ["How do you stop D from pulling to G?", "Keep C in the bass and end phrases on C."],
    ],
  },
  "4.4": {
    dive: [
      ["Removing the leading tone", "Mixolydian lowers the 7th, so the note below the tonic is a whole step. With no half-step pull, the tonic does not need to be approached by a dominant, and the music can loop comfortably."],
      ["The dominant seventh as home", "In blues and rock the I7 chord is a stable tonic. The ♭7 in that chord is not a tension to be resolved; it is part of the character."],
      ["I and ♭VII", "The ♭VII major chord is a whole step below the root and contains the ♭7. Moving between I and ♭VII is the modal signature and does not behave like a cadence."],
      ["Modal versus borrowed", "If a major song uses ♭VII once, it borrows from Mixolydian for one moment. If the harmony, melody and bass consistently use ♭7 and avoid V to I, the song is modal."],
    ],
    method: ["Write C Mixolydian", "Mark the ♭7 (B♭)", "Build I and ♭VII", "Write the same idea in Ionian and compare the pull", "Decide whether your idea is modal or borrowing"],
    check: [
      ["What is the difference between Ionian and Mixolydian?", "Mixolydian has a ♭7."],
      ["Why can Mixolydian loop without resolving?", "There is no leading tone pulling to the tonic."],
      ["When is a ♭VII only a borrowed chord?", "When the rest of the harmony stays in major and it appears briefly."],
    ],
  },
  "4.5": {
    dive: [
      ["Why Locrian is unstable", "Its tonic triad is diminished, with a ♭5. A diminished triad is not stable because its fifth is a tritone away; the ear wants to hear another chord as home, often the ♭III."],
      ["Characteristic notes", "The ♭2 and ♭5 give the mode its identity. Together they make the root feel crowded from above and unsupported from the fifth."],
      ["Using it as a colour", "Use short gestures, riffs and moments of instability, then move to a mode with a stable tonic. Or use it over a m7♭5 chord in a larger progression."],
      ["Locrian ♮2", "The natural 2 version is gentler and common in jazz because the second degree is no longer so crowded."],
    ],
    method: ["Write the Locrian scale", "Mark ♭2 and ♭5", "Play only the root with those notes", "Test whether the ear hears a different centre", "Decide where to resolve"],
    check: [
      ["What chord is built on the Locrian tonic?", "A diminished triad."],
      ["Why is it rarely a home?", "The ♭5 removes a stable fifth."],
      ["Where is it more usable?", "Over a m7♭5 chord or as a brief colour."],
    ],
  },
  "4.6": {
    dive: [
      ["Chord-to-mode map", "Dorian: major IV. Phrygian: ♭II. Lydian: major II. Mixolydian: ♭VII. Aeolian: ♭VI and ♭VII. Locrian: ♭V. The chord that contains the characteristic note is the quickest way to identify a mode."],
      ["Vamps", "Two or three chords on a loop, bass pedal and no strong cadence keep the mode in place. Complexity lets the ear find a major or minor key instead."],
      ["Parent scale awareness", "Each mode shares notes with a parent major scale. Naming the mode and its parent keeps you from sliding into the parent's tonic."],
      ["Avoiding the parent's cadence", "V to I of the parent key undermines the mode. If the parent's dominant chord appears, resolve it somewhere else or avoid it."],
    ],
    method: ["Pick a mode and its parent", "Choose the characteristic chord", "Add one stable chord", "Keep the bass on the mode's root", "Check that no parent cadence appears"],
    check: [
      ["Which chord signals Dorian?", "Major IV."],
      ["Why avoid the parent's V to I?", "It pulls the ear to the parent tonic."],
      ["Why use few chords?", "It makes the mode's identity clear."],
    ],
  },
  "4.7": {
    dive: [
      ["Mood by mode", "Brightest to darkest: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian. Brightness follows the number of sharp or flat notes relative to major."],
      ["Style associations", "Mixolydian and Dorian are common in blues, rock and folk. Aeolian and Phrygian are common in metal. Lydian is used in film and dreamy pop. Associations are habits, not rules."],
      ["Modal contrast between sections", "Changing modes between sections (Dorian verse, Aeolian chorus) changes the mood while the root stays the same, which is a strong contrast without a key change."],
      ["Matching the whole sound", "Instrumentation and production should agree with the mode. A Lydian passage with heavy distortion fights itself; a spacious clean tone helps it."],
    ],
    method: ["Choose the emotion for your song", "Pick the mode that fits", "Plan which sections use it", "Choose instruments to support it", "Test by playing it against a different mode"],
    check: [
      ["Which mode is brightest?", "Lydian."],
      ["How can you change mood without changing key?", "Change the mode on the same root."],
      ["Why match production to the mode?", "So the sound supports the emotion rather than fighting it."],
    ],
  },
  "5.1": {
    dive: [
      ["How to build one", "Take the target chord, find its fifth above, and build a dominant seventh on that note. In C major, G is a fifth above C, so D7 is the dominant of G, a V/V. The chromatic note (F♯ in D7) is a leading tone to the target."],
      ["Why they work", "They reuse the dominant's strong pull but aim it at a chord other than I. The target chord temporarily behaves as a tonic, which is tonicisation."],
      ["Chains", "Secondary dominants can chain: each one resolves to the next and the next resolves in turn, descending by fifths. Long chains are exciting but need an eventual arrival."],
      ["Voicing", "Move the chromatic leading tone to the target chord's third by half step, making the resolution audible in an inner or top voice."],
    ],
    method: ["Pick a diatonic target (not I)", "Find the note a fifth above", "Build a dominant seventh on it", "Identify the chromatic note", "Resolve it by half step in a voice"],
    check: [
      ["What is V/V in C?", "D7."],
      ["What is tonicisation?", "Treating a chord other than the tonic as a temporary home."],
      ["What note resolves by half step?", "The chromatic leading tone to the target's root or third."],
    ],
  },
  "5.2": {
    dive: [
      ["Parallel versus relative", "Modal interchange borrows from the parallel mode (same root). C major can borrow from C minor. Relative keys (A minor) are different because they have a different root."],
      ["Common borrowings", "iv, ♭VI, ♭VII, ♭III, and ii°. Each carries a note that differs from major: ♭6 or ♭3 or ♭7."],
      ["Justify the borrowed note", "Let the melody touch the borrowed note or the bass reinforce it so it does not feel like an accident."],
      ["Return to home", "A borrowed chord is a colour change. If you do not return to the home mode, the music is modulating or has become modal."],
    ],
    method: ["Pick a home mode", "List chords from its parallel minor", "Choose one borrowed chord", "Mark the borrowed note", "Resolve back to the home mode"],
    check: [
      ["Which chord is borrowed in C major if you play F minor?", "iv from C minor."],
      ["Why mention the borrowed note?", "It explains the colour."],
      ["What if you never return?", "It becomes modulation or modal writing."],
    ],
  },
  "5.3": {
    dive: [
      ["Chromatic mediants", "Chords whose roots are a third apart with the same quality but not in the key, such as C and E or C and A♭. They share at most one note, so they sound like a sudden colour shift."],
      ["Why they sound cinematic", "No dominant pull and no easy function. The ear hears movement without explanation, which feels wondrous or dramatic."],
      ["Keeping connection", "Hold the shared note in one voice, or approach the new chord by a short stepwise line so the move is not random."],
      ["Using sparingly", "Frequent mediants erase the key. One or two per section is usually enough."],
    ],
    method: ["Choose a start chord", "List the chromatic mediants above and below", "Find the shared note in each", "Hold that note while the others move", "Decide the section's key still reads"],
    check: [
      ["How many notes can chromatic mediants share?", "At most one."],
      ["What makes them sound cinematic?", "A sudden shift without functional explanation."],
      ["How to keep them connected?", "Hold the common tone."],
    ],
  },
  "5.4": {
    dive: [
      ["Symmetry", "A fully diminished seventh divides the octave into four minor thirds, so any of its notes can be the root. The same chord can resolve in four directions, which makes it a pivot. An augmented triad divides the octave into three major thirds."],
      ["Passing diminished", "A diminished seventh chord a half step below a target chord shares the target's dominant function and resolves up by half step."],
      ["Tritone substitution", "Replace V7 with the dominant seventh a tritone away. The 3rd and 7th are the same two notes swapped in role, so the resolution works. The bass moves by half step to the target."],
      ["Why it works", "The tritone between 3rd and 7th is what causes the pull, not the root. Any chord containing that tritone has the same pull."],
    ],
    method: ["Pick a V7 and its target", "Find the tritone between its 3rd and 7th", "Build the dominant that shares the tritone", "Resolve it to the target", "Compare the bass line"],
    check: [
      ["What is the tritone sub of G7?", "D♭7."],
      ["What shared notes make it work?", "B and F, swapped between 3rd and 7th roles."],
      ["Why is dim7 a pivot?", "Any note can be root, so it resolves several ways."],
    ],
  },
  "5.5": {
    dive: [
      ["Line first", "A chromatic line in the bass or an inner voice can explain unusual chords. Write the line, then ask what chords it implies."],
      ["Anchors", "A pedal, a recurring tonic or a stable melody keeps the key audible while the harmony wanders."],
      ["Where surprise goes", "Pick one layer to surprise. If harmony, melody and rhythm all do, the listener loses their footing."],
      ["Check coherence by reduction", "Play only the bass and top line. If they make sense together, the chords in between will work."],
    ],
    method: ["Choose a bass or inner line that moves by half steps", "Harmonise it with chords", "Identify the anchor that keeps the key", "Simplify one layer", "Reduce to outer voices and test"],
    check: [
      ["What is the first step in coherent chromaticism?", "Write the line."],
      ["What does an anchor do?", "Keeps the key audible."],
      ["How to test coherence?", "Play only bass and melody."],
    ],
  },
};
