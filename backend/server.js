const http = require("http");
const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");

const require2 = createRequire(path.join(__dirname, "package.json"));
const { WebSocketServer } = require2("ws");

const WS_OPEN = 1;

const CREDENTIALS_PATH = path.join(
  __dirname,
  "gen-lang-client-0576003659-31dbf58404ac.json",
);

console.log("[Backend] Looking for credentials at:", CREDENTIALS_PATH);

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(
    `[Backend] ❌ Service account file not found at: ${CREDENTIALS_PATH}\n` +
      `Please place the gen-lang-client-*.json file inside the backend/ folder.`,
  );
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
console.log(
  "[Backend] GOOGLE_APPLICATION_CREDENTIALS set to:",
  CREDENTIALS_PATH,
);

let speech;
try {
  speech = require2("@google-cloud/speech");
  console.log("[Backend] @google-cloud/speech loaded OK");
} catch (err) {
  console.error(
    "[Backend] ❌ Failed to load @google-cloud/speech:",
    err.stack || err,
  );
  process.exit(1);
}

const PORT = process.env.BACKEND_PORT || 3001;

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "nyx-backend" }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  console.log("[Backend] New Electron client connected");

  let sttClient = null;
  let recognizeStream = null;
  let language = "en-US";
  let isActive = true;
  let restartCount = 0;
  const MAX_RESTARTS = 5;

  function startSTTStream(lang) {
    if (!isActive) return;

    language = lang || "en-US";
    restartCount = 0;
    console.log(`[Backend] Starting Google STT stream (language: ${language})`);
    createStream();
  }

  function createStream() {
    if (!isActive) return;
    if (restartCount >= MAX_RESTARTS) {
      console.error("[Backend] Max STT restarts reached, giving up");
      if (ws.readyState === WS_OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Max STT restarts reached",
          }),
        );
      }
      return;
    }

    try {
      sttClient = new speech.SpeechClient();
      console.log("[Backend] SpeechClient created OK");

      recognizeStream = sttClient
        .streamingRecognize({
          config: {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: language,
            enableAutomaticPunctuation: true,
            model: "latest_long",
          },
          interimResults: true,
        })
        .on("error", (err) => {
          console.error(
            "[Backend] STT stream error:",
            err.message,
            err.code || "",
          );
          recognizeStream = null;
          if (!isActive) return;
          if (ws.readyState === WS_OPEN) {
            ws.send(JSON.stringify({ type: "error", message: err.message }));
          }
          restartCount++;
          setTimeout(() => createStream(), 1500);
        })
        .on("data", (data) => {
          if (data.results[0]?.alternatives[0]) {
            const transcript = {
              type: "transcript",
              text: data.results[0].alternatives[0].transcript,
              isFinal: data.results[0].isFinal,
            };
            if (ws.readyState === WS_OPEN) {
              ws.send(JSON.stringify(transcript));
            }
          }
        })
        .on("end", () => {
          console.log("[Backend] STT stream ended naturally");
          recognizeStream = null;
          if (!isActive) return;
          restartCount++;
          setTimeout(() => createStream(), 500);
        });

      if (ws.readyState === WS_OPEN) {
        ws.send(JSON.stringify({ type: "started", language }));
      }
      console.log("[Backend] STT stream created, waiting for audio...");
    } catch (err) {
      console.error("[Backend] Failed to create STT stream:", err.stack || err);
      if (ws.readyState === WS_OPEN) {
        ws.send(JSON.stringify({ type: "error", message: err.message }));
      }
    }
  }

  function stopSTTStream() {
    isActive = false;
    if (recognizeStream) {
      try {
        recognizeStream.end();
      } catch (e) {
        console.error("[Backend] Error ending stream:", e);
      }
      recognizeStream = null;
    }
    if (sttClient) {
      try {
        sttClient.close();
      } catch (e) {}
      sttClient = null;
    }
    console.log("[Backend] STT stream stopped");
    if (ws.readyState === WS_OPEN) {
      ws.send(JSON.stringify({ type: "stopped" }));
    }
  }

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      if (
        recognizeStream &&
        !recognizeStream.destroyed &&
        recognizeStream.writable
      ) {
        try {
          recognizeStream.write(data);
        } catch (e) {
          console.error("[Backend] Error writing audio to STT:", e);
        }
      }
      return;
    }

    try {
      const msg = JSON.parse(data.toString());
      console.log("[Backend] Received control message:", msg.type);
      switch (msg.type) {
        case "start":
          isActive = true;
          startSTTStream(msg.language || "en-US");
          break;
        case "stop":
          stopSTTStream();
          break;
        default:
          console.warn("[Backend] Unknown message type:", msg.type);
      }
    } catch (e) {
      console.error("[Backend] Failed to parse message:", e);
    }
  });

  ws.on("close", () => {
    console.log("[Backend] Electron client disconnected");
    stopSTTStream();
    sttClient = null;
  });

  ws.on("error", (err) => {
    console.error("[Backend] WebSocket error:", err);
  });
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`[Backend] ✅ Nyx backend running on ws://127.0.0.1:${PORT}`);
  console.log(
    `[Backend] 🔐 Using credentials: ${path.basename(CREDENTIALS_PATH)}`,
  );
});

process.on("SIGTERM", () => {
  console.log("[Backend] Shutting down...");
  wss.close();
  httpServer.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Backend] Shutting down...");
  wss.close();
  httpServer.close();
  process.exit(0);
});
