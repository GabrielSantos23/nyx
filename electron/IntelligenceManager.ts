import { BrowserWindow } from "electron";
import { SystemAudioCapture } from "./audio/SystemAudioCapture";
import { GoogleSTT } from "./audio/GoogleSTT";
import { llmHelper } from "./LLMHelper";

export class IntelligenceManager {
  private audioCapture: SystemAudioCapture | null = null;
  private stt: GoogleSTT | null = null;
  private contextWindow: string[] = [];
  private isListening: boolean = false;
  private initialized: boolean = false;
  private language: "en-US" | "pt-BR" = "pt-BR";
  private transcriptHandler:
    | (({ text, isFinal }: { text: string; isFinal: boolean }) => void)
    | null = null;
  private audioHandler: ((audio: Buffer) => void) | null = null;

  constructor() {
    console.log("IntelligenceManager constructor called");
  }

  private async init() {
    if (this.initialized) return;
    console.log("Initializing IntelligenceManager...");

    try {
      this.audioCapture = new SystemAudioCapture();
      console.log("SystemAudioCapture created");
    } catch (e) {
      console.error("Failed to create SystemAudioCapture:", e);
      throw e;
    }

    this.stt = new GoogleSTT();
    console.log("GoogleSTT created");

    this.initialized = true;
    console.log("IntelligenceManager initialized");
  }

  async start() {
    console.log("Starting Intelligence Manager");

    if (this.isListening) {
      console.log("Already listening, stopping first");
      this.stop();
    }

    await this.init();

    this.isListening = true;
    this.contextWindow = [];

    if (!this.audioCapture) {
      console.error("Audio capture not initialized");
      throw new Error("Audio capture not initialized");
    }

    if (this.stt) {
      this.transcriptHandler = ({
        text,
        isFinal,
      }: {
        text: string;
        isFinal: boolean;
      }) => {
        console.log(`[${isFinal ? "FINAL" : "INTERIM"}] ${text}`);

        if (isFinal) {
          this.handleTranscription(text);
        } else {
          this.sendInterimUpdate(text);
        }
      };

      this.stt.on("transcript", this.transcriptHandler);
      this.stt.start(this.language);

      this.stt.on("stopped", () => {
        if (this.isListening) {
          this.isListening = false;
          this.notifyListeningState(false);
        }
      });
    } else {
      console.log("No STT client - running in simulation mode");
    }

    this.audioHandler = (audio: Buffer) => {
      if (this.stt) {
        this.stt.write(audio);
      } else {
        const rms = this.calculateRMS(audio);
        if (rms > 0.01 && Math.random() > 0.95) {
          this.handleTranscription("[SIMULATED] User speech detected...");
        }
      }
    };

    this.audioCapture.on("data", this.audioHandler);
    try {
      this.audioCapture.start();
      this.notifyListeningState(true);
      console.log("Audio capture started successfully");
    } catch (e) {
      console.error("Failed to start audio capture:", e);
      if (this.stt) this.stt.stop();
      this.isListening = false;
      throw e;
    }
  }

  stop() {
    console.log("Stopping Intelligence Manager");

    if (!this.isListening) {
      console.log("Already stopped, skipping");
      return;
    }

    this.isListening = false;

    if (this.audioCapture) {
      if (this.audioHandler) {
        this.audioCapture.removeListener("data", this.audioHandler);
        this.audioHandler = null;
      }
      this.audioCapture.stop();
    }

    if (this.stt) {
      if (this.transcriptHandler) {
        this.stt.removeListener("transcript", this.transcriptHandler);
        this.transcriptHandler = null;
      }
      this.stt.removeAllListeners("stopped");
      this.stt.stop();
    }

    this.notifyListeningState(false);
    console.log("Intelligence Manager stopped");
  }

  getTranscript(): string[] {
    return [...this.contextWindow];
  }

  clearTranscript() {
    this.contextWindow = [];
  }

  getLanguage(): "en-US" | "pt-BR" {
    return this.language;
  }

  setLanguage(lang: "en-US" | "pt-BR") {
    this.language = lang;
  }

  private calculateRMS(buffer: Buffer): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      sum += sample * sample;
    }
    return Math.sqrt(sum / (buffer.length / 2)) / 32768;
  }

  private sendInterimUpdate(text: string) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("assist_update", {
        type: "interim",
        text: text,
        context: this.contextWindow,
      });
    });
  }

  private notifyListeningState(isListening: boolean) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("assist_update", {
        type: isListening ? "meeting_started" : "meeting_stopped",
      });
    });
  }

  private handleTranscription(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const lastEntry = this.contextWindow[this.contextWindow.length - 1];
    if (lastEntry === trimmed) {
      console.log("Skipping duplicate transcription:", trimmed);
      return;
    }

    this.contextWindow.push(trimmed);
    if (this.contextWindow.length > 20) {
      this.contextWindow.shift();
    }

    console.log("Transcription:", trimmed);

    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send("assist_update", {
        type: "transcription",
        text: trimmed,
        context: this.contextWindow,
      });
    });
  }
}

export const intelligenceManager = new IntelligenceManager();
