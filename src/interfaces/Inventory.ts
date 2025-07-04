import type { INVENTORY_TYPES } from "../constants.js";

export type Inventory = Record<
  (typeof INVENTORY_TYPES)[number],
  Record<
    string,
    {
      description: string;
      imageFilePath: string;
    }
  >
>;
