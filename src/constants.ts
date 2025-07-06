import path from "node:path";
import { getPath } from "windows-shortcuts-ps";
import type { EquipmentType } from "./equipment.js";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

const WINDOWS_SHORTCUT_PATH = path.join(
  PROJECT_ROOT,
  "current-version-files.lnk",
);

export const DEFAULT_EXTRACTED_FILES_PATH =
  process.platform === "win32" ? await getPath(WINDOWS_SHORTCUT_PATH) : ".";

export const DATA_PATH = path.resolve(PROJECT_ROOT, "data");

/** These correspond to the subdirectories in the "equipment" directory. */
export const EQUIPMENT_TYPE_TO_DIRECTORY_NAME = {
  bone: "bones",
  book: "books",
  curse: "curses",
  hat: "hats",
  bracelet: "jewelry-bracelets",
  necklace: "jewelry-necklaces",
  ring: "jewelry-rings",
  spell: "spells",
  summon: "summons",
  wand: "wands",
} as const satisfies Record<EquipmentType, string>;
