import path from "node:path";

export const DEFAULT_EXTRACTED_FILES_PATH = String.raw`D:\Games\PC\Dog Witch\Demo\v0.9.276`;

export const DATA_PATH = path.resolve(import.meta.dirname, "..", "data");

/** These correspond to the subdirectories in the "equipment" directory. */
export const EQUIPMENT_TYPES = [
  "bones",
  "books",
  "curses",
  "hats",
  "jewelry-bracelets",
  "jewelry-necklaces",
  "jewelry-rings",
  "spells",
  "summons",
  "wands",
] as const;
