import type { Lesson } from "./types";
import { M1 } from "./m01";
import { M2 } from "./m02";
import { M3 } from "./m03";
import { M4 } from "./m04";
import { M5 } from "./m05";
import { M6 } from "./m06";
import { M7 } from "./m07";
import { M8 } from "./m08";
import { M9 } from "./m09";
import { M10 } from "./m10";
import { M11 } from "./m11";
import { M12 } from "./m12";
import { M13 } from "./m13";
import { M14 } from "./m14";

export type { Lesson, Idea, Source } from "./types";
export { SOURCES } from "./sources";

export const LESSONS: Lesson[] = [...M1, ...M2, ...M3, ...M4, ...M5, ...M6, ...M7, ...M8, ...M9, ...M10, ...M11, ...M12, ...M13, ...M14];

export const lessonsFor = (module: number): Lesson[] => LESSONS.filter((l) => l.module === module);
export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
