const path = require("node:path");
const { execSync } = require("node:child_process");
const { listExtensions } = require("./list-extensions");

const rootDir = path.resolve(__dirname, "..");
const extensions = listExtensions(rootDir);

if (extensions.length === 0) {
  console.log("No extensions found to build.");
  process.exit(0);
}

extensions.forEach((extensionName) => {
  execSync(`node scripts/build.js ${extensionName} chrome`, { cwd: rootDir, stdio: "inherit" });
  execSync(`node scripts/build.js ${extensionName} firefox`, { cwd: rootDir, stdio: "inherit" });
});

console.log(`Build complete for ${extensions.length} extension(s).`);
