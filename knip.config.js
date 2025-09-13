// This is the configuration file for Knip:
// https://knip.dev/overview/configuration

// @ts-check

/** @type {import("knip").KnipConfig} */
const config = {
  ignore: [
    "eslint.config.mjs", // ESLint is provided by "complete-lint".
    "prettier.config.mjs", // Prettier is provided by "complete-lint".

    // https://github.com/webpro-nl/knip/issues/1261
    ".github/workflows/setup/action.yml",
  ],
  ignoreDependencies: [
    "complete-lint", // This is a linting meta-package.
  ],
};

export default config;
