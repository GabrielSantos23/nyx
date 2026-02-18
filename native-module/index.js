const path = require("path");
const os = require("os");
const fs = require("fs");

function loadNativeAddon() {
  // Build the expected filename: nyx-audio.<platform>-<arch>-<abi>.node
  // e.g. nyx-audio.win32-x64-msvc.node, nyx-audio.darwin-x64.node
  const platform = os.platform();
  const arch = os.arch();

  // Map platform+arch to NAPI-RS triple naming convention
  const tripleMap = {
    "win32-x64": "win32-x64-msvc",
    "win32-arm64": "win32-arm64-msvc",
    "darwin-x64": "darwin-x64",
    "darwin-arm64": "darwin-arm64",
    "linux-x64": "linux-x64-gnu",
    "linux-arm64": "linux-arm64-gnu",
  };

  const triple = tripleMap[`${platform}-${arch}`];
  if (!triple) {
    throw new Error(`Unsupported platform/arch: ${platform}-${arch}`);
  }

  const filename = `nyx-audio.${triple}.node`;

  // Try loading from multiple possible locations
  const candidates = [
    path.join(__dirname, filename),
    process.resourcesPath
      ? path.join(process.resourcesPath, "native-module", filename)
      : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return require(candidate);
      } catch (e) {
        console.warn(
          `[nyx-audio] Found ${candidate} but failed to load:`,
          e.message,
        );
      }
    }
  }

  throw new Error(
    `[nyx-audio] Could not find native addon ${filename} in any of: ${candidates.join(", ")}`,
  );
}

module.exports = loadNativeAddon();
