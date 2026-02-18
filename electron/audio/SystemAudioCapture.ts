import { EventEmitter } from "events";
const path = require("path");
const fs = require("fs");

let NativeModule: any = null;

function loadNativeModule() {
  console.log("[SystemAudioCapture] Loading native module...");
  console.log("[SystemAudioCapture] __dirname:", __dirname);
  console.log(
    "[SystemAudioCapture] process.resourcesPath:",
    process.resourcesPath,
  );

  const possiblePaths = [
    // Development: native-module is sibling of dist-electron
    path.join(__dirname, "../native-module"),
    path.join(__dirname, "../../native-module"),
    // Development: relative to working directory
    path.join(process.cwd(), "native-module"),
    // Production: extraResources are placed in resources/
    process.resourcesPath
      ? path.join(process.resourcesPath, "native-module")
      : null,
  ].filter(Boolean) as string[];

  for (const modulePath of possiblePaths) {
    try {
      const indexPath = path.join(modulePath, "index.js");
      const exists = fs.existsSync(indexPath);
      console.log(
        `[SystemAudioCapture] Trying ${modulePath} — index.js ${exists ? "found ✅" : "not found"}`,
      );
      if (exists) {
        NativeModule = require(modulePath);
        console.log(
          "[SystemAudioCapture] Native audio module loaded from:",
          modulePath,
        );
        console.log("[SystemAudioCapture] Exports:", Object.keys(NativeModule));
        return;
      }
    } catch (e: any) {
      console.warn(
        "[SystemAudioCapture] Failed to load from",
        modulePath,
        e.message || e,
      );
    }
  }

  try {
    NativeModule = require("nyx-audio");
    console.log(
      "[SystemAudioCapture] Native audio module loaded from nyx-audio package",
    );
  } catch (e: any) {
    console.error(
      "[SystemAudioCapture] Could not load native module from any location",
    );
  }
}

loadNativeModule();

export class SystemAudioCapture extends EventEmitter {
  private capture: any = null;

  constructor() {
    super();
    if (NativeModule && NativeModule.SystemAudioCapture) {
      this.capture = new NativeModule.SystemAudioCapture();
      console.log("SystemAudioCapture native instance created");
    } else {
      console.error("NativeModule.SystemAudioCapture not available");
    }
  }

  start(): void {
    if (!this.capture) {
      const error = new Error(
        "Cannot start: capture not initialized (native module missing)",
      );
      console.error(error.message);
      throw error;
    }

    this.capture.start((chunk: Uint8Array) => {
      if (chunk && chunk.length > 0) {
        this.emit("data", Buffer.from(chunk));
      }
    });
    this.emit("start");
    console.log("SystemAudioCapture started");
  }

  stop(): void {
    if (this.capture) {
      this.capture.stop();
    }
    this.emit("stop");
    console.log("SystemAudioCapture stopped");
  }
}
