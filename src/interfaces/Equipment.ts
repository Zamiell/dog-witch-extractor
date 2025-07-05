import type { EQUIPMENT_TYPES } from "../constants.js";

export type Equipment = Record<
  (typeof EQUIPMENT_TYPES)[number],
  Record<
    string,
    {
      guid: string;
      corrupted: boolean;
      description: string;
      imageFileName: string;
      counterpartGUID?: string;
    }
  >
>;
