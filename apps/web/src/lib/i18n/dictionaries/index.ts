import { en } from "./en";
import { az } from "./az";
import { ru } from "./ru";
import type { LocaleCode } from "../locales";

export type { TranslationKey } from "./en";

export const DICTIONARIES = { en, az, ru } satisfies Record<LocaleCode, Record<string, string>>;
