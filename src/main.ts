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
import { DEFAULT_EXTRACTED_FILES_PATH, INVENTORY_TYPES } from "./constants.js";
import type { Inventory } from "./interfaces/Inventory.js";

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

  const inventory: Partial<Inventory> = {};

  for (const inventoryType of INVENTORY_TYPES) {
    const equipmentTypeDirectory = path.join(equipmentDirectory, inventoryType);
    if (!isDirectory(equipmentTypeDirectory)) {
      throw new Error(
        `Failed to find an inventory directory at: ${equipmentTypeDirectory}`,
      );
    }

    const filePaths = getFilePathsInDirectory(equipmentTypeDirectory);
    const assetFilePaths = filePaths.filter((filePath) =>
      filePath.endsWith(".asset"),
    );

    let evil = false;
    for (const filePath of assetFilePaths) {
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

      const { equipmentName, iconSprite, description } = MonoBehaviour;

      if (typeof equipmentName !== "string") {
        throw new TypeError(
          `Failed to parse the "equipmentName" field of the "${filePath}" file: ${equipmentName}.`,
        );
      }

      if (!isObject(iconSprite)) {
        throw new TypeError(
          `Failed to parse the "iconSprite" field of the "${filePath}" file as an object: ${iconSprite}.`,
        );
      }

      const { guid } = iconSprite;

      if (typeof guid !== "string") {
        throw new TypeError(
          `Failed to parse the "guid" field of the "${filePath}" file: ${guid}.`,
        );
      }

      const imageFilePath = getImageFilePath(
        extractedFilesPath,
        equipmentTypeDirectory,
        guid,
      );

      // Some files have no description, like "jewelry-bracelets\NoBracelet(Default).asset".
      if (typeof description !== "string" && description !== null) {
        throw new TypeError(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Failed to parse the "description" field of the "${filePath}" file: ${description}.`,
        );
      }

      let thisInventoryType = inventory[inventoryType];
      if (thisInventoryType === undefined) {
        thisInventoryType = {};
        inventory[inventoryType] = thisInventoryType;
      }

      thisInventoryType[equipmentName] = {
        description: description ?? "",
        imageFilePath,
      };

      // The file names alternate between the normal and evil versions.
      evil = !evil;
    }
  }

  const outputPath = path.join(extractedFilesPath, name);
  makeDirectory(outputPath);

  const inventoryPath = path.join(outputPath, "inventory.json");
  const inventoryString = `${JSON.stringify(inventory, undefined, 2)}\n`;
  writeFile(inventoryPath, inventoryString);

  console.log(`Wrote file: ${inventoryPath}`);
}

/** Search through every file in the sprites directory, looking for a matching GUID. */
function getImageFilePath(
  extractedFilesPath: string,
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
        `Failed to parse the "guid" field of the "${filePath}" file: ${guid}.`,
      );
    }

    return guid === equipmentGUID;
  });

  if (matchingAssetMetaFilePath === undefined) {
    throw new Error(
      `Failed to find a matching meta file for GUID: ${equipmentGUID}`,
    );
  }

  const baseFilePath = trimSuffix(matchingAssetMetaFilePath, ".asset.meta");
  const pngFilePath = `${baseFilePath}.png`;

  const relativePath = path.relative(extractedFilesPath, pngFilePath);

  return process.platform === "win32"
    ? relativePath.replaceAll(path.sep, path.posix.sep)
    : relativePath;
}
