import { getEnumValues } from "complete-common";

export enum EquipmentType {
  bone = "bone",
  book = "book",
  curse = "curse",
  hat = "hat",
  bracelet = "bracelet",
  necklace = "necklace",
  ring = "ring",
  spell = "spell",
  summon = "summon",
  wand = "wand",
}

export const EQUIPMENT_TYPES = getEnumValues(EquipmentType);

interface BaseEquipment {
  guid: string;
  name: string;
  corrupted: boolean;
  description: string;
  imageFileName: string;
  counterpartGUID?: string;
}

interface Bone extends BaseEquipment {
  type: EquipmentType.bone;
}

interface Book extends BaseEquipment {
  type: EquipmentType.book;
}

interface Curse extends BaseEquipment {
  type: EquipmentType.curse;
}

interface Hat extends BaseEquipment {
  type: EquipmentType.hat;
}

interface Bracelet extends BaseEquipment {
  type: EquipmentType.bracelet;
}

interface Necklace extends BaseEquipment {
  type: EquipmentType.necklace;
}

interface Ring extends BaseEquipment {
  type: EquipmentType.ring;
}

interface Spell extends BaseEquipment {
  type: EquipmentType.spell;
}

interface Summon extends BaseEquipment {
  type: EquipmentType.summon;
}

interface Wand extends BaseEquipment {
  type: EquipmentType.wand;
  damage: [level1Damage: number, level2Damage: number, level3Damage: number];
}

export type Equipment =
  | Bone
  | Book
  | Curse
  | Hat
  | Bracelet
  | Necklace
  | Ring
  | Spell
  | Summon
  | Wand;
