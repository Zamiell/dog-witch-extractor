// See "notes.md" for setting up Pywikibot.

import { $ } from "complete-node";

const PYWIKIBOT_REPOSITORY_PATH = String.raw`D:\Repositories\core`;

const imagePath = String.raw`D:\Games\PC\Dog Witch\Demo\v0.9.276\ExportedProject\Assets\Resources\equipment\bones\_bonesprites\big_bone.png`;

const $$ = $({ cwd: PYWIKIBOT_REPOSITORY_PATH });
await $$`python pwb.py upload.py ${imagePath} -keep`;
