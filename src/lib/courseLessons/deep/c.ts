import type { DeepMap } from "./index";

export const DEEP_C: DeepMap = {
  "6.1": {
    dive: [
      ["What makes a motif stick", "A short cell with a distinctive rhythm and a clear contour. Rhythm is usually remembered more than pitch, so a motif can survive changing notes if its rhythm stays."],
      ["Development techniques in detail", "Repetition keeps identity. Sequence repeats the shape at a different pitch level. Inversion flips the direction of each interval. Augmentation lengthens durations, diminution shortens them. Fragmentation uses only part of the motif. Extension adds notes. Each changes one dimension while preserving others."],
      ["The one-change rule", "Change pitch and rhythm together and the motif is gone. Change one and the ear hears a relative. This is the control that lets you vary without losing the song's identity."],
      ["Across a song", "State the motif in the first section, vary it in the second, transform it in the bridge, and bring it back in recognisable form at the end. The listener experiences a story."],
    ],
    method: ["Write a motif of three to six notes", "Mark its rhythm and contour", "Apply one development technique", "Keep what stayed the same", "Place variants across sections"],
    check: [
      ["What is a sequence?", "Repeating a motif at a different pitch level."],
      ["Which is usually remembered more, rhythm or pitch?", "Rhythm."],
      ["Why change only one thing at a time?", "To keep the motif recognisable."],
    ],
  },
  "6.2": {
    dive: [
      ["Phrase structure", "Phrases are often two or four bars. A question-and-answer pair (antecedent and consequent) is the most common shape. The first ends with an open feeling, the second with a closed one."],
      ["Contour types", "Arch (rise then fall), inverted arch, ascending, descending, wave and plateau. Most memorable melodies have one clear peak, which is where emotion concentrates."],
      ["Leap and step", "After a leap, the ear expects the melody to turn back by step in the opposite direction. Honouring that makes leaps feel natural; ignoring it makes them feel dramatic."],
      ["Breath and space", "Melodies need rests. The silence gives the previous phrase time to register and gives the arrangement room."],
    ],
    method: ["Draw the contour first", "Place the highest note", "Divide into phrases with breath points", "Fill in notes obeying leap-then-step", "Write an answer phrase that differs at the end"],
    check: [
      ["What is an antecedent phrase?", "A first phrase that ends open, asking for an answer."],
      ["What should follow a large leap?", "A step in the opposite direction."],
      ["Why have one high point?", "It focuses the emotional peak."],
    ],
  },
  "6.3": {
    dive: [
      ["Strong beats and chord tones", "Notes on strong beats are heard as structural. If they are chord tones, the melody agrees with the harmony. Notes on weak beats can be non-chord tones that move by step."],
      ["Types of non-chord tones", "Passing tones connect two chord tones by step. Neighbour tones step away and back. Appoggiaturas land on a strong beat and resolve by step, creating intentional tension. Suspensions hold a note over a chord change and resolve down."],
      ["Approach notes", "Stepping to a target from above or below, or from both sides, adds direction. A chromatic approach from a half step below is the strongest."],
      ["Targets in practice", "Choose targets per chord, usually the 3rd or 7th on important beats, then fill in. This is how improvised and composed lines both sound purposeful."],
    ],
    method: ["Write the chord progression", "Pick a target note per chord", "Place it on a strong beat", "Connect targets with passing notes", "Add one approach note and one appoggiatura"],
    check: [
      ["What is an appoggiatura?", "A non-chord tone on a strong beat that resolves by step."],
      ["Which chord tones show a chord best?", "The 3rd and 7th."],
      ["Why use targets?", "They give a line direction."],
    ],
  },
  "6.4": {
    dive: [
      ["Tension notes", "Notes outside the chord (2nd, 4th, 6th, 7th depending on chord) create lean. Resolution by step to a chord tone releases it. The length of the delay controls how intense it feels."],
      ["The held note", "A single pitch held across chord changes takes on a different meaning with each chord. It is an easy way to unify a melody while the harmony moves."],
      ["Following versus ignoring chords", "A melody that follows chord tones sounds clear. One that moves independently sounds modern or floating. Use both."],
      ["Check against the bass", "A melody note that clashes with the bass by a half step sounds wrong unless intended. Always test against the bass."],
    ],
    method: ["Choose a note to hold across chords", "Name its role in each chord", "Add a tension note and resolve it", "Write an alternate version that follows chord tones", "Compare them"],
    check: [
      ["What happens when you hold a note across chords?", "Its harmonic role changes with each chord."],
      ["How to resolve a tension?", "By step to a chord tone."],
      ["Why check against the bass?", "To avoid unintended clashes."],
    ],
  },
  "7.1": {
    dive: [
      ["Metre is hierarchy", "Beats are not equal. In 4/4 beat 1 is strongest, 3 is next, 2 and 4 are weakest. Accents and note choices reinforce or contradict this hierarchy."],
      ["Simple and compound", "Simple metres divide beats into two (4/4, 3/4). Compound metres divide them into three (6/8, 9/8, 12/8). 6/8 has two main beats with three eighths each."],
      ["Subdivision choice", "The fastest subdivision you feel sets the sense of speed. Playing sixteenths over a slow tempo feels busy; eighths over the same tempo feel relaxed."],
      ["Accent as shape", "Accenting different notes in the same pattern makes different riffs. It is the quickest way to vary without changing pitches."],
    ],
    method: ["Pick a time signature and count it", "Choose a subdivision", "Write a one-bar pattern", "Move the accents to three different places", "Describe each version"],
    check: [
      ["What is the strongest beat in 4/4?", "Beat 1."],
      ["How does 6/8 differ from 3/4?", "6/8 groups in two beats of three; 3/4 in three beats of two."],
      ["How can accents change a riff?", "They alter which notes the ear treats as important."],
    ],
  },
  "7.2": {
    dive: [
      ["Types of syncopation", "Off-beat accents, tied notes across strong beats, and rests on strong beats. Each leaves the expected beat unstated while the listener keeps the pulse."],
      ["Polyrhythm", "Two cycles with different divisions over the same span, such as three against two. They line up at the start and end of the cycle."],
      ["Polymeter", "Patterns of different lengths looping together, such as a five-beat figure against a four-beat bar. They drift and realign after the lowest common multiple."],
      ["Displacement", "Shift a pattern by a beat or subdivision. The pattern is the same but lands against a different part of the bar, changing its relation to the downbeat."],
    ],
    method: ["Write a short pattern", "Shift it by an eighth", "Layer a three-note cycle over a four-beat pulse", "Identify when they realign", "Keep one instrument on the pulse"],
    check: [
      ["When do 3-against-2 cycles realign?", "At the start of the next shared cycle."],
      ["What is displacement?", "Moving a pattern to a different position in the bar."],
      ["Why keep one pulse?", "It anchors the listener."],
    ],
  },
  "7.3": {
    dive: [
      ["Groove as interlocking", "Each part occupies a slot: kick low and sparse, snare on backbeats, hats as subdivisions, bass locking with the kick, guitars filling gaps. A groove emerges from the fit, not from complexity."],
      ["Micro-timing", "Playing slightly early feels urgent, late feels relaxed, exactly on feels tight. Small timing differences between instruments give character."],
      ["Rhythmic motifs", "Repeat a short rhythm across sections so the song has rhythmic identity independent of pitch."],
      ["Rewriting with rhythm", "Take the same chords and change only the rhythm: sustained pads, staccato stabs, syncopated strums. The song changes character completely."],
    ],
    method: ["Choose a progression", "Write three rhythm treatments", "Assign each instrument a slot", "Add a rhythmic motif", "Test timing feel (early, on, late)"],
    check: [
      ["What makes a groove?", "Parts that interlock in distinct slots."],
      ["What does playing late do?", "Creates a relaxed feel."],
      ["Why use a rhythmic motif?", "It gives the song identity."],
    ],
  },
  "8.1": {
    dive: [
      ["Why these five shapes", "The open C, A, G, E and D chords, each moved up by a barre, produce the same chord in five places. Together they cover the whole neck because the interval pattern of standard tuning repeats."],
      ["Order and gaps", "Going up the neck, the shapes appear in the order C, A, G, E, D and then start again. Each shape's end overlaps the next shape's start, so there are no gaps."],
      ["Reading the root", "Each shape has the root on a specific string (C on the A string, A on the A string, G on the low E, E on the low E, D on the D string). Finding the root first tells you which shape you are in."],
      ["Beyond chords", "The same five regions hold scales and arpeggios. The chord shape is a landmark in a larger map."],
    ],
    method: ["Pick a chord", "Find it in each of the five shapes", "Mark the root in each", "Say the order going up", "Check each against Explore's CAGED view"],
    check: [
      ["What order do shapes follow going up?", "C, A, G, E, D, then C again."],
      ["Why do the shapes overlap?", "So no fret is uncovered."],
      ["What identifies the current shape?", "Where its root sits."],
    ],
  },
  "8.2": {
    dive: [
      ["Overlap regions", "Neighbouring shapes share notes in the fret range where they meet. Holding one of these shared notes as you move gives continuity."],
      ["Handover line", "The gold line marks where one shape's patch ends and the next begins. Crossing it means changing position."],
      ["Sliding technique", "Slide with one finger on a shared note and let the rest of the hand follow. This avoids the jump that breaks a musical line."],
      ["Choosing a region", "Low regions give weight, high ones give brightness. Pick based on the song's section and what other instruments occupy."],
    ],
    method: ["Pick two neighbouring shapes", "Find the shared notes", "Slide while holding one", "Repeat in the opposite direction", "Choose a region for a verse and a chorus"],
    check: [
      ["What does the gold line show?", "Where one shape hands over to the next."],
      ["Why hold a shared note?", "It keeps the line continuous."],
      ["How does region affect sound?", "Low is heavier, high is brighter."],
    ],
  },
  "8.3": {
    dive: [
      ["Chord tones as dots", "Within each shape the chord tones are fixed positions. Playing only them gives an arpeggio native to that region."],
      ["Triads on string sets", "Three adjacent strings give a triad. On four string sets you get three inversions each, and moving between them keeps the sound close."],
      ["Inversion as voice-leading", "Choose the inversion where top and bass notes move least. This is the guitar equivalent of smooth keyboard voicings."],
      ["Link with targets", "Landing a melody on the chord tones in a region guarantees consonance with the chord."],
    ],
    method: ["Choose a chord and a region", "Mark the chord tones", "Play the arpeggio slowly", "Play the triads on three string sets", "Name each inversion"],
    check: [
      ["How many inversions does a triad have?", "Three positions: root, first, second."],
      ["What is an arpeggio?", "The chord tones played one at a time."],
      ["Why choose the nearest inversion?", "Smoothest voice leading."],
    ],
  },
  "8.4": {
    dive: [
      ["Locating extensions", "The 9th is a step above the root, 13th a step above the 5th. In each shape these have fixed neighbours. Knowing which fret is next to the root or 5th lets you add colour precisely."],
      ["Mode relabelling", "Changing mode changes which note is 1, not which frets are in the scale. Parent key shapes still apply."],
      ["Modes and targets", "Targets are the mode's own 1, 3, 5 and 7. They change when you change mode even though the notes may be the same."],
      ["Parent key view", "Switching Explore to 'Shapes from parent key' shows the major-key shapes that contain the mode, which is the easiest way to move modes across the neck."],
    ],
    method: ["Pick a mode and root", "Find its parent key", "Open the parent's shapes", "Mark the mode's home note", "Land phrases on the targets"],
    check: [
      ["What changes when you change modes on the same notes?", "The home note and the targets."],
      ["Where is the 9th?", "A step above the root."],
      ["Why use parent key shapes?", "They contain all the mode's notes."],
    ],
  },
  "8.5": {
    dive: [
      ["Skeleton and flesh", "A riff is a skeleton of chord tones on strong beats, with passing and neighbour notes as flesh. Writing the skeleton first keeps the riff tied to the harmony."],
      ["Implying harmony", "A riff that outlines the root, third and fifth over several beats suggests a chord with no chord played. This lets one guitar carry harmony and rhythm."],
      ["Rhythm and lead relationships", "Lead lines can echo, answer or extend the rhythm guitar's pattern. Matching rhythm creates unity; contrasting creates dialogue."],
      ["Register", "Moving a riff an octave or into a different CAGED region changes weight without changing notes."],
    ],
    method: ["Choose chords", "Pick chord tones for strong beats", "Add passing notes between", "Choose the rhythm", "Test in two regions"],
    check: [
      ["What is a riff skeleton?", "The chord tones on strong beats."],
      ["How can a riff imply a chord?", "By outlining its chord tones."],
      ["How does register change a riff?", "It alters weight and brightness."],
    ],
  },
  "8.6": {
    dive: [
      ["Riff types", "Pedal-tone riffs repeat the root with moving notes above. Power-chord riffs move fifths. Single-note riffs follow melodic lines. Chordal riffs use full voicings. Each leaves different space for other parts."],
      ["Transformation", "Change register, rhythm, density or harmony. Keep one element (rhythm or contour) constant so the riff stays recognisable."],
      ["Fills", "A fill connects the end of one phrase to the start of the next. Aim it at a chord tone of the next chord."],
      ["Voice leading in guitar parts", "Choose inversions so the top note moves by step through the progression. It makes rhythm parts sound melodic."],
    ],
    method: ["Pick a riff type", "Write the riff", "Transform it for a new section by changing two elements", "Write a fill ending on the next chord's 3rd", "Check the top note's motion"],
    check: [
      ["Name four riff types.", "Pedal-tone, power-chord, single-note and chordal."],
      ["What should stay constant in a transformation?", "One recognisable element."],
      ["Where should a fill aim?", "At a chord tone of the next chord."],
    ],
  },
};
