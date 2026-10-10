# Fret Lab Roadmap (authoritative priority order)

Preserve all existing features (CAGED, customization, identifier, modes, playback, saving, tuning, fretboard, progression/song workspace, theory panels). Additive, connected theory functionality only. Never generate riffs, licks, solos, progressions or lyrics.

1. [x] CAGED Scale Positions — shape-labelled positions, legend, full scale mapped per shape (window ±1 fret), per-string degree map. Tested desktop+mobile.
2. [x] Ordered Scale Pathways — start degree, cyclic degree order, step badges, play button; vertical/horizontal/diagonal(3 strings × 3 notes). Diagonal is true 3-notes-per-string: the window only picks where the start note is found, later strings may drop below it; never skips a scale tone; stops (with a note) at the fret-range edge; moves an octave when an open-string start can't fit. Checked across every tuning, root, 5–8 note scale, start degree, string group and window (1.6M cases).
3. [x] Chord-to-Scale Overlay — chord tones (function colours), extensions (green, labelled 9/11/13, b3→#9 / b5→#11 over a chord that owns the letter), other scale tones (small grey: a half step above a guide tone). Scale view has an explicit "Over" chord: the scale's own chord (default) / the Chords-tab chord / off; CAGED scale & arpeggio layers and the Tensions panel use the same overlay. Fixed: scale view used to be coloured against a hidden Chords-tab chord. Tests: tests/overlay.test.ts.
4. [ ] Mode Comparison — compare parallel and relative modes, highlighting exact differences.
5. [ ] Connected Shape Navigator — move between positions without losing your place in the scale.
6. [ ] Theory Propagation — custom alterations update every connected view consistently.
7. [ ] Voice-Leading Analyzer — track common tones and movement between chords.
8. [ ] Advanced Harmony Lab — upper structures, shell voicings, rootless chords, altered harmony.

# Master plan progress (Sequencer / Listen expansion)

Approved order: tests → tabs → shared timing engine → chord sequencer → drum sequencer → MIDI export → Listen mode → piano / practice history / polish. `v1-original` branch = the app before this work, untouched.

- [x] Test suite — `bun run test` (tests/ — outside src/, not part of the app build).
- [x] Tabs — Explore / Sequencer / Listen (src/components/AppShell.tsx).
- [x] Shared timing engine — src/lib/timeline.ts (pure: ticks @ 480 PPQ, time signatures, chord start ≠ duration, drum patterns that loop under longer chord parts, count-in, one event list for playback + MIDI) and src/lib/engine.ts (one Tone.js transport; lazy-loaded). Measured in Chromium: 0.000 ms event error, exact loop period, clean tempo changes.
- [x] Chord sequencer — /sequencer: palette from Explore "Save" + song chords + quick add; tap to place, drag to move, drag edge to resize, inspector (move/length presets/until next/repeat/swap/remove), undo, tempo (tap), time signature (chords keep bar positions), measures, snap grid incl. triplets, loop, count-in, click, strum, zoom/fit, saved sequences, import a Song-workspace song, auto-saved draft. Sequences are stored separately from songs (a timed arrangement vs. a song sheet) but use the same chord data and import songs.
- [x] Drum sequencer — grid under the chord timeline on the same clock: kick/snare/closed+open hat/clap/rim/toms (+ crash, ride, add/remove lanes); Hit/Accent/Soft/Erase tools, drag-paint with a mouse, tap on phones; own length (1–16 bars) and grid (beats/½/triplets/¼), loops under the chords (or is cut, with a note); mute/solo, volume, nudge a lane's hits earlier/later; your own sample per lane (IndexedDB, stays on the device); step playhead. No preset grooves (master plan: don't generate material). Not yet: open-hat choke, per-hit gate length.
- [ ] MIDI export · [ ] Listen mode · [ ] Song workspace play-through → shared engine (still on its own timer) · [ ] keep a fretboard voicing with saved chords.
