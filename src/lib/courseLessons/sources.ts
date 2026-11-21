import type { Source } from "./types";

/** Reading list per module. Lessons are paraphrased; links go to each site's home so none can be stale: search the title there. */
export const SOURCES: Record<number, Source[]> = {
  1: [
    { title: "Premier Guitar: The CAGED system", url: "https://www.premierguitar.com/" },
    { title: "Berklee Online: voice leading for guitar", url: "https://online.berklee.edu/" },
  ],
  2: [
    { title: "Open Music Theory: cadences and function", url: "https://viva.pressbooks.pub/" },
  ],
  3: [
    { title: "Berklee Online: voice-leading paradigms", url: "https://online.berklee.edu/" },
    { title: "Native Instruments: voice leading", url: "https://blog.native-instruments.com/" },
  ],
  4: [
    { title: "Open Music Theory: modal schemas", url: "https://viva.pressbooks.pub/" },
    { title: "Ethan Hein: modes", url: "https://www.ethanhein.com/" },
  ],
  5: [
    { title: "Hooktheory: tritone substitutions", url: "https://www.hooktheory.com/" },
    { title: "MusicRadar: chromatic mediants", url: "https://www.musicradar.com/" },
  ],
  6: [
    { title: "Berklee Online: melody tools", url: "https://online.berklee.edu/" },
    { title: "Soundfly: motivic development", url: "https://flypaper.soundfly.com/" },
  ],
  7: [
    { title: "Berklee: two cool rhythmic devices", url: "https://online.berklee.edu/" },
    { title: "Sweetwater: syncopation and displacement", url: "https://www.sweetwater.com/" },
  ],
  8: [
    { title: "Premier Guitar: guitarist's guide to CAGED", url: "https://www.premierguitar.com/" },
    { title: "Guitar Player: CAGED", url: "https://www.guitarplayer.com/" },
  ],
  9: [
    { title: "Native Instruments: song structure 101", url: "https://blog.native-instruments.com/" },
    { title: "Ableton: common song forms", url: "https://makingmusic.ableton.com/" },
  ],
  10: [
    { title: "Sweetwater: drum arrangement", url: "https://www.sweetwater.com/" },
  ],
  11: [
    { title: "iZotope: bass grooves", url: "https://www.izotope.com/" },
    { title: "Guitar World: a guitarist's guide to bass", url: "https://www.guitarworld.com/" },
  ],
  12: [
    { title: "BMI: range versus tessitura", url: "https://www.bmi.com/" },
  ],
  13: [
    { title: "iZotope: frequency masking", url: "https://www.izotope.com/" },
    { title: "Sound on Sound: layering guitars", url: "https://www.soundonsound.com/" },
  ],
  14: [
    { title: "Open Music Theory", url: "https://viva.pressbooks.pub/" },
  ],
};
