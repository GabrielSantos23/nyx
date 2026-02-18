/**
 * BrowserMicSTT — Electron-side client
 *
 * This class captures microphone audio directly in the renderer process
 * using getUserMedia, then forwards it to the backend server via WebSocket
 * for Google Cloud Speech-to-Text processing.
 *
 * Unlike SystemAudioCapture (which captures system/desktop audio via a native
 * module), this captures from the user's microphone using standard Web APIs.
 *
 * Flow:
 *   Hidden BrowserWindow (getUserMedia) → IPC → main process → ws://127.0.0.1:3001 → Google Cloud STT
 */

import { EventEmitter } from "events";
import { BrowserWindow, ipcMain } from "electron";
import WebSocket from "ws";
import path from "node:path";

const BACKEND_URL = "ws://127.0.0.1:3001";
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(
  process.env.APP_ROOT || path.join(__dirname, ".."),
  "dist",
);

export class BrowserMicSTT extends EventEmitter {
  private ws: WebSocket | null = null;
  private win: BrowserWindow | null = null;
  private language: string = "en-US";
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private ready: boolean = false;
  private pendingStart: boolean = false;

  constructor() {
    super();
    console.log("[BrowserMicSTT] Initialized (mic capture → backend STT)");
  }

  start(language: string = "en-US"): void {
    this.language = language;
    this.isRunning = true;
    this.reconnectAttempts = 0;

    if (!this.win || this.win.isDestroyed()) {
      this.createWindow();
      this.pendingStart = true;
    } else if (this.ready) {
      this.connectBackend();
    } else {
      this.pendingStart = true;
    }
  }

  write(_audioData: Buffer): void {
    // Audio comes from the hidden BrowserWindow, not from external sources.
  }

  stop(): void {
    this.isRunning = false;
    this.pendingStart = false;
    this.clearReconnectTimer();

    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("mic-stt-stop");
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "stop" }));
        }
        this.ws.close();
      } catch (e) {
        console.error("[BrowserMicSTT] Error closing WebSocket:", e);
      }
      this.ws = null;
    }

    console.log("[BrowserMicSTT] Stopped");
  }

  destroy(): void {
    this.stop();
    this.removeIPCListeners();
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
    }
    this.win = null;
  }

  private createWindow(): void {
    this.win = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const htmlPath = VITE_DEV_SERVER_URL
      ? `${VITE_DEV_SERVER_URL}mic-capture.html`
      : `file://${path.join(RENDERER_DIST, "mic-capture.html")}`;

    console.log("[BrowserMicSTT] Loading:", htmlPath);
    this.win.loadURL(htmlPath);

    this.win.on("closed", () => {
      this.win = null;
      this.ready = false;
      if (this.isRunning) {
        this.isRunning = false;
        this.emit("stopped");
      }
    });

    this.setupIPCListeners();
  }

  private setupIPCListeners(): void {
    ipcMain.on("mic-stt-ready", this.onWindowReady);
    ipcMain.on("mic-stt-audio", this.onAudioData);
    ipcMain.on("mic-stt-error", this.onMicError);
  }

  private removeIPCListeners(): void {
    ipcMain.removeListener("mic-stt-ready", this.onWindowReady);
    ipcMain.removeListener("mic-stt-audio", this.onAudioData);
    ipcMain.removeListener("mic-stt-error", this.onMicError);
  }

  private onWindowReady = () => {
    console.log("[BrowserMicSTT] Hidden window ready");
    this.ready = true;
    if (this.pendingStart) {
      this.pendingStart = false;
      this.connectBackend();
    }
  };

  private onAudioData = (_event: any, data: ArrayBuffer) => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(Buffer.from(data));
      } catch (e) {
        console.error("[BrowserMicSTT] Error sending audio:", e);
      }
    }
  };

  private onMicError = (_event: any, message: string) => {
    console.error("[BrowserMicSTT] Mic error:", message);
  };

  private connectBackend(): void {
    if (!this.isRunning) return;

    console.log(`[BrowserMicSTT] Connecting to backend at ${BACKEND_URL}...`);

    try {
      this.ws = new WebSocket(BACKEND_URL);
    } catch (e) {
      console.error("[BrowserMicSTT] Failed to create WebSocket:", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      console.log("[BrowserMicSTT] Connected to backend ✅");
      this.reconnectAttempts = 0;

      this.ws!.send(JSON.stringify({ type: "start", language: this.language }));

      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send("mic-stt-start");
      }
    });

    this.ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleBackendMessage(msg);
      } catch (e) {
        console.error("[BrowserMicSTT] Failed to parse backend message:", e);
      }
    });

    this.ws.on("close", () => {
      console.log("[BrowserMicSTT] Disconnected from backend");
      this.ws = null;
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error("[BrowserMicSTT] WebSocket error:", err.message);
    });
  }

  private handleBackendMessage(msg: Record<string, any>): void {
    switch (msg.type) {
      case "transcript":
        this.emit("transcript", {
          text: msg.text,
          isFinal: msg.isFinal,
        });
        break;

      case "started":
        console.log(
          `[BrowserMicSTT] Backend STT stream started (${msg.language})`,
        );
        break;

      case "stopped":
        console.log("[BrowserMicSTT] Backend STT stream stopped");
        if (this.isRunning) {
          this.emit("stopped");
        }
        break;

      case "error":
        console.error("[BrowserMicSTT] Backend error:", msg.message);
        break;

      default:
        console.warn("[BrowserMicSTT] Unknown message from backend:", msg.type);
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      console.error(
        "[BrowserMicSTT] Max reconnect attempts reached, giving up",
      );
      this.isRunning = false;
      this.emit("stopped");
      return;
    }

    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    console.log(
      `[BrowserMicSTT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connectBackend();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
