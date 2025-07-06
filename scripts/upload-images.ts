// See "notes.md" for setting up Pywikibot.

import {
  $,
  $q,
  getFilePathsInDirectory,
  getFileSHA1,
  isDirectory,
  isFile,
} from "complete-node";
import os from "node:os";
import path from "node:path";
import { DATA_PATH, PROJECT_ROOT } from "../src/constants.js";

const REPOSITORIES_PATH = path.resolve(PROJECT_ROOT, "..");
const PYWIKIBOT_REPOSITORY_PATH = path.join(REPOSITORIES_PATH, "pywikibot");

const PYTHON_SCRIPTS_PATH = path.join(PROJECT_ROOT, "scripts", "python");
const FILE_EXISTS_SCRIPT_PATH = path.join(
  PYTHON_SCRIPTS_PATH,
  "file_exists.py",
);
const DOWNLOAD_FILE_SCRIPT_PATH = path.join(
  PYTHON_SCRIPTS_PATH,
  "download_file.py",
);

const DESCRIPTION =
  "An official game image extracted with AssetRipper and uploaded by a script.";

await main();

async function main() {
  if (!isDirectory(PYWIKIBOT_REPOSITORY_PATH)) {
    throw new Error(
      `Failed to find the "pywikibot" directory at: ${PYWIKIBOT_REPOSITORY_PATH}`,
    );
  }

  if (!isFile(FILE_EXISTS_SCRIPT_PATH)) {
    throw new Error(`Failed to find a script at: ${FILE_EXISTS_SCRIPT_PATH}`);
  }

  if (!isFile(DOWNLOAD_FILE_SCRIPT_PATH)) {
    throw new Error(`Failed to find a script at: ${DOWNLOAD_FILE_SCRIPT_PATH}`);
  }

  const tmpDir = os.tmpdir();

  const $$ = $({ cwd: PYWIKIBOT_REPOSITORY_PATH });
  const $$q = $q({
    cwd: PYWIKIBOT_REPOSITORY_PATH,
    all: true,
  });

  // If we do not login first, we get the following error: CRITICAL: Exiting due to uncaught
  // exception UserRightsError: User "None" does not have required user right "edit" on site
  // dogwitch:en.
  await $$`python pwb.py login.py`;

  const imagesDirectory = path.join(DATA_PATH, "images");
  const imageFilePaths = getFilePathsInDirectory(imagesDirectory);

  for (const imageFilePath of imageFilePaths) {
    const fileName = path.basename(imageFilePath);

    const { all: fileExistsOutput } =
      // eslint-disable-next-line no-await-in-loop
      await $$q`python pwb.py ${FILE_EXISTS_SCRIPT_PATH} -page:File:${fileName}`;
    if (fileExistsOutput !== "true" && fileExistsOutput !== "false") {
      throw new Error(
        `Failed to parse the output of the "${FILE_EXISTS_SCRIPT_PATH}" script: ${fileExistsOutput}`,
      );
    }

    const fileExists = fileExistsOutput === "true";

    if (fileExists) {
      // eslint-disable-next-line no-await-in-loop
      await $$`python pwb.py ${DOWNLOAD_FILE_SCRIPT_PATH} -page:File:${fileName}`;
      const downloadedFilePath = path.join(tmpDir, fileName);
      if (!isFile(downloadedFilePath)) {
        throw new Error(
          `Failed to find the downloaded file at: ${downloadedFilePath}`,
        );
      }

      // eslint-disable-next-line no-await-in-loop
      const hash1 = await getFileSHA1(downloadedFilePath);
      // eslint-disable-next-line no-await-in-loop
      const hash2 = await getFileSHA1(imageFilePath);

      if (hash1 !== hash2) {
        throw new Error(
          `The file of "${fileName}" exists on the wiki but it is outdated. (wiki: ${hash1}, local: ${hash2})`,
        );
      }
    } else {
      // https://www.mediawiki.org/wiki/Manual:Pywikibot/upload.py
      // - "-keep" - Keep the filename as is
      // - "-noverify" - Do not ask for verification of the upload description if one is given.
      // eslint-disable-next-line no-await-in-loop
      await $$`python pwb.py upload.py ${imageFilePath} ${DESCRIPTION} -keep -noverify`;
    }
  }
}
