import type { Deep } from "../types";
import { DEEP_A } from "./a";
import { DEEP_B } from "./b";
import { DEEP_C } from "./c";
import { DEEP_D } from "./d";
import { DEEP_E } from "./e";
import { DEEP_F } from "./f";

export type DeepMap = Record<string, Deep>;
export const DEEP: DeepMap = { ...DEEP_A, ...DEEP_B, ...DEEP_C, ...DEEP_D, ...DEEP_E, ...DEEP_F };
