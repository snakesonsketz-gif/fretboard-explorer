/**
 * Songwriting & composition course: the 23 modules, the lessons already delivered, and the
 * progress a student keeps on this device. Teaching outline only: the course never writes riffs,
 * licks, solos, progressions or lyrics for you (roadmap.md), so every assignment leaves the
 * creative choices to the student.
 */

export interface CourseModule {
  id: number;
  title: string;
  summary: string;
  topics: string[];
  /** Where in Fretlab this module can be tried. */
  tools: { label: string; to: "/" | "/jam" | "/tabs" | "/sequencer" | "/finder" | "/listen"; hint: string }[];
}

export const MODULES: CourseModule[] = [
  {
    id: 1,
    title: "Harmonic Language and Chord Construction",
    summary: "How chords are built, and how their construction changes mood and tension.",
    topics: [
      "Intervals and their harmonic qualities",
      "Triads and seventh chords",
      "Extensions: 9ths, 11ths and 13ths",
      "Altered chords",
      "Suspended chords",
      "Add chords and omitted tones",
      "Chord voicings and inversions",
      "How chord construction affects mood and tension",
    ],
    tools: [
      { label: "Explore: chords", to: "/", hint: "Pick a chord and read its formula; step through every voicing and inversion." },
      { label: "Chord finder", to: "/finder", hint: "Fret a shape and see every name it can have." },
    ],
  },
  {
    id: 2,
    title: "Tonic, Predominant, Subdominant and Dominant Functions",
    summary: "What each chord is doing in a key, and how to meet or break expectations.",
    topics: [
      "Tonic stability",
      "Predominant and subdominant movement",
      "Dominant tension and resolution",
      "Functional harmony",
      "Cadences",
      "Deceptive resolutions",
      "Harmonic expectations: fulfilling and subverting them",
    ],
    tools: [
      { label: "Explore: harmonise a scale", to: "/", hint: "The theory panels list each diatonic chord with its function." },
      { label: "Jam", to: "/jam", hint: "Hear a progression loop and watch the neck follow each chord." },
    ],
  },
  {
    id: 3,
    title: "Chord Relationships, Harmonic Rhythm and Voice Leading",
    summary: "Making progressions feel connected instead of like unrelated shapes.",
    topics: [
      "Diatonic chord relationships",
      "Harmonic rhythm",
      "Voice leading between chords",
      "Common tones",
      "Stepwise movement",
      "Bass movement",
      "Contextual chord function",
      "Connected progressions, not separate shapes",
    ],
    tools: [
      { label: "Jam", to: "/jam", hint: "Preview the next chord on the neck to see which notes stay." },
      { label: "Sequencer", to: "/sequencer", hint: "Change how long each chord lasts to feel harmonic rhythm." },
    ],
  },
  {
    id: 4,
    title: "Modes and Modal Composition",
    summary: "Modes as compositional languages: a tonal centre, characteristic tones and modal harmony.",
    topics: [
      "Establishing a modal center",
      "Ionian and Aeolian",
      "Dorian and Phrygian",
      "Lydian and Mixolydian",
      "Locrian",
      "Characteristic tones",
      "Modal chord progressions",
      "Pedal points and modal vamps",
      "Distinguishing a mode from its parent major scale",
      "Using modes to create recognizable musical identities",
      "Modal composition in rock, metal, blues and other styles",
    ],
    tools: [
      { label: "Explore: Scale → modes", to: "/", hint: "Parallel and Relative rows switch modes; the CAGED panel shows each mode's target notes." },
      { label: "Jam", to: "/jam", hint: "Loop a vamp and put a mode's scale over every chord." },
    ],
  },
  {
    id: 5,
    title: "Advanced Harmony and Chromaticism",
    summary: "Tension that still hangs together.",
    topics: [
      "Secondary dominants",
      "Borrowed chords and modal interchange",
      "Chromatic mediants",
      "Diminished and augmented harmony",
      "Tritone substitutions",
      "Passing chords",
      "Non-diatonic harmony",
      "Chromatic voice leading",
      "Tension without losing coherence",
    ],
    tools: [{ label: "Explore", to: "/", hint: "Try a chord and its substitutions in the theory panels." }],
  },
  {
    id: 6,
    title: "Melody Writing",
    summary: "Motifs, phrasing and aiming melody at chord tones.",
    topics: [
      "Motifs",
      "Melodic development",
      "Phrasing",
      "Contour",
      "Target notes",
      "Chord-tone emphasis",
      "Passing tones and approach notes",
      "Repetition and variation",
      "Melodic tension and resolution",
      "Writing melodies over changing harmony",
    ],
    tools: [
      { label: "Tabs", to: "/tabs", hint: "Write your own melody down as tab." },
      { label: "Jam", to: "/jam", hint: "Practise your melody against looping chords." },
    ],
  },
  {
    id: 7,
    title: "Rhythm and Groove",
    summary: "How rhythm changes the character of a progression or riff.",
    topics: [
      "Meter and time signatures",
      "Subdivision",
      "Syncopation",
      "Accents",
      "Polyrhythm and polymeter",
      "Rhythmic displacement",
      "Groove construction",
      "Rhythmic motifs",
      "How rhythm changes a progression or riff",
    ],
    tools: [
      { label: "Sequencer", to: "/sequencer", hint: "Time signatures, triplet grids and your own drum pattern." },
      { label: "Listen", to: "/listen", hint: "Check your timing against a click." },
    ],
  },
  {
    id: 8,
    title: "Guitar Composition, CAGED and Riff Construction",
    summary: "The fretboard as one connected instrument, then riffs built with purpose.",
    topics: [
      "The five CAGED forms: C, A, G, E and D",
      "How the five forms connect along the neck",
      "Shared notes and overlapping regions between positions",
      "Finding the same chord in different positions",
      "Roots and chord tones throughout the neck",
      "Chord shapes and their scale positions",
      "CAGED with arpeggios, triads and inversions",
      "Extensions and target notes through CAGED",
      "Moving between positions smoothly",
      "CAGED and the actual harmony, not disconnected shapes",
      "Progressions in different positions",
      "Riffs built around chord tones",
      "Connecting rhythm parts to lead melodies",
      "Developing solos from CAGED positions",
      "Fills and melodic transitions between chords",
      "Inversions and voice leading in guitar parts",
      "CAGED in different keys and tonal centres",
      "Riff motifs and rhythmic identity",
      "Pedal-tone, power-chord, single-note and chordal riffs",
      "Developing and transforming riffs; contrast between sections",
    ],
    tools: [
      { label: "Explore: CAGED", to: "/", hint: "Switch CAGED on: shapes, gold handover lines, compare table, relative keys, mode picker." },
      { label: "Tabs", to: "/tabs", hint: "Write the riff you compose." },
    ],
  },
  {
    id: 9,
    title: "Song Structure and Development",
    summary: "Sections, contrast, tension and keeping a song cohesive.",
    topics: [
      "Verse, chorus, pre-chorus, bridge, intro and outro",
      "Section contrast",
      "Repetition and variation",
      "Building and releasing tension",
      "Long-form development",
      "Transitions",
      "Memorable musical identities",
      "Avoiding unnecessary repetition",
      "Making a song feel cohesive",
    ],
    tools: [{ label: "Sequencer", to: "/sequencer", hint: "Lay out sections on a timeline." }],
  },
  {
    id: 10,
    title: "Drum Composition and Arrangement",
    summary: "Drum parts that support instead of crowd.",
    topics: [
      "Drum-set roles",
      "Kick, snare, hi-hat, cymbals and toms",
      "Groove construction",
      "Subdivisions and accents",
      "Fills and transitions",
      "Drum dynamics",
      "Drums and guitar riffs",
      "Different feels at the same tempo",
      "Parts that support rather than overcrowd",
    ],
    tools: [{ label: "Sequencer: drums", to: "/sequencer", hint: "Draw your own drum grid under the chords." }],
  },
  {
    id: 11,
    title: "Bass Composition",
    summary: "Foundations, movement and when bass reinforces or contrasts.",
    topics: [
      "Root-note foundations",
      "Bass movement and voice leading",
      "Locking in with the kick",
      "Counter-rhythms",
      "Passing notes",
      "Octaves and melodic bass lines",
      "Supporting guitar harmony",
      "Movement under static guitar parts",
      "Reinforcing versus contrasting the guitars",
    ],
    tools: [
      { label: "Explore: bass tunings", to: "/", hint: "Pick a bass tuning to see the same theory on four strings." },
      { label: "Sequencer", to: "/sequencer", hint: "Hear a bass idea against your drums." },
    ],
  },
  {
    id: 12,
    title: "Vocal Composition and Instrumentation",
    summary: "Vocal melody, space for the singer and how instruments set the genre.",
    topics: [
      "Vocal melody construction",
      "Vocal phrasing",
      "Register and range",
      "Harmonies and backing vocals",
      "Vocals and instruments together",
      "Leaving space for vocal melodies",
      "Instrumental responses and fills",
      "Instrument selection and identity",
      "How instrumentation shapes genre and emotion",
    ],
    tools: [{ label: "Listen", to: "/listen", hint: "Check pitch and timing as you sing or play." }],
  },
  {
    id: 13,
    title: "Full-Band Arrangement, Dynamics and Production",
    summary: "Arranging several instruments to get a specific, deliberate sound.",
    topics: [
      "Rhythm and lead guitar roles",
      "Multiple guitar parts",
      "Bass and drums together",
      "Vocal and instrumental interaction",
      "Keys, synths, strings and atmosphere",
      "Harmonised parts and octave doubling",
      "Countermelodies, call-and-response and unison",
      "Complementary rhythms and textures",
      "Deciding what each instrument contributes",
      "Registers, voicings and avoiding needless doubling",
      "Space, frequency and register overlap",
      "Dense arrangements that stay clear; sparse ones that feel intentional",
      "Target sounds: huge, dark, spacious, intimate, tight, expansive, chaotic, swaggering",
      "Layering, density, panning and separation",
      "Build-ups, breakdowns and dynamic transitions",
    ],
    tools: [{ label: "Sequencer", to: "/sequencer", hint: "Try the same chords with different drum feels and part lengths." }],
  },
  {
    id: 14,
    title: "Advanced Songwriting and Musical Analysis",
    summary: "Why songs work, and turning that into a personal voice.",
    topics: [
      "Analysing complete songs",
      "Why compositions work",
      "Harmonic, melodic and rhythmic devices",
      "Genre-specific writing techniques",
      "Combining theoretical concepts",
      "Developing a personal musical identity",
      "Evaluating and refining your own compositions",
      "Writing with intention, not habit",
    ],
    tools: [{ label: "Explore", to: "/", hint: "Check any chord or scale you meet while analysing." }],
  },
  {
    id: 15,
    title: "Drum Theory, Feel and Syncopation",
    summary: "Read and count rhythm, build grooves, and learn how drums and syncopation rewrite the music around them.",
    topics: [
      "Counting, notation and rhythm reading",
      "Straight, swung and shuffled feels",
      "Kick and snare placement as the song's identity",
      "Hi-hat, ride and ghost-note texture",
      "Syncopation: what it is and why it works",
      "How syncopation changes a riff or progression",
      "Half-time, double-time and feel changes",
      "Odd meters and metric tricks",
      "How drums change how harmony is heard",
      "Fills, breaks and silence as composition",
    ],
    tools: [
      { label: "Sequencer", to: "/sequencer", hint: "Program a groove, then move one kick or snare and hear the whole song change." },
      { label: "Jam", to: "/jam", hint: "Loop a progression and imagine each drum feel from this module on it." },
    ],
  },
  {
    id: 16,
    title: "How the Bass Changes the Music Around It",
    summary: "The bass note decides the chord's weight, the groove's feel and how the guitars are heard.",
    topics: [
      "The lowest note defines the chord",
      "Inversions and slash chords",
      "Root, fifth, octave and approach notes",
      "Bass rhythm and the groove",
      "Pedal tones under changing harmony",
      "Bass lines as countermelody",
      "Bass and kick: one low-end instrument",
      "Four-string versus five-string thinking",
      "Rewriting a song by changing only the bass",
    ],
    tools: [
      { label: "Explore: Bass 4 / Bass 5", to: "/", hint: "Switch the instrument to Bass and read the Bass view: the same chord with each note underneath." },
      { label: "Sequencer", to: "/sequencer", hint: "Hear a bass idea against your drums." },
    ],
  },
  {
    id: 17,
    title: "Theory Foundations, Ear Training and Notation",
    summary: "Keys, scales, number systems and ear skills that make every other module faster.",
    topics: [
      "Notes, scales, key signatures and the circle of fifths",
      "Major, minor and pentatonic scales in practice",
      "Roman numerals and Nashville numbers",
      "Interval and chord-quality ear training",
      "Transcribing by ear",
      "Reading and writing charts and tab",
      "Transposing songs",
      "Tuning, temperament and pitch basics",
    ],
    tools: [
      { label: "Explore", to: "/", hint: "Check keys, scales and degrees as you learn them." },
      { label: "Listen", to: "/listen", hint: "Check the pitch you play or sing while you work on ear skills." },
    ],
  },
  {
    id: 18,
    title: "Lyric Craft and Topline Writing",
    summary: "How words and melody fit, taught as craft. The course never writes your lyrics.",
    topics: [
      "Finding a subject and a point of view",
      "Prosody: matching words to music",
      "Rhyme, rhythm and sound patterns",
      "Imagery and specific detail",
      "Hooks and titles",
      "Verse, chorus and bridge as storytelling",
      "Editing lyrics",
      "Writing melody and words together",
    ],
    tools: [{ label: "Explore", to: "/", hint: "Find the chord colour that matches a mood before you write the words." }],
  },
  {
    id: 19,
    title: "Recording, Mixing and Production Basics",
    summary: "Turn a written song into a clear recording: workflow, balance, EQ, dynamics and space.",
    topics: [
      "Demo workflow and project setup",
      "Recording guitar, bass, drums and voice",
      "Gain staging",
      "Balance and panning",
      "EQ for clarity",
      "Compression and dynamics",
      "Reverb, delay and depth",
      "Arrangement versus mix problems",
      "Reference tracks and finishing",
    ],
    tools: [{ label: "Sequencer", to: "/sequencer", hint: "Sketch a drum and bass demo before recording real parts." }],
  },
  {
    id: 20,
    title: "Instruments, Orchestration and Genre",
    summary: "Writing for keys, strings, horns and synths, and learning a genre's rules to use or break them.",
    topics: [
      "Piano and keys parts",
      "Strings and pads",
      "Horns and woodwinds",
      "Synths, sound design and textures",
      "Acoustic versus electric choices",
      "Genre study: rules and conventions",
      "Writing in a genre without copying",
      "Blending genres",
    ],
    tools: [{ label: "Explore", to: "/", hint: "Find voicings that suit keys and strings, not only guitar." }],
  },
  {
    id: 21,
    title: "The Writing Process, Collaboration and Finishing",
    summary: "Habits, band workflow, feedback and getting songs done.",
    topics: [
      "A repeatable writing routine",
      "Capturing and organising ideas",
      "Overcoming creative blocks",
      "Writing with a band and co-writing",
      "Charts, rehearsal and communication",
      "Giving and taking feedback",
      "Finishing songs",
      "Building a body of work",
    ],
    tools: [{ label: "Jam", to: "/jam", hint: "Loop a section and try variations quickly." }],
  },
  {
    id: 22,
    title: "Genre Sounds and Guitar Voices",
    summary: "How each genre makes its sound, and how to study a player.",
    topics: [
      "Blues: blue notes and the major/minor clash",
      "Classic and hard rock: pentatonic, Mixolydian, power chords",
      "Metal: dark scales, tritones, palm-muted rhythm",
      "Alternative rock and grunge: open voicings and borrowed colour",
      "Funk and soul: 16th-note grooves and small voicings",
      "Bluegrass and country: chord tones and flatpicking",
      "Neoclassical and melodic virtuoso playing",
      "How to study a guitarist",
    ],
    tools: [
      { label: "Explore", to: "/", hint: "See each scale and mode on the neck." },
      { label: "Jam", to: "/jam", hint: "Loop a genre's chords and test its scales." },
    ],
  },
  {
    id: 23,
    title: "Guitarist Studies",
    summary: "One detailed study per guitarist: story, rig, scales, touch, role and what set them apart.",
    topics: [
      "Robert Johnson",
      "Muddy Waters",
      "Chuck Berry",
      "B.B. King",
      "Albert King",
      "Django Reinhardt",
      "Chet Atkins",
      "Wes Montgomery",
      "Duane Allman",
      "Derek Trucks",
      "Billy Strings",
      "Jimi Hendrix",
      "Eric Clapton",
      "Keith Richards",
      "Jimmy Page",
      "Jeff Beck",
      "David Gilmour",
      "Brian May",
      "Angus Young",
      "Tony Iommi",
      "Ritchie Blackmore",
      "Carlos Santana",
      "Mark Knopfler",
      "Eddie Van Halen",
      "Randy Rhoads",
      "Kirk Hammett",
      "James Hetfield",
      "Slash",
      "Dimebag Darrell",
      "Zakk Wylde",
      "Yngwie Malmsteen",
      "Steve Vai",
      "Joe Satriani",
      "Prince",
      "Nile Rodgers",
      "Stevie Ray Vaughan",
      "Johnny Marr",
      "The Edge",
      "Kurt Cobain",
      "Tom Morello",
      "Jack White",
      "John Frusciante",
      "John Mayer",
      "Guthrie Govan",
      "Joe Bonamassa",
    ],
    tools: [
      { label: "Explore", to: "/", hint: "See the scales and modes each player favoured." },
      { label: "Listen", to: "/listen", hint: "Train your ear on the intervals they lean on." },
    ],
  },
];

export interface DeliveredLesson {
  id: string;
  module: number;
  title: string;
  covered: string[];
  assignment: string[];
  /** Indexes into the module's topics this lesson finished. */
  topics: number[];
}

/** Lessons already taught in chat. */
export const DELIVERED: DeliveredLesson[] = [
  {
    id: "4.1",
    module: 4,
    title: "Establishing a Modal Center",
    covered: [
      "A pitch collection versus a tonal center",
      "E Phrygian (E F G A B C D) against C major",
      "Making E the center with bass, melody, harmony, metric emphasis and phrase endings",
      "Characteristic tones; the ♭II–i movement (F to Em)",
      "Pedal points and harmonic stasis",
    ],
    assignment: [
      "Compose an eight-bar E Phrygian passage",
      "One version with Em/F movement, one over an E pedal",
      "A melody that emphasises E, F and G",
      "A simple band arrangement",
    ],
    topics: [0, 5, 7],
  },
  {
    id: "4.2",
    module: 4,
    title: "Dorian versus Aeolian",
    covered: [
      "A Dorian (with F♯) against A Aeolian (with F)",
      "Major IV versus minor iv; Bm versus B diminished",
      "Dorian and Aeolian vamps; emphasising the characteristic sixth",
      "Why A minor pentatonic does not tell the modes apart",
      "Guitar voicings and band applications",
    ],
    assignment: [
      "Paired Dorian and Aeolian progressions",
      "Melodies using F♯ versus F natural",
      "An eight-bar arrangement",
      "Explain how the tonal center is established",
    ],
    topics: [1, 2],
  },
  {
    id: "4.3",
    module: 4,
    title: "Lydian versus Ionian",
    covered: [
      "C Ionian against C Lydian; the raised fourth and the tritone",
      "Cmaj7(♯11) and Lydian's diatonic triads",
      "Why D7 to G can pull the ear to G, and how C pedal points, phrase endings and F♯ keep C as home",
      "Voicings x32002 (Cmaj7♯11) and x30232 (D/C)",
      "Full-band applications",
    ],
    assignment: [
      "Compare Ionian and Lydian",
      "Write an eight-bar melody",
      "Create a pedal-point passage",
      "Develop a three-stage full-band arrangement",
    ],
    topics: [],
  },
];

/** The next planned lesson if the student carries straight on. */
export const NEXT_PLANNED = {
  id: "4.4",
  module: 4,
  title: "Mixolydian versus Ionian",
  topics: [
    "Major tonal centres with a minor seventh",
    "The ♭7 as Mixolydian's characteristic tone",
    "I–♭VII relationships",
    "Dominant-seventh tonic sounds",
    "Why Mixolydian does not always need dominant-to-tonic resolution",
    "Major pentatonic, Mixolydian and blues vocabulary",
    "Mixolydian in blues, classic rock, hard rock and heavy music",
    "A Mixolydian riff: modal harmony versus just borrowing a flat seventh",
  ],
  finishes: [3],
};

/** Every lesson has these ten parts. */
export const LESSON_FORMAT = [
  "Title and learning objectives",
  "Conceptual explanation",
  "Technical theory",
  "Concrete musical examples",
  "Guitar application",
  "Full-band application when relevant",
  "Why the concepts work",
  "Common mistakes and misunderstandings",
  "Composition assignment",
  "A short preview of the next lesson",
];

/** How Module 8's CAGED topics map to what the Explore tab's CAGED panel shows. */
export const CAGED_CROSSWALK: { topic: string; where: string }[] = [
  { topic: "Five forms and how they connect", where: "Shape buttons, the gold lines where one shape takes over, and the 'Next:' line" },
  { topic: "Shared notes between positions", where: "'Next:' line: overlapping frets and how many notes are shared" },
  { topic: "Same chord in different positions", where: "Chord layer: each shape's real chord form (e.g. Em-form), slid up the neck" },
  { topic: "Why each shape is where it is", where: "'Why the … shape here' line and the Compare table (root position, slide, notes per shape)" },
  { topic: "Chord shapes and scale positions", where: "Layer buttons: add the scale or arpeggio over the same shape; 1–7 labels" },
  { topic: "Target notes and extensions", where: "Mode row: target notes of each mode and what changes when you switch" },
  { topic: "Different keys and tonal centres", where: "'Relative keys and moving the shapes': relative major/minor and the parent key for each mode" },
];

// ------------------------------------------------------------------ progress

export type Plan = "foundation" | "continue" | "custom";

export interface Progress {
  /** "module.topicIndex" -> true */
  topics: Record<string, boolean>;
  /** lesson id -> ISO date it was marked done ("" when the date is not known) */
  lessons: Record<string, string>;
  /** The student's own notes per module (assignment ideas, drafts): stays on this device. */
  notes: Record<string, string>;
  plan: Plan | null;
  customModule: number;
}

export const topicKey = (module: number, index: number) => `${module}.${index}`;

export function defaultProgress(): Progress {
  const topics: Record<string, boolean> = {};
  const lessons: Record<string, string> = {};
  for (const l of DELIVERED) {
    lessons[l.id] = "";
    for (const t of l.topics) topics[topicKey(l.module, t)] = true;
  }
  return { topics, lessons, notes: {}, plan: null, customModule: 1 };
}

export function sanitizeProgress(raw: unknown): Progress {
  const base = defaultProgress();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Progress>;
  const rec = <T,>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> => {
    const out: Record<string, T> = {};
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (ok(x)) out[k] = x;
    return out;
  };
  return {
    topics: { ...base.topics, ...rec(r.topics, (x): x is boolean => typeof x === "boolean") },
    lessons: { ...base.lessons, ...rec(r.lessons, (x): x is string => typeof x === "string") },
    notes: rec(r.notes, (x): x is string => typeof x === "string"),
    plan: r.plan === "foundation" || r.plan === "continue" || r.plan === "custom" ? r.plan : null,
    customModule: typeof r.customModule === "number" && r.customModule >= 1 && r.customModule <= MODULES.length ? r.customModule : 1,
  };
}

const KEY = "fretlab.course.v1";

export function loadProgress(): Progress {
  try {
    return sanitizeProgress(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lasts until the page closes */
  }
}

export function moduleProgress(m: CourseModule, p: Progress) {
  const done = m.topics.filter((_, i) => p.topics[topicKey(m.id, i)]).length;
  return { done, total: m.topics.length, pct: m.topics.length ? Math.round((done / m.topics.length) * 100) : 0 };
}

export function overallProgress(p: Progress) {
  let done = 0;
  let total = 0;
  for (const m of MODULES) {
    const x = moduleProgress(m, p);
    done += x.done;
    total += x.total;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Modules 1–3 not yet finished, which is the gap the plan choice is about. */
export function foundationGap(p: Progress): number[] {
  return MODULES.filter((m) => m.id <= 3 && moduleProgress(m, p).done < m.topics.length).map((m) => m.id);
}

export interface NextUp {
  module: number;
  title: string;
  /** Specific lesson topics when this is a planned lesson, otherwise the module's next uncovered topics. */
  points: string[];
  /** The lesson id when it is a planned lesson. */
  lessonId?: string;
  /** Topic indexes finishing it ticks off. */
  finishes: number[];
}

/** What to study next under the chosen plan (null until a plan is picked, or when everything is done). */
export function nextUp(p: Progress): NextUp | null {
  const firstOpen = (from: number): number | null => {
    for (let i = 0; i < MODULES.length; i++) {
      const m = MODULES[(from - 1 + i) % MODULES.length]!;
      if (moduleProgress(m, p).done < m.topics.length) return m.id;
    }
    return null;
  };
  if (!p.plan) return null;
  if (p.plan === "continue" && !p.lessons[NEXT_PLANNED.id])
    return { module: NEXT_PLANNED.module, title: `Module ${NEXT_PLANNED.module}, Lesson 4: ${NEXT_PLANNED.title}`, points: NEXT_PLANNED.topics, lessonId: NEXT_PLANNED.id, finishes: NEXT_PLANNED.finishes };
  const start = p.plan === "foundation" ? 1 : p.plan === "custom" ? p.customModule : NEXT_PLANNED.module;
  const id = firstOpen(start);
  if (id === null) return null;
  const m = MODULES.find((x) => x.id === id)!;
  const open = m.topics.map((t, i) => ({ t, i })).filter(({ i }) => !p.topics[topicKey(id, i)]);
  const take = open.slice(0, 3);
  return { module: id, title: `Module ${id}: ${take[0]!.t}`, points: take.map((x) => x.t), finishes: take.map((x) => x.i) };
}

/** A message to paste into the chat so the next daily lesson follows the course format. */
export function lessonRequest(n: NextUp): string {
  return [
    `Teach me the next course lesson: ${n.title}.`,
    `Cover: ${n.points.join("; ")}.`,
    `Use the ten-part lesson format, guitar and full-band applications, and a composition assignment that leaves the creative choices to me (no finished riffs, progressions or lyrics).`,
  ].join(" ");
}
