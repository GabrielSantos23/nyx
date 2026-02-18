import { ipcMain, safeStorage, app, globalShortcut } from "electron";
import { intelligenceManager } from "./IntelligenceManager";
import { windowHelper } from "./WindowHelper";
import { llmHelper } from "./LLMHelper";
import {
  buildTranscriptAnalysisPrompt,
  buildSummaryGenerationPrompt,
  buildChatAnalyticsPrompt,
  buildChatTitlePrompt,
} from "./prompts";
import { dbRequest } from "./db/DatabaseManager";
import { chatFileManager, ChatMessage } from "./db/ChatFileManager";
import { ThemeManager } from "./ThemeManager";
import { screenshotHelper } from "./ScreenshotHelper";
import * as path from "node:path";
import * as fs from "node:fs";

const credentialsPath = path.join(app.getPath("userData"), "credentials.json");

function loadCredentials(): Record<string, string> {
  try {
    if (fs.existsSync(credentialsPath)) {
      const data = fs.readFileSync(credentialsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load credentials:", e);
  }
  return {};
}

function saveCredentials(creds: Record<string, string>) {
  try {
    fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2));
  } catch (e) {
    console.error("Failed to save credentials:", e);
  }
}

export function registerHandlers() {
  const themeManager = ThemeManager.getInstance();

  ipcMain.on("quit-app", () => {
    app.quit();
  });

  ipcMain.handle("start-meeting", async (event, args) => {
    console.log("start-meeting handler called");
    try {
      console.log("Calling intelligenceManager.start()...");
      await intelligenceManager.start();
      console.log("intelligenceManager.start() completed");
      return { success: true };
    } catch (error: any) {
      console.error("start-meeting error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("stop-meeting", async () => {
    intelligenceManager.stop();
    const transcript = intelligenceManager.getTranscript();
    return { success: true, transcript };
  });

  ipcMain.handle("get-transcript", async () => {
    return intelligenceManager.getTranscript();
  });

  ipcMain.handle("clear-transcript", async () => {
    intelligenceManager.clearTranscript();
    return { success: true };
  });

  ipcMain.handle("get-language", async () => {
    return intelligenceManager.getLanguage();
  });

  ipcMain.handle("set-language", async (event, lang: "en-US" | "pt-BR") => {
    intelligenceManager.setLanguage(lang);
    return { success: true };
  });

  ipcMain.handle("toggle-overlay", async () => {
    windowHelper.toggleOverlay();
    return { success: true };
  });

  ipcMain.handle("show-overlay", async () => {
    windowHelper.showOverlay();
    return { success: true };
  });

  ipcMain.handle("hide-overlay", async () => {
    windowHelper.hideOverlay();
    return { success: true };
  });

  ipcMain.handle("is-overlay-visible", async () => {
    return windowHelper.isOverlayVisible();
  });

  ipcMain.handle("show-launcher", async () => {
    if (
      windowHelper.launcherWindow &&
      !windowHelper.launcherWindow.isDestroyed()
    ) {
      windowHelper.launcherWindow.show();
      windowHelper.launcherWindow.focus();
    } else {
      windowHelper.createLauncher();
    }
    return { success: true };
  });

  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }) => {
      windowHelper.setOverlayDimensions(width, height);
      return { success: true };
    },
  );

  ipcMain.handle(
    "ask-ai",
    async (
      event,
      prompt: string,
      chatHistory: { role: "user" | "assistant"; content: string }[],
    ) => {
      console.log("ask-ai called (continuous version)");
      const result = await llmHelper.generate(prompt, chatHistory || []);
      return result;
    },
  );

  ipcMain.handle(
    "ask-ai-stream",
    async (
      event,
      prompt: string,
      chatHistory: { role: "user" | "assistant"; content: string }[],
    ) => {
      console.log("ask-ai-stream called");
      try {
        await llmHelper.generateStream(prompt, chatHistory || [], (chunk) => {
          event.sender.send("ai-stream:token", chunk);
        });
        event.sender.send("ai-stream:done");
        return { success: true };
      } catch (e: any) {
        console.error("Stream error in handler:", e);
        event.sender.send("ai-stream:error", e.message || String(e));
        return { success: false, error: e.message };
      }
    },
  );

  ipcMain.handle("ask-ai-with-context", async (event, transcript: string[]) => {
    const prompt = buildTranscriptAnalysisPrompt(transcript);

    const response = await llmHelper.generate(prompt, transcript);
    return response;
  });

  ipcMain.handle(
    "generate-summary",
    async (
      _event,
      chatId: string,
      title: string,
      messages: Array<{ role: string; content: string }>,
    ) => {
      try {
        const existingChat = chatFileManager.getChatById(chatId);
        if (existingChat?.summary) {
          return {
            success: true,
            summary: existingChat.summary,
            cached: true,
          };
        }

        const prompt = buildSummaryGenerationPrompt(title, messages);
        const result = await llmHelper.generateSummaryWithGroq(prompt, []);

        try {
          const parsed = JSON.parse(result.content);
          const summary = {
            overview: parsed.overview || "",
            actionItems: parsed.actionItems || [],
            keyPoints: parsed.keyPoints || [],
            generatedAt: Date.now(),
          };

          chatFileManager.updateSummary(chatId, summary);

          return {
            success: true,
            summary,
            modelUsed: result.modelUsed,
          };
        } catch {
          const summary = {
            overview: result.content,
            actionItems: [],
            keyPoints: [],
            generatedAt: Date.now(),
          };

          chatFileManager.updateSummary(chatId, summary);

          return {
            success: true,
            summary,
            modelUsed: result.modelUsed,
          };
        }
      } catch (error: any) {
        console.error("Failed to generate summary:", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("generate-chat-title", async (_event, chatId: string) => {
    try {
      const chat = chatFileManager.getChatById(chatId);
      if (!chat) {
        return { success: false, error: "Chat not found" };
      }

      if (chat.titleGenerated) {
        return { success: true, title: chat.title, cached: true };
      }

      const prompt = buildChatTitlePrompt(
        chat.messages.map((m) => ({ role: m.role, content: m.content })),
      );
      const result = await llmHelper.generateTitleWithGroq(prompt);

      let title = result.content.trim();
      title = title.replace(/^["']|["']$/g, "");

      if (!title) {
        const firstMsg = chat.messages.find((m) => m.role === "user");
        title = firstMsg
          ? firstMsg.content.length > 50
            ? firstMsg.content.substring(0, 50) + "..."
            : firstMsg.content
          : "New Chat";
      }

      chatFileManager.updateTitle(chatId, title);

      return { success: true, title };
    } catch (error: any) {
      console.error("Failed to generate chat title:", error);

      try {
        const chat = chatFileManager.getChatById(chatId);
        if (chat) {
          const firstMsg = chat.messages.find((m) => m.role === "user");
          const fallbackTitle = firstMsg
            ? firstMsg.content.length > 50
              ? firstMsg.content.substring(0, 50) + "..."
              : firstMsg.content
            : "New Chat";
          chatFileManager.updateTitle(chatId, fallbackTitle);
          return { success: true, title: fallbackTitle, fallback: true };
        }
      } catch {}

      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "save-chat",
    async (event, { title, transcript, aiResponse }) => {
      const id = dbRequest.createChat(title, transcript, aiResponse);
      return { success: true, id };
    },
  );

  ipcMain.handle("get-all-chats", async () => {
    const chats = dbRequest.getAllChats();
    return chats;
  });

  ipcMain.handle("get-chat", async (event, id: number) => {
    const chat = dbRequest.getChatById(id);
    return chat;
  });

  ipcMain.handle("delete-chat", async (event, id: number) => {
    const success = dbRequest.deleteChat(id);
    return { success };
  });

  ipcMain.handle(
    "ask-ai-about-chat",
    async (
      _event,
      question: string,
      contextString: string,
      history: Array<{ role: "user" | "assistant"; content: string }>,
    ) => {
      try {
        const systemPrompt = buildChatAnalyticsPrompt(contextString);

        const augmentedHistory = [
          {
            role: "assistant" as const,
            content:
              "I understand the context. I'll answer questions about this chat based on the information provided.",
          },
          ...history,
        ];

        const result = await llmHelper.generateWithCustomSystemPrompt(
          question,
          augmentedHistory,
          systemPrompt,
        );
        return result;
      } catch (error: any) {
        console.error("ask-ai-about-chat error:", error);
        return { content: "", modelUsed: "error", error: error.message };
      }
    },
  );

  ipcMain.handle("create-chat-file", async (event, message: ChatMessage) => {
    const id = chatFileManager.createChat(message);
    return { success: !!id, id };
  });

  ipcMain.handle(
    "append-chat-message",
    async (event, chatId: string, message: ChatMessage) => {
      const success = chatFileManager.appendMessage(chatId, message);
      return { success };
    },
  );

  ipcMain.handle("get-all-chat-files", async () => {
    const chats = chatFileManager.getAllChats();
    return chats;
  });

  ipcMain.handle("get-chat-file", async (event, id: string) => {
    const chat = chatFileManager.getChatById(id);
    return chat;
  });

  ipcMain.handle("delete-chat-file", async (event, id: string) => {
    const success = chatFileManager.deleteChat(id);
    if (success) {
      windowHelper.sendToOverlay("assist_update", {
        type: "chat_deleted",
        chatId: id,
      });
    }
    return { success };
  });

  ipcMain.handle("load-chat-in-overlay", async (event, chatId: string) => {
    const chat = chatFileManager.getChatById(chatId);
    if (chat) {
      windowHelper.showOverlay();
      windowHelper.sendToOverlay("assist_update", {
        type: "load_chat",
        chat,
      });
    }
    return { success: !!chat };
  });

  ipcMain.handle(
    "set-titlebar-overlay",
    async (event, options: { color?: string; symbolColor?: string }) => {
      windowHelper.setTitleBarOverlay(options);
      return { success: true };
    },
  );

  ipcMain.handle("set-undetectable", async (event, state: boolean) => {
    windowHelper.setUndetectable(state);
    return { success: true };
  });

  ipcMain.handle("get-undetectable", async () => {
    return windowHelper.getUndetectable();
  });

  ipcMain.handle("theme:get", () => {
    return {
      mode: themeManager.getMode(),
      resolved: themeManager.getResolvedTheme(),
    };
  });

  ipcMain.handle("theme:set", (_event, mode: "system" | "light" | "dark") => {
    themeManager.setMode(mode);
    return {
      mode: themeManager.getMode(),
      resolved: themeManager.getResolvedTheme(),
    };
  });

  ipcMain.handle("take-screenshot", async () => {
    try {
      const result = await screenshotHelper.takeScreenshot();
      return { success: true, ...result };
    } catch (error: any) {
      console.error("take-screenshot error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("take-selective-screenshot", async () => {
    try {
      const result = await screenshotHelper.takeSelectiveScreenshot();
      return { success: true, ...result };
    } catch (error: any) {
      console.error("take-selective-screenshot error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-screenshot", async (_event, filePath: string) => {
    try {
      await screenshotHelper.deleteScreenshot(filePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "analyze-image-stream",
    async (event, prompt: string, imagePath: string, chatHistory: any[]) => {
      try {
        await llmHelper.analyzeImageWithStream(
          prompt,
          imagePath,
          chatHistory,
          (chunk) => {
            event.sender.send("ai-stream:token", chunk);
          },
        );
        event.sender.send("ai-stream:done");
        return { success: true };
      } catch (e: any) {
        console.error("Image analysis stream error:", e);
        event.sender.send("ai-stream:error", e.message || String(e));
        return { success: false, error: e.message };
      }
    },
  );

  ipcMain.handle("get-auto-launch", async () => {
    const autoLaunch = app.getLoginItemSettings();
    return {
      enabled: autoLaunch.openAtLogin,
      openAsHidden: autoLaunch.openAsHidden,
    };
  });

  ipcMain.handle("abort-ai-stream", async () => {
    llmHelper.abortStream();
    return { success: true };
  });

  ipcMain.handle(
    "set-auto-launch",
    async (_event, enabled: boolean, openAsHidden = false) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: openAsHidden,
          path: process.execPath,
        });
        return { success: true, enabled };
      } catch (error: any) {
        console.error("Failed to set auto-launch:", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("set-gemini-api-key", async (_event, key: string) => {
    try {
      const creds = loadCredentials();
      creds.geminiApiKey = key;
      saveCredentials(creds);
      windowHelper.sendToOverlay("credentials-changed", {
        hasGeminiKey: !!key,
        hasGroqKey: !!creds.groqApiKey,
        selectedModel: creds.selectedModel || null,
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to save Gemini API key:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("set-groq-api-key", async (_event, key: string) => {
    try {
      const creds = loadCredentials();
      creds.groqApiKey = key;
      saveCredentials(creds);
      windowHelper.sendToOverlay("credentials-changed", {
        hasGeminiKey: !!creds.geminiApiKey,
        hasGroqKey: !!key,
        selectedModel: creds.selectedModel || null,
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to save Groq API key:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-stored-credentials", async () => {
    const creds = loadCredentials();
    return {
      hasGeminiKey: !!creds.geminiApiKey,
      hasGroqKey: !!creds.groqApiKey,
      googleServiceAccountPath: creds.googleServiceAccountPath || null,
      selectedModel: creds.selectedModel || null,
    };
  });

  ipcMain.handle("has-env-groq-key", async () => {
    return !!process.env.GROQ_API_KEY;
  });

  ipcMain.handle("set-model", async (_event, model: string) => {
    try {
      llmHelper.setModel(model);
      const creds = loadCredentials();
      windowHelper.sendToOverlay("credentials-changed", {
        hasGeminiKey: !!creds.geminiApiKey,
        hasGroqKey: !!creds.groqApiKey,
        selectedModel: model,
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to set model:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-available-ollama-models", async () => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error("Failed to get Ollama models:", error);
      return [];
    }
  });

  ipcMain.handle("force-restart-ollama", async () => {
    try {
      const { spawn } = await import("child_process");
      return await new Promise((resolve) => {
        try {
          const ollamaProcess = spawn("ollama", ["serve"], {
            detached: true,
            stdio: "ignore",
          });

          ollamaProcess.on("error", (err: Error) => {
            console.error("Failed to spawn Ollama:", err.message);
            resolve({ success: false, error: err.message });
          });

          setTimeout(() => {
            ollamaProcess.unref();
            resolve({ success: true });
          }, 500);
        } catch (err: any) {
          console.error("Failed to spawn Ollama:", err.message);
          resolve({ success: false, error: err.message });
        }
      });
    } catch (error: any) {
      console.error("Failed to restart Ollama:", error);
      return { success: false, error: error.message };
    }
  });

  registerGlobalShortcuts();
}

export function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  globalShortcut.register("CommandOrControl+B", () => {
    windowHelper.toggleOverlay();
  });

  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    windowHelper.showOverlay();
    windowHelper.centerOverlay();
  });

  globalShortcut.register("CommandOrControl+R", () => {
    windowHelper.sendToOverlay("keybind-action", { action: "reset" });
  });

  globalShortcut.register("CommandOrControl+Enter", () => {
    windowHelper.sendToOverlay("keybind-action", { action: "process" });
  });

  globalShortcut.register("CommandOrControl+Up", () => {
    windowHelper.moveOverlay("up");
  });

  globalShortcut.register("CommandOrControl+Down", () => {
    windowHelper.moveOverlay("down");
  });

  globalShortcut.register("CommandOrControl+Left", () => {
    windowHelper.moveOverlay("left");
  });

  globalShortcut.register("CommandOrControl+Right", () => {
    windowHelper.moveOverlay("right");
  });

  globalShortcut.register("CommandOrControl+H", async () => {
    try {
      const result = await screenshotHelper.takeScreenshot();
      if (result.path) {
        windowHelper.showOverlay();
        windowHelper.sendToOverlay("screenshot-captured", result);
      }
    } catch (e) {
      console.error("Screenshot shortcut error:", e);
    }
  });

  globalShortcut.register("CommandOrControl+Shift+H", async () => {
    try {
      const result = await screenshotHelper.takeSelectiveScreenshot();
      if (result.path) {
        windowHelper.showOverlay();
        windowHelper.sendToOverlay("screenshot-captured", result);
      }
    } catch (e) {
      console.error("Selective screenshot shortcut error:", e);
    }
  });
}
