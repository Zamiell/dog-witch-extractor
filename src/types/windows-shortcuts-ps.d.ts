/** @see https://github.com/felixrieseberg/windows-shortcuts-ps */
declare module "windows-shortcuts-ps" {
  export async function getPath(shortcutPath: string): Promise<string>;
}
