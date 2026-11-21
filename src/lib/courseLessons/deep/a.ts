import type { DeepMap } from "./index";

export const DEEP_A: DeepMap = {
  "1.1": {
    dive: [
      ["Why each interval sounds the way it does", "Intervals are frequency ratios. An octave is 2:1, a perfect fifth about 3:2, a perfect fourth about 4:3, a major third about 5:4. Simple ratios line up their vibrations often, which the ear hears as stable and fused. Complicated ratios (the tritone, the major 7th) rarely line up, so the ear hears friction. Equal temperament bends the ratios slightly so every key works, but the stable-versus-tense ranking survives."],
      ["Quality words in one rule", "Perfect intervals (unison, 4th, 5th, octave) have one standard size. Make a perfect interval a semitone bigger and it is augmented, a semitone smaller and it is diminished. Seconds, thirds, sixths and sevenths come in major and minor: minor is a semitone smaller than major, then diminished is a semitone below minor and augmented a semitone above major. Count letters for the number, semitones for the quality."],
      ["Interval size on the fretboard", "On any pair of adjacent strings tuned in fourths, the same fret gives a perfect fourth; one fret higher on the upper string gives a tritone, and so on. The G to B pair is a major third apart instead of a fourth, so shapes shift by one fret when they cross it. Knowing the shift lets you reuse a shape on any string pair."],
      ["Consonance is context", "A tritone sounds hostile alone but is central in a dominant seventh chord. A major 7th is harsh as a two-note dyad but dreamy inside a maj7 chord because the other notes explain it. Judge an interval by what surrounds it, not in isolation."],
    ],
    method: ["Pick one root and play it against each of the twelve notes above it, naming size and quality", "Sing each interval before you play it and check your pitch", "Sort the twelve into stable, coloured and tense in your own words", "Choose two tense intervals and find a place where a chord resolves them", "Repeat from a different root string so the shapes become automatic"],
    check: [
      ["How many semitones is a minor third, and a perfect fifth?", "Three and seven."],
      ["Why can a C to G♭ not be called a perfect fifth?", "A perfect fifth spans seven semitones and spells with letters five apart; C to G♭ is six semitones, a diminished fifth."],
      ["What do the 3rd and 7th of a G7 form, and why does it matter?", "B and F form a tritone. That tension is what makes the chord want to resolve."],
    ],
  },
  "1.2": {
    dive: [
      ["Building triads from stacked thirds", "Stack a third on a third on the root. Major third plus minor third gives major; minor plus major gives minor; minor plus minor gives diminished; major plus major gives augmented. The outer interval (root to top) is a perfect fifth for major and minor, a diminished fifth for diminished and an augmented fifth for augmented."],
      ["The five seventh chords and their recipe", "Add a third on top of a triad. Major triad plus major third gives maj7. Major triad plus minor third gives dominant 7. Minor triad plus minor third gives m7. Diminished triad plus major third gives half-diminished (m7♭5). Diminished triad plus minor third gives fully diminished (dim7). Memorise the recipe, not just the names."],
      ["Guide tones carry the identity", "The 3rd tells major from minor, the 7th tells maj7 from dominant from minor seventh. The root is often supplied by the bass and the 5th can usually be dropped without changing the chord's name. When voicings get thin, keep the guide tones."],
      ["Where each chord lives in a key", "In a major key the diatonic seventh chords fall in a fixed pattern: maj7 on I and IV, m7 on ii, iii and vi, dominant 7 on V and m7♭5 on vii. Only the V is dominant, which is why V carries so much directional pull toward I."],
    ],
    method: ["Spell the triad by stacking thirds from the scale, not by memorising a letter list", "Add the seventh and name which of the five chords you made", "Write it as numbers (1 3 5 7 with flats) and check against Explore", "Find it as a shape on two string sets", "Say aloud what the guide tones are before you play"],
    check: [
      ["What is the formula of a minor seventh chord?", "1, ♭3, 5, ♭7."],
      ["Which diatonic seventh chord is dominant in a major key?", "The one built on the 5th degree."],
      ["Which two notes must stay in a thin voicing?", "The 3rd and the 7th."],
    ],
  },
  "1.3": {
    dive: [
      ["Extensions are the stack continuing", "Thirds keep stacking: root, 3rd, 5th, 7th, 9th, 11th, 13th. The 9th, 11th and 13th are the 2nd, 4th and 6th an octave higher. Calling the same note a 2nd or a 9th is a statement about the chord: a 9 chord includes a 7th, an add9 does not."],
      ["Avoid notes and their fixes", "A natural 11th sits a semitone above a major 3rd, so on a major chord it clashes and is usually replaced by a ♯11 (the Lydian sound). On a dominant chord the natural 11 also tends to clash with the 3rd, which is why sus chords exist. On minor chords the 11th is normally fine because the 3rd is a half step lower and the 11th is a whole step above it."],
      ["Choosing what to leave out on six strings", "Six strings cannot hold seven notes, so prioritise: keep the 3rd and 7th, keep the extension you want to hear, drop the 5th, then the root if a bass plays it. A chord with only 3rd, 7th and 9th is a legitimate voicing."],
      ["Colour versus function", "A 9th or 13th rarely changes what a chord does; it changes how it feels. A ♭9 or ♯9 on a dominant, by contrast, raises tension and changes the pull. Treat natural extensions as colour and altered ones as intensity."],
    ],
    method: ["Pick a chord and list its available extensions by type", "Decide the one colour you want", "Remove the 5th and any note that clashes", "Find a shape with the 3rd, 7th and your colour note on adjacent strings", "Compare it to the plain 7th chord and describe the difference"],
    check: [
      ["What is the difference between a C9 and a Cadd9?", "C9 includes the ♭7; Cadd9 has the 9th added to a plain triad with no 7th."],
      ["Why is a natural 11th problematic on a major chord?", "It sits a half step above the major third and clashes; the ♯11 is used instead."],
      ["Which chord tone is usually dropped first on guitar?", "The 5th."],
    ],
  },
  "1.4": {
    dive: [
      ["Suspensions are delayed arrivals", "A suspended chord replaces the 3rd with a note one step away, usually the 4th. The ear hears that note as wanting to fall to the 3rd. Resolving it is satisfying; leaving it unresolved gives an open, hanging sound. sus2 is more ambiguous because the 2nd can also be heard as a 9th."],
      ["Altered tensions and their direction", "On a dominant 7th the ♭9 and ♯9 sit above the root and resolve down by step, while ♭13/♯5 leans up. Altered notes push toward the target chord's tones and make the arrival stronger, so use them when you want a strong resolution and avoid them in a relaxed passage."],
      ["Inversions as bass-line tools", "Putting the 3rd in the bass lets the bass walk by step while the chord names jump. The cost is a lighter foundation. Second inversion is the least stable and is best at passing moments or over a pedal."],
      ["Register and spacing", "Close voicings stack notes within an octave and sound dense. Open voicings spread them and sound airy. Notes below roughly the second E on guitar get muddy in close position, so thirds in a low register should be avoided; use fifths or octaves there."],
    ],
    method: ["Choose a chord and play it with a sus4, then resolve it", "Add one altered tension to the dominant and listen to its pull", "Voice the same chord low, mid and high", "Name the inversion of each voicing", "Write a sentence saying what mood each gives"],
    check: [
      ["Which note does a sus4 usually resolve to?", "The 3rd, by stepping down."],
      ["Why do low close-position thirds sound muddy?", "Low notes are close in frequency and produce beating and masking; spread voicings fix this."],
      ["Which inversion is least stable?", "Second inversion (5th in the bass)."],
    ],
  },
  "2.1": {
    dive: [
      ["Why home feels like home", "Tonic is the point where the music has no tension to release. Notes of the tonic triad (1, 3, 5) are the most stable scale degrees. A chord built on them, in root position, on a strong beat, with the melody on one of those notes, is the strongest rest available."],
      ["Stability is the sum of many cues", "Harmony, bass note, melody note, rhythm placement, duration and register all vote. When they agree, arrival is total. When they disagree (tonic chord with the 3rd in the bass and the melody on 2), the sense of home is partial. That is a tool, not a flaw."],
      ["Tonic substitutes", "vi and iii share two notes with I, so they sound like partial tonics. In minor, III and VI do the same job. They keep the key but delay full arrival."],
      ["Tonic prolongation", "A phrase can stay on tonic function for several bars using chords that all belong to it, for example I, vi and iii. Prolongation lets you hold the sense of home while adding movement."],
    ],
    method: ["Pick a key and place its tonic chord", "Find the five cues for stability and list which each of your parts supplies", "Remove one cue at a time and listen for weakening", "Try a tonic substitute in place of the tonic", "Write which version feels most final and why"],
    check: [
      ["Name three things that make a chord sound like home.", "Root in the bass, melody on 1, 3 or 5, strong beat and longer duration."],
      ["Which chords act as weaker tonics in a major key?", "vi and iii."],
      ["What does tonic prolongation mean?", "Staying in tonic function for a while using chords that share its notes."],
    ],
  },
  "2.2": {
    dive: [
      ["Function groups", "Tonic (I, vi, iii) rests. Predominant (IV, ii) departs and prepares. Dominant (V, vii°) creates the strongest tension and demands return. The standard motion is T to PD to D to T, but any step can be repeated, shortened or skipped."],
      ["Why the dominant pulls", "V contains the leading tone (scale degree 7), a half step below the tonic, and in V7 also the 4th degree, a tritone away from the 7th. Both resolve inward by half step, which is the strongest voice-leading cue in tonal music."],
      ["Predominant colour", "IV and ii share the notes 4 and 6 and both approach V. IV sounds broad and open, ii sounds smoother and more directional because its root is a fifth from V. Choosing between them changes how the approach feels."],
      ["Retrogression", "Moving backwards (D to PD) weakens the sense of progress and sounds like drifting, which is why it is common in verses that should not feel urgent."],
    ],
    method: ["Label each chord of a progression you know with T, PD or D", "Swap a predominant for its partner", "Skip the predominant and compare", "Try a retrogression and describe the mood", "Write the result in numbers"],
    check: [
      ["What notes make the dominant pull?", "The leading tone (7) and, in V7, the 4th; both resolve by half step."],
      ["Which predominant is a fifth from V?", "ii."],
      ["What is retrogression?", "Moving backward in the function order, such as D to PD."],
    ],
  },
  "2.3": {
    dive: [
      ["Cadence types by strength", "Perfect authentic cadence (V to I, both in root position, melody ending on 1) is strongest. Imperfect authentic cadences vary bass or melody and are softer. Plagal (IV to I) is gentler. Half cadence ends on V and asks a question. Deceptive (V to vi) answers that question with something unexpected."],
      ["Expectation is statistical", "Listeners absorb patterns from everything they hear, so they predict the next chord. Cadences work because the prediction is strong. Writing is partly about deciding how often to confirm or deny it."],
      ["Where to place cadences", "Phrase ends, section ends and song ends need different strengths. A half cadence at the end of a first phrase and an authentic one at the end of the second creates a question and answer. A strong cadence too early deflates momentum."],
      ["Deceptive resolution done right", "Keep everything else (rhythm, drum fill, melody contour) as if a normal cadence were coming. The mismatch between expectation and harmony is the effect. After it, you can resolve properly or continue the surprise."],
    ],
    method: ["Write an antecedent phrase ending on a half cadence", "Write a consequent phrase ending on an authentic cadence", "Replace the final chord with vi and listen", "Decide where in your section a surprise would be most effective", "Mark each cadence and its strength"],
    check: [
      ["Which cadence sounds like a comma?", "The half cadence."],
      ["What makes V to I stronger than IV to I?", "The leading tone and the dominant's tritone resolve by half step into the tonic."],
      ["What must a listener believe before a deceptive cadence works?", "That a normal resolution was coming."],
    ],
  },
  "3.1": {
    dive: [
      ["Root motion ranked", "Descending fifths are the strongest and most common, because the chords share one note and the roots are in the closest harmonic relationship. Descending thirds and ascending fourths also feel natural. Ascending seconds feel more open, and ascending thirds feel lighter and slightly lifting."],
      ["Common tones", "Chords sharing two notes (I and vi) feel closely related and can substitute for each other. Chords sharing none (I and ii) feel like a real change. Counting common tones is a quick test of how smooth a move will sound."],
      ["Function by context", "The same chord changes function with its neighbours. vi after V is a deceptive cadence; vi after iii is just moving along; vi before ii is part of a descending chain. Always ask what comes before and after."],
      ["Planning root motion", "Decide root motion first, then choose qualities. A design such as falling fifths with one rising step gives momentum with a lift, and it reads as intentional."],
    ],
    method: ["List the diatonic chords of a key", "For each pair, count shared notes", "Write a progression using only strong root motions", "Replace one move with a weaker one and compare", "Describe the feel of each in your words"],
    check: [
      ["How many notes do I and vi share?", "Two."],
      ["Which root motion is strongest?", "Descending fifth."],
      ["Why must you consider surrounding chords?", "A chord's function depends on what comes before and after it."],
    ],
  },
  "3.2": {
    dive: [
      ["What harmonic rhythm is", "The pace of chord changes. It is independent of melody and drum rhythm. A fast surface (many notes) over slow harmony still sounds calm harmonically. Many songs use a steady harmonic rhythm of one chord per bar or two."],
      ["Accelerating and decelerating", "Chord changes that speed up toward a cadence create momentum. Slowing before a section change makes the new section feel arrived at. Pre-choruses often accelerate."],
      ["Change placement", "Changes on the downbeat feel clear. Changes anticipated by an eighth push forward. Delayed changes (landing just after the beat) sound laid back."],
      ["Contrasting layers", "If the harmony is slow, the groove can be busy, and the reverse. A contrast between layers gives depth without extra instruments."],
    ],
    method: ["Take a chord set and list how many beats each gets", "Write it again with every duration halved", "Add one anticipated change", "Slow the last chord and compare", "Describe the energy of each"],
    check: [
      ["Can a riff be busy while harmonic rhythm is slow?", "Yes; surface rhythm and harmonic rhythm are separate."],
      ["What does an anticipated change do?", "It pushes the music forward by arriving early."],
      ["Why slow the harmony before a new section?", "It makes the arrival feel weighty."],
    ],
  },
  "3.3": {
    dive: [
      ["The three smoothness rules", "Keep shared notes in the same voice. Move other voices by the smallest step. Avoid large leaps in inner voices. These produce lines that are easy to follow."],
      ["Parallel perfect intervals", "When two voices move together by fifth or octave, they merge into one sound and lose independence. In rock this is the power-chord sound, so it is a feature there, but in independent lines it flattens the texture."],
      ["Bass is its own voice", "The bass can leap to roots while upper voices move by step. Inversions let the bass also move by step. Outer voices (bass and top) are what the ear tracks most."],
      ["Guitar position as voice-leading tool", "Staying in one fretboard region while changing chords puts shapes close together, so common tones stay on the same strings and others move by a fret or two."],
    ],
    method: ["Write the chords and mark common tones", "Assign each chord tone to a voice", "Move each remaining voice to the nearest chord tone", "Check outer voices for step motion", "Find the guitar shapes that keep your hand in one region"],
    check: [
      ["What makes voice leading smooth?", "Common tones held and other notes moved by step."],
      ["Why avoid parallel fifths in independent lines?", "They fuse the voices into one."],
      ["Which two voices does the ear track most?", "The bass and the top voice."],
    ],
  },
};
