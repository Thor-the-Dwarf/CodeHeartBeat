const fs = require("node:fs/promises");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const folderTreeDirectory = path.join(projectDirectory, "FolderTree");
const outputFile = path.join(projectDirectory, "public", "folder-data.js");

async function readTree(directory, relativePath = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
    return left.name.localeCompare(right.name, "de");
  });

  return Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    const relativeEntryPath = path.join(relativePath, entry.name).split(path.sep).join("/");

    if (entry.isDirectory()) {
      return {
        name: entry.name,
        path: relativeEntryPath,
        type: "directory",
        children: await readTree(entryPath, relativeEntryPath)
      };
    }

    return {
      name: entry.name,
      path: relativeEntryPath,
      type: "file",
      content: await fs.readFile(entryPath, "utf8")
    };
  }));
}

async function generateFolderData() {
  const tree = {
    name: "FolderTree",
    path: "",
    type: "directory",
    children: await readTree(folderTreeDirectory)
  };
  const source = `window.CODE_HEARTBEAT_TREE = ${JSON.stringify(tree, null, 2)};\n`;
  await fs.writeFile(outputFile, source, "utf8");
  console.log(`FolderTree synchronisiert: ${outputFile}`);
}

generateFolderData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
