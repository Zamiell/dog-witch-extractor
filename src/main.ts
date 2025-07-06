import {
  assertDefined,
  isObject,
  repeat,
  trimPrefix,
  trimSuffix,
} from "complete-common";
import {
  copyFileOrDirectoryAsync,
  formatWithPrettier,
  getArgs,
  getFilePathsInDirectory,
  isDirectory,
  makeDirectory,
  readFile,
  writeFile,
} from "complete-node";
import { glob } from "glob";
import path from "node:path";
import * as yaml from "yaml";
import {
  DATA_PATH,
  DEFAULT_EXTRACTED_FILES_PATH,
  EQUIPMENT_TYPE_TO_DIRECTORY_NAME,
  PROJECT_ROOT,
} from "./constants.js";
import type { Equipment } from "./equipment.js";
import { EQUIPMENT_TYPES, EquipmentType } from "./equipment.js";

await main();

async function main() {
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

  makeDirectory(DATA_PATH);
  const equipment = await makeEquipmentJSON(extractedFilesPath);
  await copyEquipmentImages(equipment);
}

async function makeEquipmentJSON(
  extractedFilesPath: string,
): Promise<readonly Equipment[]> {
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

  const allEquipment: Equipment[] = [];

  for (const equipmentType of EQUIPMENT_TYPES) {
    const directoryName = EQUIPMENT_TYPE_TO_DIRECTORY_NAME[equipmentType];
    const equipmentTypeDirectory = path.join(equipmentDirectory, directoryName);
    if (!isDirectory(equipmentTypeDirectory)) {
      throw new Error(
        `Failed to find an equipment directory at: ${equipmentTypeDirectory}`,
      );
    }

    const filePaths = getFilePathsInDirectory(equipmentTypeDirectory);
    const assetFilePaths = filePaths.filter((filePath) =>
      filePath.endsWith(".asset"),
    );

    for (const filePath of assetFilePaths) {
      const equipment = getEquipmentDataFromFile(
        equipmentType,
        equipmentTypeDirectory,
        filePath,
      );
      allEquipment.push(equipment);
    }
  }

  const equipmentPath = path.join(DATA_PATH, "equipment.json");
  const equipmentString = JSON.stringify(allEquipment);
  const formattedString = await formatWithPrettier(
    equipmentString,
    "json",
    PROJECT_ROOT,
  );
  writeFile(equipmentPath, formattedString);

  console.log(`Wrote file: ${equipmentPath}`);

  return allEquipment;
}

function getEquipmentDataFromFile(
  equipmentType: EquipmentType,
  equipmentTypeDirectory: string,
  filePath: string,
): Equipment {
  const guid = getEquipmentGUIDFromMetaFile(filePath);

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

  const file = yaml.parse(yamlContents, {
    // We need to parse numbers as strings in order to properly preserve values like:
    // 00000000020000000400000006000000
    schema: "failsafe",
  }) as unknown;
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
    damageRamp,
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

  if (typeof counterpartGUID !== "string" && counterpartGUID !== undefined) {
    throw new TypeError(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `Failed to parse the "linkedCorruptionCounterpart.guid" field of the "${filePath}" file as an object: ${counterpartGUID}`,
    );
  }

  if (typeof IsCorrupted !== "string") {
    throw new TypeError(
      `Failed to parse the "IsCorrupted" field of the "${filePath}" file: ${iconSpriteGUID}`,
    );
  }

  if (IsCorrupted !== "0" && IsCorrupted !== "1") {
    throw new TypeError(
      `The "IsCorrupted" field of the "${filePath}" file has an unknown value: ${iconSpriteGUID}`,
    );
  }

  const corrupted = IsCorrupted === "1";

  switch (equipmentType) {
    case EquipmentType.wand: {
      if (typeof damageRamp !== "string") {
        throw new TypeError(
          `Failed to parse the "damageRamp" field of the "${filePath}" file: ${damageRamp}`,
        );
      }

      const [level1Damage, level2Damage, level3Damage] =
        parseHexString(damageRamp);

      if (
        level1Damage === undefined
        || level2Damage === undefined
        || level3Damage === undefined
      ) {
        throw new Error(
          `Failed to parse the wand damage values for "${equipmentName}" from the hex string of: ${damageRamp}`,
        );
      }

      return {
        type: equipmentType,
        guid,
        name: equipmentName,
        corrupted,
        description: description ?? "",
        imageFileName,
        counterpartGUID,
        damage: [level1Damage, level2Damage, level3Damage],
      };
    }

    default: {
      return {
        type: equipmentType,
        guid,
        name: equipmentName,
        corrupted,
        description: description ?? "",
        imageFileName,
        counterpartGUID,
      };
    }
  }
}

function getEquipmentGUIDFromMetaFile(filePath: string): string {
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

/**
 * The game uses a hex string to represent wand damage. For example, the Zapper Wand has the
 * following "damageRamp" value:
 *
 * 00000000010000000200000003000000
 */
function parseHexString(input: string): readonly number[] {
  const result: number[] = [];

  // Process every 8 characters (4 bytes).
  for (let i = 0; i < input.length; i += 8) {
    const hexChunk = input.slice(i, i + 8);

    // Convert from little-endian hex to number.
    const byte1 = Number.parseInt(hexChunk.slice(0, 2), 16);
    const byte2 = Number.parseInt(hexChunk.slice(2, 4), 16);
    const byte3 = Number.parseInt(hexChunk.slice(4, 6), 16);
    const byte4 = Number.parseInt(hexChunk.slice(6, 8), 16);

    // Combine bytes in little-endian order.
    // eslint-disable-next-line no-bitwise
    const value = byte1 | (byte2 << 8) | (byte3 << 16) | (byte4 << 24);

    result.push(value);
  }

  // The first value is always zero, so we can discard it.
  result.shift();

  return result;
}

async function copyEquipmentImages(allEquipment: readonly Equipment[]) {
  const imageFileNamesSet = new Set<string>();
  for (const equipment of allEquipment) {
    const { imageFileName } = equipment;
    imageFileNamesSet.add(imageFileName);
  }

  const imageFileNames = [...imageFileNamesSet];
  const imagesPath = path.join(DATA_PATH, "images");

  await Promise.all(
    imageFileNames.map(async (fileName) => {
      const matchingFiles = await glob(`**/${fileName}`, {
        absolute: true,
        cwd: DEFAULT_EXTRACTED_FILES_PATH,
      });

      if (matchingFiles.length !== 1) {
        throw new Error(
          `Found more than one file named "${fileName}": ${matchingFiles}`,
        );
      }

      const matchingFile = matchingFiles[0];
      assertDefined(matchingFile, "Failed to get the first matching file.");

      const dstPath = path.join(imagesPath, fileName);
      await copyFileOrDirectoryAsync(matchingFile, dstPath);
    }),
  );

  console.log(`Copied images to: ${imagesPath}`);
}
