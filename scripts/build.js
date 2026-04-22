const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const extensionName = process.argv[2];
const target = process.argv[3];
const allowedTargets = new Set(["chrome", "firefox"]);

if (!extensionName || !allowedTargets.has(target)) {
  console.error("Usage: node scripts/build.js <extension-name> <chrome|firefox>");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const extensionDir = path.join(rootDir, "extensions", extensionName);
const srcDir = path.join(extensionDir, "src");
const distDir = path.join(extensionDir, "dist", target);
const tsconfigPath = path.join(extensionDir, "tsconfig.json");

if (!fs.existsSync(srcDir)) {
  console.error(`Extension not found: ${extensionName}`);
  process.exit(1);
}

const baseManifestPath = path.join(srcDir, "manifest.base.json");
const targetManifestPath = path.join(srcDir, `manifest.${target}.json`);
const outputManifestPath = path.join(distDir, "manifest.json");

const baseManifest = JSON.parse(fs.readFileSync(baseManifestPath, "utf8"));
const targetManifest = JSON.parse(fs.readFileSync(targetManifestPath, "utf8"));

const mergedManifest = {
  ...baseManifest,
  ...targetManifest
};

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(srcDir, distDir, {
  recursive: true,
  filter: (sourcePath) => !sourcePath.endsWith(".ts") && !sourcePath.endsWith(".d.ts")
});

if (fs.existsSync(tsconfigPath)) {
  execSync(`npx tsc -p "${tsconfigPath}" --outDir "${distDir}"`, {
    cwd: rootDir,
    stdio: "inherit"
  });
}

fs.writeFileSync(outputManifestPath, JSON.stringify(mergedManifest, null, 2) + "\n");
fs.rmSync(path.join(distDir, "manifest.base.json"), { force: true });
fs.rmSync(path.join(distDir, "manifest.chrome.json"), { force: true });
fs.rmSync(path.join(distDir, "manifest.firefox.json"), { force: true });

console.log(`Build complete: extensions/${extensionName}/dist/${target}`);
