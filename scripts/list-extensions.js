const fs = require("node:fs");
const path = require("node:path");

function listExtensions(rootDir) {
  const extensionsDir = path.join(rootDir, "extensions");
  if (!fs.existsSync(extensionsDir)) {
    return [];
  }

  return fs
    .readdirSync(extensionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "_template" && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(extensionsDir, name, "src", "manifest.base.json")));
}

module.exports = {
  listExtensions
};
