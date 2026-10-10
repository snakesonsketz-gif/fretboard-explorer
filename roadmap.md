# Fret Lab Roadmap (authoritative priority order)

Preserve all existing features (CAGED, customization, identifier, modes, playback, saving, tuning, fretboard, progression/song workspace, theory panels). Additive, connected theory functionality only. Never generate riffs, licks, solos, progressions or lyrics.

1. [x] CAGED Scale Positions — shape-labelled positions, legend, full scale mapped per shape (window ±1 fret), per-string degree map. Tested desktop+mobile.
2. [x] Ordered Scale Pathways — start degree, cyclic degree order, step badges, play button; vertical/horizontal/diagonal(3 strings × 3 notes). Diagonal is true 3-notes-per-string: the window only picks where the start note is found, later strings may drop below it; never skips a scale tone; stops (with a note) at the fret-range edge; moves an octave when an open-string start can't fit. Checked across every tuning, root, 5–8 note scale, start degree, string group and window (1.6M cases).
3. [ ] Chord-to-Scale Overlay — distinguish chord tones, extensions, and other scale tones. (Partial: chord tones vs scale tones; extensions not separated.)
4. [ ] Mode Comparison — compare parallel and relative modes, highlighting exact differences.
5. [ ] Connected Shape Navigator — move between positions without losing your place in the scale.
6. [ ] Theory Propagation — custom alterations update every connected view consistently.
7. [ ] Voice-Leading Analyzer — track common tones and movement between chords.
8. [ ] Advanced Harmony Lab — upper structures, shell voicings, rootless chords, altered harmony.
