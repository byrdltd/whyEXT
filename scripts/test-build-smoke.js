const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { listExtensions } = require("./list-extensions");

const rootDir = path.resolve(__dirname, "..");
const extensions = listExtensions(rootDir);

execSync("npm run build", { cwd: rootDir, stdio: "inherit" });

extensions.forEach((extensionName) => {
  ["chrome", "firefox"].forEach((target) => {
    const relativePath = `extensions/${extensionName}/dist/${target}/manifest.json`;
    const fullPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Build smoke failed: ${relativePath} not found.`);
    }
  });
});

console.log("Build smoke test passed.");
