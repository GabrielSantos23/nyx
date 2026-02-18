import { EventEmitter } from "events";
const path = require("path");
const fs = require("fs");

let NativeModule: any = null;

function loadNativeModule() {
  console.log("Loading native module from:", __dirname);

  const possiblePaths = [
    path.join(__dirname, "../native-module"),
    path.join(__dirname, "../../native-module"),
    path.join(process.cwd(), "native-module"),
    process.resourcesPath
      ? path.join(process.resourcesPath, "native-module")
      : null,
  ].filter(Boolean) as string[];

  for (const modulePath of possiblePaths) {
    try {
      const indexPath = path.join(modulePath, "index.js");
      if (fs.existsSync(indexPath)) {
        NativeModule = require(modulePath);
        console.log("Native audio module loaded from:", modulePath);
        console.log("Exports:", Object.keys(NativeModule));
        return;
      }
    } catch (e) {
      console.warn("Failed to load from", modulePath, e);
    }
  }

  try {
    NativeModule = require("nyx-audio");
    console.log("Native audio module loaded from nyx-audio package");
  } catch (e) {
    console.error("Failed to load nyx-audio module", e);
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
