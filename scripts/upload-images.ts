// See "notes.md" for setting up Pywikibot.

import { $, getFilePathsInDirectory, isDirectory } from "complete-node";
import path from "node:path";
import { DATA_PATH } from "../src/constants.js";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const REPOSITORIES_PATH = path.resolve(PROJECT_ROOT, "..");
const PYWIKIBOT_REPOSITORY_PATH = path.join(REPOSITORIES_PATH, "pywikibot");

const DESCRIPTION =
  "An official game image extracted with AssetRipper and uploaded by a script.";

if (!isDirectory(PYWIKIBOT_REPOSITORY_PATH)) {
  throw new Error(
    `Failed to find the "pywikibot" directory at: ${PYWIKIBOT_REPOSITORY_PATH}`,
  );
}

const $$ = $({ cwd: PYWIKIBOT_REPOSITORY_PATH });

// If we do not login first, we get the following error: CRITICAL: Exiting due to uncaught exception
// UserRightsError: User "None" does not have required user right "edit" on site dogwitch:en.
await $$`python pwb.py login.py`;

const imagesDirectory = path.join(DATA_PATH, "images");
const imageFilePaths = getFilePathsInDirectory(imagesDirectory);

for (const imageFilePath of imageFilePaths) {
  // https://www.mediawiki.org/wiki/Manual:Pywikibot/upload.py
  // - "-keep" - Keep the filename as is
  // - "-noverify" - Do not ask for verification of the upload description if one is given.
  // eslint-disable-next-line no-await-in-loop
  await $$`python pwb.py upload.py ${imageFilePath} ${DESCRIPTION} -keep -noverify`;
}
