# dog-witch-extractor

`dog-witch-extractor` is a script that generates JSON data files from the [Dog Witch](https://store.steampowered.com/app/3548520/DOG_WITCH/) game files.

## Instructions

### Extract Dog Witch Game Files Using AssetRipper

- Download the latest [AssetRipper release](https://github.com/AssetRipper/AssetRipper/releases) that has a file name of "AssetRipper_win_x64.zip".
- Extract it to a new directory.
- Run "AssetRipper.GUI.Free.exe".
- Click on "File" --> "Open Folder".
- Select "C:\Program Files (x86)\Steam\steamapps\common\DOG WITCH Demo". (This is where Dog Witch is installed to by default.)
- The program will lag for a few seconds while it opens the directory.
- Click on "Export" --> "Export All Files".
- Click on "Select Folder" and set where you want the game's contents to be extracted to.
- Click on "Export Unity Project". (Doing "Export Primary Content" will not export the ".asset" files that contain the text content that we need.)
- The program will lag while the contents are extracted. (You can see the progress in the console/terminal window.)

### Create the JSON Files

- Install [Bun](https://bun.sh/), if you have not already.
- Clone this repository.
- `bun install`
- `bun start <path-to-extracted-game-files>`
