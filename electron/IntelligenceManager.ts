import { BrowserWindow } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { app } from "electron";
import { SystemAudioCapture } from "./audio/SystemAudioCapture";
import { GoogleSTT } from "./audio/GoogleSTT";
import { BrowserMicSTT } from "./audio/WebSpeechSTT";
import { llmHelper } from "./LLMHelper";

type STTProvider = "web" | "google";

const credentialsPath = path.join(app.getPath("userData"), "credentials.json");

function loadCredentialsData(): Record<string, any> {
  try {
    if (fs.existsSync(credentialsPath)) {
      return JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load credentials:", e);
  }
  return {};
}

function saveCredentialsData(updates: Record<string, any>): void {
  try {
    let data: Record<string, any> = {};
    if (fs.existsSync(credentialsPath)) {
      data = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    }
    Object.assign(data, updates);
    fs.writeFileSync(credentialsPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save credentials data:", e);
  }
}

function loadSTTProvider(): STTProvider {
  const data = loadCredentialsData();
  if (data.sttProvider === "google") return "google";
  return "web";
}

function loadLanguage(): "en-US" | "pt-BR" {
  const data = loadCredentialsData();
  if (data.language === "en-US" || data.language === "pt-BR")
    return data.language;
  return "en-US";
}

export class IntelligenceManager {
  private audioCapture: SystemAudioCapture | null = null;
  private stt: GoogleSTT | BrowserMicSTT | null = null;
  private contextWindow: string[] = [];
  private isListening: boolean = false;
  private initialized: boolean = false;
  private language: "en-US" | "pt-BR" = "en-US";
  private sttProvider: STTProvider = "web";
  private transcriptHandler:
    | (({ text, isFinal }: { text: string; isFinal: boolean }) => void)
    | null = null;
  private audioHandler: ((audio: Buffer) => void) | null = null;

  constructor() {
    console.log("IntelligenceManager constructor called");
    this.sttProvider = loadSTTProvider();
    this.language = loadLanguage();
    console.log("STT provider:", this.sttProvider, "Language:", this.language);
  }

  private async init() {
    if (this.initialized) return;
    console.log("Initializing IntelligenceManager...");

    if (this.sttProvider === "google") {
      try {
        this.audioCapture = new SystemAudioCapture();
        console.log("SystemAudioCapture created");
      } catch (e) {
        console.error("Failed to create SystemAudioCapture:", e);
        console.warn(
          "Falling back to BrowserMicSTT (native module not available)",
        );
        // Native module not available (e.g. in production build)
        // Fall back to BrowserMicSTT which captures mic audio and sends to backend
        this.audioCapture = null;
        this.stt = new BrowserMicSTT();
        this.initialized = true;
        console.log(
          "IntelligenceManager initialized (fallback to mic capture)",
        );
        return;
      }

      this.stt = new GoogleSTT();
      console.log("GoogleSTT created");
    } else {
      this.stt = new BrowserMicSTT();
      console.log("BrowserMicSTT created (mic capture → backend STT)");
    }

    this.initialized = true;
    console.log("IntelligenceManager initialized");
  }

  async start() {
    console.log("Starting Intelligence Manager");

    if (this.isListening) {
      console.log("Already listening, stopping first");
      this.stop();
    }

    this.initialized = false;
    await this.init();

    this.isListening = true;
    this.contextWindow = [];

    // If google provider was selected but native module failed, we've already
    // fallen back to BrowserMicSTT in init(), so no need to check audioCapture here.

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

    if (this.sttProvider === "google" && this.audioCapture) {
      this.audioHandler = (audio: Buffer) => {
        if (this.stt) {
          this.stt.write(audio);
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
    } else {
      this.notifyListeningState(true);
      console.log("Web Speech API mode - microphone handled by browser");
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
    saveCredentialsData({ language: lang });
    console.log("Language saved:", lang);
  }

  getSTTProvider(): STTProvider {
    return this.sttProvider;
  }

  setSTTProvider(provider: STTProvider) {
    this.sttProvider = provider;
    saveCredentialsData({ sttProvider: provider });
    this.initialized = false;
    this.audioCapture = null;
    if (this.stt && "destroy" in this.stt) {
      (this.stt as BrowserMicSTT).destroy();
    }
    this.stt = null;
    console.log("STT provider changed to:", provider);
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
