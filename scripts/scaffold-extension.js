const fs = require("node:fs");
const path = require("node:path");

const extensionName = process.argv[2];
const rootDir = path.resolve(__dirname, "..");
const extensionsDir = path.join(rootDir, "extensions");
const templateDir = path.join(extensionsDir, "_template");

if (!extensionName) {
  console.error("Usage: npm run scaffold:extension -- <extension-name>");
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(extensionName)) {
  console.error("Extension name must match: /^[a-z0-9-]+$/");
  process.exit(1);
}

const targetDir = path.join(extensionsDir, extensionName);
if (fs.existsSync(targetDir)) {
  console.error(`Extension already exists: ${extensionName}`);
  process.exit(1);
}

fs.cpSync(templateDir, targetDir, { recursive: true });

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = content.replaceAll("<extension-name>", extensionName);
  fs.writeFileSync(filePath, updated);
}

function walkFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath);
      return;
    }
    replaceInFile(fullPath);
  });
}

walkFiles(targetDir);

console.log(`Created extensions/${extensionName}`);
console.log("Next steps:");
console.log(`1) Add build scripts for ${extensionName} to package.json`);
console.log("2) Update README.md extension list");
console.log(`3) Run: npm run build:${extensionName}:chrome (after script setup)`);
