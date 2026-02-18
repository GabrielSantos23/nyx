import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startMeeting: () => ipcRenderer.invoke("start-meeting"),
  stopMeeting: () => ipcRenderer.invoke("stop-meeting"),
  toggleOverlay: () => ipcRenderer.invoke("toggle-overlay"),
  showOverlay: () => ipcRenderer.invoke("show-overlay"),
  hideOverlay: () => ipcRenderer.invoke("hide-overlay"),
  isOverlayVisible: () => ipcRenderer.invoke("is-overlay-visible"),
  showLauncher: () => ipcRenderer.invoke("show-launcher"),
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  askAI: (
    prompt: string,
    chatHistory?: { role: "user" | "assistant"; content: string }[],
  ) => ipcRenderer.invoke("ask-ai", prompt, chatHistory),
  askAIWithContext: (transcript: string[]) =>
    ipcRenderer.invoke("ask-ai-with-context", transcript),
  streamAI: (
    prompt: string,
    chatHistory?: { role: "user" | "assistant"; content: string }[],
  ) => ipcRenderer.invoke("ask-ai-stream", prompt, chatHistory),
  onStreamToken: (callback: (token: string) => void) => {
    const handler = (_event: any, token: string) => callback(token);
    ipcRenderer.on("ai-stream:token", handler);
    return () => ipcRenderer.removeListener("ai-stream:token", handler);
  },
  onStreamDone: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("ai-stream:done", handler);
    return () => ipcRenderer.removeListener("ai-stream:done", handler);
  },
  onStreamError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on("ai-stream:error", handler);
    return () => ipcRenderer.removeListener("ai-stream:error", handler);
  },
  abortAIStream: () => ipcRenderer.invoke("abort-ai-stream"),
  generateSummary: (
    chatId: string,
    title: string,
    messages: Array<{ role: string; content: string }>,
  ) => ipcRenderer.invoke("generate-summary", chatId, title, messages),
  askAIAboutChat: (
    question: string,
    contextString: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
  ) =>
    ipcRenderer.invoke("ask-ai-about-chat", question, contextString, history),
  getTranscript: () => ipcRenderer.invoke("get-transcript"),
  clearTranscript: () => ipcRenderer.invoke("clear-transcript"),
  getLanguage: () => ipcRenderer.invoke("get-language"),
  setLanguage: (lang: "en-US" | "pt-BR") =>
    ipcRenderer.invoke("set-language", lang),
  onAssistUpdate: (callback: (data: any) => void) => {
    const handler = (_event: any, value: any) => callback(value);
    ipcRenderer.on("assist_update", handler);
    return () => ipcRenderer.removeListener("assist_update", handler);
  },
  saveChat: (chat: { title: string; transcript: string; aiResponse: string }) =>
    ipcRenderer.invoke("save-chat", chat),
  getAllChats: () => ipcRenderer.invoke("get-all-chats"),
  getChat: (id: number) => ipcRenderer.invoke("get-chat", id),
  deleteChat: (id: number) => ipcRenderer.invoke("delete-chat", id),
  createChatFile: (message: {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }) => ipcRenderer.invoke("create-chat-file", message),
  appendChatMessage: (
    chatId: string,
    message: {
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      thinking?: string;
    },
  ) => ipcRenderer.invoke("append-chat-message", chatId, message),
  getAllChatFiles: () => ipcRenderer.invoke("get-all-chat-files"),
  getChatFile: (id: string) => ipcRenderer.invoke("get-chat-file", id),
  deleteChatFile: (id: string) => ipcRenderer.invoke("delete-chat-file", id),
  loadChatInOverlay: (chatId: string) =>
    ipcRenderer.invoke("load-chat-in-overlay", chatId),
  generateChatTitle: (chatId: string) =>
    ipcRenderer.invoke("generate-chat-title", chatId),
  setTitleBarOverlay: (options: { color?: string; symbolColor?: string }) =>
    ipcRenderer.invoke("set-titlebar-overlay", options),
  setUndetectable: (state: boolean) =>
    ipcRenderer.invoke("set-undetectable", state),
  getUndetectable: () => ipcRenderer.invoke("get-undetectable"),
  onUndetectableChanged: (callback: (state: boolean) => void) => {
    const handler = (_event: any, state: boolean) => callback(state);
    ipcRenderer.on("undetectable-changed", handler);
    return () => ipcRenderer.removeListener("undetectable-changed", handler);
  },
  getTheme: () => ipcRenderer.invoke("theme:get"),
  setTheme: (mode: "system" | "light" | "dark") =>
    ipcRenderer.invoke("theme:set", mode),
  onThemeChanged: (
    callback: (theme: { mode: string; resolved: string }) => void,
  ) => {
    const handler = (_event: any, theme: { mode: string; resolved: string }) =>
      callback(theme);
    ipcRenderer.on("theme:changed", handler);
    return () => ipcRenderer.removeListener("theme:changed", handler);
  },
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled: boolean, openAsHidden?: boolean) =>
    ipcRenderer.invoke("set-auto-launch", enabled, openAsHidden),
  setGeminiApiKey: (key: string) =>
    ipcRenderer.invoke("set-gemini-api-key", key),
  setGroqApiKey: (key: string) => ipcRenderer.invoke("set-groq-api-key", key),
  getStoredCredentials: () => ipcRenderer.invoke("get-stored-credentials"),
  onKeybindAction: (callback: (data: { action: string }) => void) => {
    const handler = (_event: any, data: { action: string }) => callback(data);
    ipcRenderer.on("keybind-action", handler);
    return () => ipcRenderer.removeListener("keybind-action", handler);
  },
  onScreenshotCaptured: (
    callback: (data: { path: string; preview: string }) => void,
  ) => {
    const handler = (_event: any, data: { path: string; preview: string }) =>
      callback(data);
    ipcRenderer.on("screenshot-captured", handler);
    return () => ipcRenderer.removeListener("screenshot-captured", handler);
  },
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  takeSelectiveScreenshot: () =>
    ipcRenderer.invoke("take-selective-screenshot"),
  deleteScreenshot: (filePath: string) =>
    ipcRenderer.invoke("delete-screenshot", filePath),
  analyzeImageStream: (
    prompt: string,
    imagePath: string,
    chatHistory: { role: "user" | "assistant"; content: string }[],
  ) =>
    ipcRenderer.invoke("analyze-image-stream", prompt, imagePath, chatHistory),
  onCredentialsChanged: (callback: (creds: any) => void) => {
    const handler = (_event: any, creds: any) => callback(creds);
    ipcRenderer.on("credentials-changed", handler);
    return () => ipcRenderer.removeListener("credentials-changed", handler);
  },
  onOverlayVisibilityChanged: (callback: (isVisible: boolean) => void) => {
    const handler = (_event: any, isVisible: boolean) => callback(isVisible);
    ipcRenderer.on("overlay-visibility-changed", handler);
    return () =>
      ipcRenderer.removeListener("overlay-visibility-changed", handler);
  },
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  openReleasesPage: () => ipcRenderer.invoke("open-releases-page"),
  downloadUpdate: () => ipcRenderer.invoke("open-releases-page"),
  onUpdateChecking: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("update-checking", handler);
    return () => ipcRenderer.removeListener("update-checking", handler);
  },
  onUpdateAvailable: (callback: (release?: any) => void) => {
    const handler = (_event: any, release?: any) => callback(release);
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("update-not-available", handler);
    return () => ipcRenderer.removeListener("update-not-available", handler);
  },
  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },

  quitApp: () => {
    require("electron").ipcRenderer.send("quit-app");
  },
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
});
