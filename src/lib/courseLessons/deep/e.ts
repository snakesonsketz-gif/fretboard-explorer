import type { DeepMap } from "./index";

export const DEEP_E: DeepMap = {
  "15.1": {
    dive: [
      ["Reading a bar as a grid", "A bar of 4/4 in sixteenths has sixteen slots: 1 e & a 2 e & a 3 e & a 4 e & a. Every drum hit sits on one slot. Writing a groove as rows (hat, snare, kick) and columns (slots) turns rhythm into something you can see and edit."],
      ["Why counting beats feeling alone", "Feel tells you something is right; counting tells you why. When two parts clash, counting reveals whether they are a sixteenth apart or a whole eighth. Precise language makes fixing possible."],
      ["Triplets and compound time", "A triplet fits three notes in a beat; compound metres such as 6/8 and 12/8 are built on it. Mixing a triplet feel with straight sixteenths in one bar is a polyrhythm, and it needs both to be counted separately."],
      ["Ties and rests as syncopation tools", "Most syncopation on the page is a tie from a weak slot across a strong beat, or a rest on the strong beat. Reading those two symbols is the key to reading syncopated parts."],
    ],
    method: ["Draw a 16-slot grid", "Write a rhythm you know onto it", "Count it aloud with 'e & a'", "Mark the slots that are off the beat", "Rewrite one hit as a tie and compare"],
    check: [
      ["How many sixteenth slots are in a bar of 4/4?", "Sixteen."],
      ["How do you count a triplet?", "1 trip-let, 2 trip-let and so on."],
      ["What two symbols create most written syncopation?", "Ties across strong beats and rests on strong beats."],
    ],
  },
  "15.2": {
    dive: [
      ["The maths of swing", "Straight eighths split the beat 1:1. A triplet swing splits it 2:1, so the off-beat falls two thirds of the way through. Real swing varies between about 1:1 and 2:1 or more depending on tempo and style."],
      ["Tempo changes the amount", "At slow tempos swing is usually heavy, nearly full triplet. At fast tempos it flattens toward straight. A groove that swings at 80 bpm may be played nearly straight at 180."],
      ["Shuffle versus swing", "Shuffle usually refers to a consistent triplet-based pattern in blues and rock. Swing includes the lighter, more variable feel found in jazz."],
      ["Locking the band", "The off-beats of every instrument must fall in the same place. Check by tapping only the off-beats while the band plays."],
    ],
    method: ["Play a straight eighth pattern", "Convert it to triplet-based shuffle", "Try light swing", "Tap the off-beat while others play", "Choose which fits your song's mood"],
    check: [
      ["What ratio does triplet swing use?", "Roughly 2:1."],
      ["How does tempo affect swing?", "Faster tempos tend toward less swing."],
      ["How to check band lock?", "Tap the off-beats."],
    ],
  },
  "15.3": {
    dive: [
      ["The anatomy of a rock groove", "Hats state subdivision, snare states backbeat, kick states pulse and push. Changing any one changes the genre signal. A kick pattern with off-beat hits signals funk or dance; a kick on only 1 and 3 signals straight rock."],
      ["Where each kick lands", "Kick on 1 anchors the bar. Kick on the 'and' of 2 anticipates beat 3. Kick on the 'and' of 4 anticipates the next bar. Each anticipation adds momentum."],
      ["Ghost notes", "Soft snare notes between the main hits, typically just before or after the backbeat, give grooves a rolling character. Their volume should be about a quarter of the main snare."],
      ["Ride versus hat", "The ride gives a broader, washier sustain and suits bigger sections. Closed hat is tighter. Opening the hat on an off-beat lifts the groove."],
    ],
    method: ["Write a basic groove", "Move one kick to an anticipation", "Add ghost notes", "Switch hat to ride in the chorus", "Describe each change's effect"],
    check: [
      ["What does a kick on the 'and' of 4 do?", "Anticipates the next downbeat."],
      ["How loud should ghost notes be?", "Much quieter than main hits."],
      ["Why use ride in a chorus?", "It broadens the sound."],
    ],
  },
  "15.4": {
    dive: [
      ["Syncopation as expectation", "The listener builds a metric grid from the strongest cues. Syncopation contradicts that grid momentarily. The ear holds both the expected and the played rhythm at once, and that tension is the pleasure."],
      ["Degrees of syncopation", "Simple off-beat accents are mild. Tying across the barline is stronger. Stacking multiple syncopations in different parts makes the grid hard to hold and can sound chaotic unless something states the pulse."],
      ["Syncopation in guitar and harmony", "Anticipating a chord by an eighth is the most common move. Delaying a chord is rarer and sounds relaxed. Both change which beat the chord appears to land on."],
      ["Syncopation in the drums", "Moving the kick off the beat or leaving out the downbeat kick makes the whole band feel pushed. The bass should either follow or deliberately hold the downbeat."],
    ],
    method: ["Write a chord rhythm on the grid", "Anticipate one chord by an eighth", "Tie one weak note across a beat", "Rest on one strong beat", "Check that something states the pulse"],
    check: [
      ["What is anticipation?", "Playing a chord early, before its beat."],
      ["Why does something need to state the pulse?", "So syncopation is felt against a grid."],
      ["What happens if all parts syncopate?", "The pulse is lost."],
    ],
  },
  "15.5": {
    dive: [
      ["Half-time and double-time in practice", "Half-time places the snare on 3, doubling the length of the pattern, so it feels slower at the same bpm. Double-time halves the pattern length. Switching at a section change is a cheap, powerful transformation."],
      ["Counting odd metres", "7/8 is felt as a bar of two groups of two and one of three, in any order. 5/4 is 3+2 or 2+3. Accent the first beat of each group. Practise with a metronome on the eighth note."],
      ["Drums and harmonic emphasis", "A chord on a strong snare hit feels like an event. A chord on an unaccented beat feels like a connection. Where you place drum accents tells the listener which chords matter."],
      ["Silence and breaks", "A full-band stop followed by a single hit has more impact than a fill because the contrast is greater. Use sparingly."],
    ],
    method: ["Write a groove", "Convert it to half-time", "Count a 7/8 pattern in two groupings", "Place a snare accent on a different chord", "Add one break"],
    check: [
      ["How does half-time change the feel?", "The snare moves to beat 3, so it feels slower."],
      ["How do you count 7/8?", "In groups such as 2+2+3."],
      ["Why is a break powerful?", "The silence heightens the next hit."],
    ],
  },
  "16.1": {
    dive: [
      ["Why the bass wins", "Low frequencies are perceived as foundational. The auditory system treats the lowest strong pitch as the root of whatever harmony is heard, even if the upper notes suggest otherwise (the root-bass effect)."],
      ["Slash chords as a tool", "Naming a chord with a different bass, such as C/E, tells the bassist exactly which note to play. It changes the stability without changing upper notes."],
      ["Reinterpretation", "Am7 above C bass is heard as C6. Keeping a shape and moving the bass is how pop writers create fresh harmony from familiar shapes."],
      ["Inversion as emotion", "Root bass feels certain, third bass feels gentle and leaning, fifth bass feels suspended. Put these on a scale of settledness and match it to the lyric."],
    ],
    method: ["Pick a chord", "Hold the upper notes", "Play each chord tone in the bass", "Write the slash chord names", "Describe the settledness of each"],
    check: [
      ["What is C/E?", "A C chord with E in the bass."],
      ["Which bass choice is least stable?", "The fifth."],
      ["Why does the lowest note matter?", "The ear treats it as the root."],
    ],
  },
  "16.2": {
    dive: [
      ["Rhythm over notes", "Bass patterns on the same notes in different rhythms produce different genres: steady eighths for rock drive, syncopated sixteenths for funk, long notes for ballads."],
      ["Fifth and octave", "Alternating root and fifth is the classic pulse in country and early rock. Octaves add energy in disco and punk."],
      ["Approach into changes", "A chromatic or diatonic step into the next root, usually on the last beat of the bar, announces the change and makes it feel inevitable."],
      ["Lock and split", "When the bass plays with the kick, the low end is unified. When it plays between kicks, the low end sounds busier. Use both across a section."],
    ],
    method: ["Write roots", "Choose rhythm per genre", "Add fifths and octaves", "Add approach notes", "Mark locks and splits with the kick"],
    check: [
      ["What does an approach note do?", "Leads into the next root."],
      ["How does bass rhythm change genre?", "Different rhythm patterns signal different styles."],
      ["What is a lock?", "Bass and kick hitting together."],
    ],
  },
  "16.3": {
    dive: [
      ["Pedal tone mechanics", "Holding one bass note while the harmony above changes creates a growing distance between the bass and the chords. The tension is released when the bass finally moves to a note that fits."],
      ["Countermelody principles", "Use contrary motion to the lead, different rhythm, and chord tones on strong beats so it supports as well as decorates."],
      ["The bass-only rewrite", "Keep chords and drums identical and write three bass lines. The differences in mood show how much the bass controls the music."],
      ["Choosing between doubling and independence", "Doubling the guitar riff strengthens a chorus; independence gives a verse depth. Switching between them is a form of arrangement."],
    ],
    method: ["Choose a progression", "Write a pedal version", "Write a walking version", "Write a rhythmic root version", "Compare the three moods"],
    check: [
      ["What happens when the pedal finally moves?", "The tension is released."],
      ["What motion makes a good countermelody?", "Contrary motion."],
      ["What does the bass-only rewrite reveal?", "How much the bass changes the mood."],
    ],
  },
  "16.4": {
    dive: [
      ["Frequency neighbours", "Kick fundamentals sit around 50 to 100 Hz and bass fundamentals overlap. If both sustain, they mask each other. Shorten one or offset them."],
      ["Four and five strings", "Four strings cover E1 upward. A fifth low B string reaches about 31 Hz and is mainly useful for heavy styles and low keys."],
      ["Register as colour", "Playing above the 12th fret gives a more vocal, rubbery tone. Low open strings give weight."],
      ["Avoid guitar-bass clashes", "If guitars play in the bass octave, they collide with the bass. Keep power chords and low notes out of the bass's range unless doubling on purpose."],
    ],
    method: ["Place kick and bass hits on a grid", "Decide which sustains", "Choose bass octave per section", "Check guitar low notes", "Decide whether you need a fifth string"],
    check: [
      ["Why do kick and bass mask each other?", "They share low frequencies."],
      ["What does a fifth string add?", "Lower notes."],
      ["How to avoid guitar-bass clashes?", "Keep guitars out of the bass octave."],
    ],
  },
  "17.1": {
    dive: [
      ["Building any major scale", "Apply whole-whole-half-whole-whole-whole-half from the root. Each key signature follows from that pattern; the circle of fifths lists the results."],
      ["Relative keys", "The relative minor starts on the sixth degree and uses the same notes. Parallel keys share a root but differ in notes."],
      ["Numbers as portable harmony", "Roman numerals capture quality (capitals for major, lowercase for minor). Nashville numbers capture only the degree and are quicker to write. Both let you transpose instantly."],
      ["Transposing on guitar", "Moving a progression to another key means shifting every shape by the same number of frets, unless open strings are involved."],
    ],
    method: ["Write a scale from the pattern", "Find its relative minor", "Write a progression as numbers", "Transpose to two keys", "Check ranges"],
    check: [
      ["What is the major scale pattern?", "Whole, whole, half, whole, whole, whole, half."],
      ["What is the relative minor?", "The scale starting on the sixth degree."],
      ["Why use numbers?", "They are key-independent."],
    ],
  },
  "17.2": {
    dive: [
      ["Ear training as pattern recognition", "Recognising intervals and chord qualities improves by using them in context. Pair each with a memory cue and practise short daily."],
      ["Transcription order", "Bass first because it holds harmony, then chords, then melody, then rhythm details. Slow the recording and loop short sections."],
      ["Charting", "A useful chart lists key, tempo, form, chords per bar and any special hits. Keep it to a page."],
      ["Checking yourself", "Play your transcription alongside the recording and listen for clashes."],
    ],
    method: ["Pick a short passage", "Loop it slowly", "Find the bass line", "Add chords", "Write a chart"],
    check: [
      ["Why transcribe bass first?", "It outlines the harmony."],
      ["What does a chart include?", "Key, tempo, form and chords."],
      ["How do you check a transcription?", "Play it against the recording."],
    ],
  },
  "17.3": {
    dive: [
      ["Equal temperament", "Dividing the octave into twelve equal semitones makes every key playable but makes thirds and fifths slightly impure compared with just intonation."],
      ["Tuning strategies", "Tune to a reference pitch, then check chords. If chords sound off even when strings read in tune, adjust by ear compromise."],
      ["Intonation", "Compare the 12th-fret note with the open string's harmonic. A difference means the bridge needs adjusting."],
      ["Shared reference", "A=440 Hz is standard. Make sure keyboards and backing tracks agree."],
    ],
    method: ["Tune with a tuner", "Check with chords", "Check intonation at the 12th fret", "Agree a reference with the band", "Re-check during sessions"],
    check: [
      ["Why are thirds slightly off in equal temperament?", "The system trades purity for flexibility."],
      ["How do you check intonation?", "Compare the 12th-fret note with the harmonic."],
      ["What is standard reference?", "A=440 Hz."],
    ],
  },
  "18.1": {
    dive: [
      ["The central idea", "One sentence stating what the song is about gives every line a test: does it serve the idea?"],
      ["Prosody in detail", "Stress, vowel length and rhythm of words should match musical stress. A stressed syllable on a weak beat sounds awkward; a long vowel on a short note sounds rushed."],
      ["Rhyme types", "Perfect rhyme matches the sound; slant rhyme shares part of it. Slant rhyme is less predictable and often sounds more natural."],
      ["Point of view effects", "First person is intimate, second person addresses the listener, third person observes."],
    ],
    method: ["Write the idea in one sentence", "Choose point of view", "Say each line rhythmically", "Mark stresses against beats", "Fix mismatches"],
    check: [
      ["What is prosody?", "Matching word stress to musical stress."],
      ["What is slant rhyme?", "Partial sound match."],
      ["Why state a central idea?", "It guides editing."],
    ],
  },
  "18.2": {
    dive: [
      ["Concrete detail", "A specific object, time or action carries emotion without naming it. Replace abstractions with images."],
      ["Where hooks live", "The hook often sits at the melodic peak and repeats. The title is frequently the hook."],
      ["Story across sections", "Verse one sets the scene, verse two develops it, chorus states the idea, bridge shifts perspective."],
      ["Repetition changes meaning", "The same line after new information means something different."],
    ],
    method: ["List abstract words in your draft", "Replace with images", "Choose the hook", "Place it at the melodic peak", "Outline each section's story job"],
    check: [
      ["What replaces abstractions?", "Concrete images."],
      ["Where does the hook often sit?", "At the melodic peak and in the title."],
      ["What does the bridge do?", "Shifts perspective."],
    ],
  },
  "18.3": {
    dive: [
      ["Editing order", "Cut first, sharpen second, polish last. Cutting reveals the real song."],
      ["Writing melody and words together", "Sing nonsense syllables to find the natural rhythm, then fit words. Or speak words and let the melody follow speech."],
      ["Singing as test", "Breath points, awkward vowels and stress problems show up only when sung."],
      ["Versions", "Keep drafts so you can recover earlier lines."],
    ],
    method: ["Cut a quarter of the draft", "Sharpen weak lines", "Sing it with a rough melody", "Mark breaths", "Save the version"],
    check: [
      ["What is the first editing step?", "Cut."],
      ["How to find a melody's rhythm?", "Sing nonsense syllables."],
      ["Why save drafts?", "To recover earlier lines."],
    ],
  },
  "19.1": {
    dive: [
      ["Headroom", "Digital peaks above full scale clip. Aim to record with peaks around minus 12 to minus 6 dBFS, leaving room for later processing."],
      ["Source quality", "Mic position, room, tuning and technique matter more than any plug-in."],
      ["Click and tempo", "Recording to a click makes layering and editing possible. Agree on tempo before recording."],
      ["Demo-first", "A rough full arrangement shows structural problems before you invest in polishing."],
    ],
    method: ["Set tempo and click", "Set input levels", "Record a rough full song", "Re-record the weakest part", "Check peaks"],
    check: [
      ["What peak level is a good target?", "Around minus 12 to minus 6 dBFS."],
      ["Why record a demo first?", "To find structural problems."],
      ["What matters more than plug-ins?", "Source quality."],
    ],
  },
  "19.2": {
    dive: [
      ["Mixing order", "Balance, pan, then EQ and compression. Many problems are solved by levels alone."],
      ["Subtractive EQ", "Cut the clashing frequencies in one instrument to make room rather than boosting the other."],
      ["Compression controls", "Threshold sets where it starts, ratio how much it reduces, attack how fast it reacts and release how fast it lets go. Slow attack preserves punch; fast attack controls peaks."],
      ["Checking in context", "Never EQ a part only in solo. Judge it in the mix."],
    ],
    method: ["Set faders", "Pan", "Cut one clashing frequency", "Compress one part gently", "Check in the full mix"],
    check: [
      ["What does a slow attack preserve?", "Transient punch."],
      ["Why cut instead of boost?", "To make room without adding level."],
      ["Why avoid solo-only EQ?", "Judging needs context."],
    ],
  },
  "19.3": {
    dive: [
      ["Space tools", "Reverb creates a sense of room; delay creates echo and width. Use less on lead vocal and bass, more on background parts."],
      ["Diagnosing", "If EQ cannot fix a hidden part, change the arrangement."],
      ["Referencing", "Match levels, then compare balance and low end."],
      ["Finishing", "Make a checklist, finish it, and release. Endless polishing rarely helps."],
    ],
    method: ["Add one reverb", "Mute test each part", "Compare with a reference", "List fixes", "Finish and export"],
    check: [
      ["Where use more reverb?", "On background parts."],
      ["When is it an arrangement problem?", "When EQ cannot fix masking."],
      ["Why match levels with a reference?", "Louder sounds better, which biases comparison."],
    ],
  },
  "20.1": {
    dive: [
      ["Keys parts", "Left hand low and sparse, right hand mid-range. Avoid doubling the guitar's voicing."],
      ["Strings", "Use smooth voice leading and keep each line singable; add high strings for air, low for weight."],
      ["Horns", "Short hits support rhythm; longer notes carry melody. Stay inside ranges."],
      ["Synth roles", "Pad, lead, bass, pluck. Pick one role per sound."],
    ],
    method: ["Choose an instrument", "Define its role", "Write sparse part", "Check range", "Remove overlap with guitars"],
    check: [
      ["What should the left hand do?", "Stay low and sparse."],
      ["What is a pad's role?", "Sustained harmony."],
      ["Why avoid doubling guitar voicings?", "It crowds the mix."],
    ],
  },
  "20.2": {
    dive: [
      ["Genre as bundle", "Tempo, feel, instrumentation, harmony, form and production together signal a genre."],
      ["Principle versus copy", "Take the principles and apply them to new material."],
      ["Breaking a convention", "Break one on purpose and keep the others so the song stays recognisable."],
      ["Blending", "Choose one or two defining traits from each genre."],
    ],
    method: ["List a genre's traits", "Pick which to keep", "Write your outline", "Break one convention", "Test recognisability"],
    check: [
      ["What makes a genre?", "A bundle of choices."],
      ["How to blend?", "Keep a few defining traits."],
      ["Why break only one convention?", "To stay recognisable."],
    ],
  },
  "21.1": {
    dive: [
      ["Routines", "Short regular sessions create momentum. Decide when and for how long."],
      ["Capturing", "Record every idea immediately and label it. Review weekly."],
      ["Constraints", "Limit modes, rhythms or chords to make decisions easier."],
      ["Separating making and judging", "Generate first, judge later."],
    ],
    method: ["Set a schedule", "Make an idea folder", "Pick a constraint", "Write without judging", "Review weekly"],
    check: [
      ["Why use constraints?", "They reduce decision load."],
      ["When to judge?", "After generating."],
      ["What is the benefit of short sessions?", "Consistent momentum."],
    ],
  },
  "21.2": {
    dive: [
      ["Band writing", "Bring a skeleton and let players fill their parts. Decide who has the final say."],
      ["Feedback", "Ask specific questions and look for patterns across responses."],
      ["Finishing", "Define finished, schedule steps, and release."],
      ["Body of work", "Review across songs to see your identity."],
    ],
    method: ["Write a skeleton", "Share charts", "Ask specific questions", "Define finished", "Release and review"],
    check: [
      ["What should you bring to a writing session?", "A clear skeleton."],
      ["What makes feedback useful?", "Specific questions."],
      ["What is the point of finishing?", "It teaches more than polishing."],
    ],
  },
};
