/**
 * GoogleSTT — Electron-side client
 *
 * Instead of calling Google Cloud Speech directly (which would require bundling
 * the service account key inside the Electron app), this class connects to the
 * local backend server via WebSocket.
 *
 * Flow:
 *   Electron (this file) → ws://127.0.0.1:3001 → Backend → Google Cloud Speech API
 *
 * The service account JSON lives ONLY in the backend folder and is never
 * shipped inside the Electron bundle.
 */

import { EventEmitter } from "events";
import WebSocket from "ws";

const BACKEND_URL = "ws://127.0.0.1:3001";
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export class GoogleSTT extends EventEmitter {
  private ws: WebSocket | null = null;
  private language: string = "en-US";
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    console.log("[GoogleSTT] Client initialized (backend proxy mode)");
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start(language: string = "en-US"): void {
    this.language = language;
    this.isRunning = true;
    this.reconnectAttempts = 0;
    this.connect();
  }

  write(audioData: Buffer): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(audioData);
    }
  }

  stop(): void {
    this.isRunning = false;
    this.clearReconnectTimer();

    if (this.ws) {
      try {
        if (this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ type: "stop" }));
        }
        this.ws.close();
      } catch (e) {
        console.error("[GoogleSTT] Error closing WebSocket:", e);
      }
      this.ws = null;
    }

    console.log("[GoogleSTT] Stopped");
  }

  private connect(): void {
    if (!this.isRunning) return;

    console.log(`[GoogleSTT] Connecting to backend at ${BACKEND_URL}...`);

    try {
      this.ws = new WebSocket(BACKEND_URL);
    } catch (e) {
      console.error("[GoogleSTT] Failed to create WebSocket:", e);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      console.log("[GoogleSTT] Connected to backend ✅");
      this.reconnectAttempts = 0;

      this.ws!.send(JSON.stringify({ type: "start", language: this.language }));
    });

    this.ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleBackendMessage(msg);
      } catch (e) {
        console.error("[GoogleSTT] Failed to parse backend message:", e);
      }
    });

    this.ws.on("close", () => {
      console.log("[GoogleSTT] Disconnected from backend");
      this.ws = null;
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error("[GoogleSTT] WebSocket error:", err.message);
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
        console.log(`[GoogleSTT] Backend STT stream started (${msg.language})`);
        break;

      case "stopped":
        console.log("[GoogleSTT] Backend STT stream stopped");
        if (this.isRunning) {
          this.emit("stopped");
        }
        break;

      case "error":
        console.error("[GoogleSTT] Backend error:", msg.message);
        break;

      default:
        console.warn("[GoogleSTT] Unknown message from backend:", msg.type);
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      console.error("[GoogleSTT] Max reconnect attempts reached, giving up");
      this.isRunning = false;
      this.emit("stopped");
      return;
    }

    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    console.log(
      `[GoogleSTT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
