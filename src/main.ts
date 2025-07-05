import { isObject, repeat, trimPrefix, trimSuffix } from "complete-common";
import {
  getArgs,
  getFilePathsInDirectory,
  isDirectory,
  makeDirectory,
  readFile,
  writeFile,
} from "complete-node";
import path from "node:path";
import * as yaml from "yaml";
import { name } from "../package.json";
import { DEFAULT_EXTRACTED_FILES_PATH, EQUIPMENT_TYPES } from "./constants.js";
import type { Equipment } from "./interfaces/Equipment.js";

main();

function main() {
  const args = getArgs();
  let [extractedFilesPath] = args;
  if (extractedFilesPath === undefined || extractedFilesPath === "") {
    extractedFilesPath = DEFAULT_EXTRACTED_FILES_PATH;
  }

  if (!isDirectory(extractedFilesPath)) {
    throw new Error(
      `Failed to find the extracted Dog Witch game files at: ${extractedFilesPath}`,
    );
  }

  console.log(
    `Looking through the extracted Dog Witch files at: ${extractedFilesPath}`,
  );

  const equipmentDirectory = path.join(
    extractedFilesPath,
    "ExportedProject",
    "Assets",
    "Resources",
    "equipment",
  );

  if (!isDirectory(equipmentDirectory)) {
    throw new Error(
      `Failed to find the equipment directory at: ${equipmentDirectory}`,
    );
  }

  const equipment: Partial<Equipment> = {};

  for (const equipmentType of EQUIPMENT_TYPES) {
    const equipmentTypeDirectory = path.join(equipmentDirectory, equipmentType);
    if (!isDirectory(equipmentTypeDirectory)) {
      throw new Error(
        `Failed to find an equipment directory at: ${equipmentTypeDirectory}`,
      );
    }

    const filePaths = getFilePathsInDirectory(equipmentTypeDirectory);
    const assetFilePaths = filePaths.filter((filePath) =>
      filePath.endsWith(".asset"),
    );

    let evil = false;
    for (const filePath of assetFilePaths) {
      const guid = getEquipmentGUIDFromMeta(filePath);

      const fileContents = readFile(filePath);

      // The first 3 lines cause the YAML parser to fail, so we remove them.
      /// %YAML 1.1
      /// %TAG !u! tag:unity3d.com,2011:
      /// --- !u!114 &11400000
      const lines = fileContents.split("\n");
      repeat(3, () => {
        lines.shift();
      });
      const yamlContents = lines.join("\n");

      const file = yaml.parse(yamlContents) as unknown;
      if (!isObject(file)) {
        throw new Error(
          `Failed to parse the "${filePath}" file as an object: ${file}`,
        );
      }

      const { MonoBehaviour } = file;

      if (!isObject(MonoBehaviour)) {
        throw new Error(
          `Failed to parse the "MonoBehavior" field in the "${filePath}" file as an object: ${MonoBehaviour}`,
        );
      }

      const {
        equipmentName,
        iconSprite,
        description,
        linkedCorruptionCounterpart,
        IsCorrupted,
      } = MonoBehaviour;

      if (typeof equipmentName !== "string") {
        throw new TypeError(
          `Failed to parse the "equipmentName" field of the "${filePath}" file: ${equipmentName}`,
        );
      }

      if (!isObject(iconSprite)) {
        throw new TypeError(
          `Failed to parse the "iconSprite" field of the "${filePath}" file as an object: ${iconSprite}`,
        );
      }

      const { guid: iconSpriteGUID } = iconSprite;

      if (typeof iconSpriteGUID !== "string") {
        throw new TypeError(
          `Failed to parse the "iconSprite.guid" field of the "${filePath}" file: ${iconSpriteGUID}`,
        );
      }

      const imageFileName = getImageFileName(
        equipmentTypeDirectory,
        iconSpriteGUID,
      );

      // Some files have no description, like "jewelry-bracelets\NoBracelet(Default).asset".
      if (typeof description !== "string" && description !== null) {
        throw new TypeError(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Failed to parse the "description" field of the "${filePath}" file: ${description}`,
        );
      }

      if (!isObject(linkedCorruptionCounterpart)) {
        throw new TypeError(
          `Failed to parse the "linkedCorruptionCounterpart" field of the "${filePath}" file as an object: ${linkedCorruptionCounterpart}`,
        );
      }

      const { guid: counterpartGUID } = linkedCorruptionCounterpart;

      if (
        typeof counterpartGUID !== "string"
        && counterpartGUID !== undefined
      ) {
        throw new TypeError(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Failed to parse the "linkedCorruptionCounterpart.guid" field of the "${filePath}" file as an object: ${counterpartGUID}`,
        );
      }

      if (typeof IsCorrupted !== "number") {
        throw new TypeError(
          `Failed to parse the "IsCorrupted" field of the "${filePath}" file: ${iconSpriteGUID}`,
        );
      }

      if (IsCorrupted !== 0 && IsCorrupted !== 1) {
        throw new TypeError(
          `The "IsCorrupted" field of the "${filePath}" file has an unknown value: ${iconSpriteGUID}`,
        );
      }

      const corrupted = IsCorrupted === 1;

      let thisEquipmentType = equipment[equipmentType];
      if (thisEquipmentType === undefined) {
        thisEquipmentType = {};
        equipment[equipmentType] = thisEquipmentType;
      }

      thisEquipmentType[equipmentName] = {
        guid,
        corrupted,
        description: description ?? "",
        imageFileName,
        counterpartGUID,
      };

      // The file names alternate between the normal and evil versions.
      evil = !evil;
    }
  }

  const outputPath = path.join(extractedFilesPath, name);
  makeDirectory(outputPath);

  const equipmentPath = path.join(outputPath, "equipment.json");
  const equipmentString = `${JSON.stringify(equipment, undefined, 2)}\n`;
  writeFile(equipmentPath, equipmentString);

  console.log(`Wrote file: ${equipmentPath}`);
}

function getEquipmentGUIDFromMeta(filePath: string): string {
  const metaFilePath = `${filePath}.meta`;
  const fileContents = readFile(metaFilePath);

  const file = yaml.parse(fileContents) as unknown;
  if (!isObject(file)) {
    throw new Error(
      `Failed to parse the "${filePath}" file as an object: ${file}`,
    );
  }

  const { guid } = file;
  if (typeof guid !== "string") {
    throw new TypeError(
      `Failed to parse the "guid" field of the "${filePath}" file: ${guid}`,
    );
  }

  return guid;
}

/** Search through every file in the sprites directory, looking for a matching GUID. */
function getImageFileName(
  equipmentTypeDirectory: string,
  equipmentGUID: string,
): string {
  const equipmentType = path.basename(equipmentTypeDirectory);

  if (!equipmentType.endsWith("s")) {
    throw new Error(
      `The equipment type of "${equipmentType}" is not plural (from the "${equipmentTypeDirectory}" directory).`,
    );
  }

  const equipmentTypeNonPlural = trimSuffix(equipmentType, "s");
  const equipmentTypeSimple = trimPrefix(equipmentTypeNonPlural, "jewelry-");
  const spritesDirectoryName = `_${equipmentTypeSimple}sprites`;

  const spritesDirectoryPath = path.join(
    equipmentTypeDirectory,
    spritesDirectoryName,
  );
  if (!isDirectory(spritesDirectoryPath)) {
    throw new Error(
      `Failed to find the sprites directory at: ${spritesDirectoryPath}`,
    );
  }

  const filePaths = getFilePathsInDirectory(spritesDirectoryPath);
  const metaFilePaths = filePaths.filter((fileName) =>
    fileName.endsWith(".asset.meta"),
  );

  const matchingAssetMetaFilePath = metaFilePaths.find((filePath) => {
    const fileContents = readFile(filePath);
    const metaYAML = yaml.parse(fileContents) as unknown;
    if (!isObject(metaYAML)) {
      throw new Error(
        `Failed to parse the "${filePath}" file as an object: ${metaYAML}`,
      );
    }

    const { guid } = metaYAML;

    if (typeof guid !== "string") {
      throw new TypeError(
        `Failed to parse the "guid" field of the "${filePath}" file: ${guid}`,
      );
    }

    return guid === equipmentGUID;
  });

  if (matchingAssetMetaFilePath === undefined) {
    throw new Error(
      `Failed to find a matching meta file for GUID: ${equipmentGUID}`,
    );
  }

  const fileName = path.basename(matchingAssetMetaFilePath);
  const baseFileName = trimSuffix(fileName, ".asset.meta");

  return `${baseFileName}.png`;
}
