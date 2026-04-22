const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { listExtensions } = require("./list-extensions");

const rootDir = path.resolve(__dirname, "..");
const extensions = listExtensions(rootDir);

if (extensions.length === 0) {
  console.log("No extensions found to typecheck.");
  process.exit(0);
}

extensions.forEach((extensionName) => {
  const tsconfig = path.join(rootDir, "extensions", extensionName, "tsconfig.json");
  if (!fs.existsSync(tsconfig)) {
    return;
  }

  execSync(`npx tsc -p "${tsconfig}" --noEmit`, { cwd: rootDir, stdio: "inherit" });
});

console.log(`Typecheck complete for ${extensions.length} extension(s).`);
