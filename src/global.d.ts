export {};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  images?: string[];
  thinking?: string;
  rawContent?: string;
}

interface ChatSummary {
  overview: string;
  actionItems: string[];
  keyPoints: string[];
  generatedAt: number;
}

interface ChatFile {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  summary?: ChatSummary;
  titleGenerated?: boolean;
}

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

declare global {
  interface Window {
    electronAPI: {
      startMeeting: () => Promise<{ success: boolean; error?: string }>;
      stopMeeting: () => Promise<{
        success: boolean;
        error?: string;
        transcript?: string[];
      }>;

      toggleOverlay: () => Promise<{ success: boolean; error?: string }>;
      showOverlay: () => Promise<{ success: boolean }>;
      hideOverlay: () => Promise<{ success: boolean }>;
      isOverlayVisible: () => Promise<boolean>;
      showLauncher: () => Promise<{ success: boolean }>;
      updateContentDimensions: (dimensions: {
        width: number;
        height: number;
      }) => Promise<{ success: boolean }>;
      onOverlayVisibilityChanged: (
        callback: (isVisible: boolean) => void,
      ) => (() => void) | void;

      askAI: (
        prompt: string,
        chatHistory?: { role: "user" | "assistant"; content: string }[],
      ) => Promise<any>;
      askAIWithContext: (transcript: string[]) => Promise<any>;
      streamAI: (
        prompt: string,
        chatHistory?: { role: "user" | "assistant"; content: string }[],
      ) => Promise<{ success: boolean; error?: string }>;
      onStreamToken: (callback: (token: string) => void) => (() => void) | void;
      onStreamDone: (callback: () => void) => (() => void) | void;
      onStreamError: (callback: (error: string) => void) => (() => void) | void;
      abortAIStream: () => Promise<{ success: boolean }>;
      generateSummary: (
        chatId: string,
        title: string,
        messages: Array<{ role: string; content: string }>,
      ) => Promise<{
        success: boolean;
        summary?: {
          overview: string;
          actionItems: string[];
          keyPoints: string[];
          generatedAt: number;
        };
        modelUsed?: string;
        cached?: boolean;
        error?: string;
      }>;
      askAIAboutChat: (
        question: string,
        contextString: string,
        history: Array<{ role: "user" | "assistant"; content: string }>,
      ) => Promise<any>;

      setGeminiApiKey: (
        key: string,
      ) => Promise<{ success: boolean; error?: string }>;
      setGroqApiKey: (
        key: string,
      ) => Promise<{ success: boolean; error?: string }>;
      getStoredCredentials: () => Promise<{
        hasGeminiKey: boolean;
        hasGroqKey: boolean;
        googleServiceAccountPath: string | null;
        selectedModel: string | null;
      }>;

      getTranscript: () => Promise<string[]>;
      clearTranscript: () => Promise<{ success: boolean }>;

      getLanguage: () => Promise<string>;
      setLanguage: (lang: "en-US" | "pt-BR") => Promise<{ success: boolean }>;

      getRecognitionLanguages: () => Promise<Record<string, any>>;
      setRecognitionLanguage: (key: string) => Promise<{ success: boolean }>;

      onAssistUpdate: (callback: (data: any) => void) => (() => void) | void;
      saveChat: (chat: {
        title: string;
        transcript: string;
        aiResponse: string;
      }) => Promise<{ success: boolean; id?: number }>;
      getAllChats: () => Promise<any[]>;
      getChat: (id: number) => Promise<any>;
      deleteChat: (id: number) => Promise<{ success: boolean }>;

      createChatFile: (
        message: ChatMessage,
      ) => Promise<{ success: boolean; id?: string }>;
      appendChatMessage: (
        chatId: string,
        message: ChatMessage,
      ) => Promise<{ success: boolean }>;
      getAllChatFiles: () => Promise<ChatFile[]>;
      getChatFile: (id: string) => Promise<ChatFile | null>;
      deleteChatFile: (id: string) => Promise<{ success: boolean }>;
      loadChatInOverlay: (chatId: string) => Promise<{ success: boolean }>;
      generateChatTitle: (chatId: string) => Promise<{
        success: boolean;
        title?: string;
        cached?: boolean;
        fallback?: boolean;
        error?: string;
      }>;

      setTitleBarOverlay: (options: {
        color?: string;
        symbolColor?: string;
      }) => Promise<{ success: boolean }>;
      setUndetectable: (state: boolean) => Promise<{ success: boolean }>;
      getUndetectable: () => Promise<boolean>;
      onUndetectableChanged: (
        callback: (state: boolean) => void,
      ) => (() => void) | void;

      getTheme: () => Promise<{
        mode: ThemeMode;
        resolved: ResolvedTheme;
      }>;
      setTheme: (mode: ThemeMode) => Promise<{
        mode: ThemeMode;
        resolved: ResolvedTheme;
      }>;
      onThemeChanged: (
        callback: (theme: { mode: ThemeMode; resolved: ResolvedTheme }) => void,
      ) => () => void;

      getAutoLaunch: () => Promise<{
        enabled: boolean;
        openAsHidden: boolean;
      }>;
      setAutoLaunch: (
        enabled: boolean,
        openAsHidden?: boolean,
      ) => Promise<{
        success: boolean;
        enabled?: boolean;
        error?: string;
      }>;

      getOpenAtLogin: () => Promise<boolean>;
      setOpenAtLogin: (enabled: boolean) => Promise<{ success: boolean }>;

      checkForUpdates: () => Promise<void>;
      onUpdateChecking: (callback: () => void) => (() => void) | void;
      onUpdateAvailable: (callback: () => void) => (() => void) | void;
      onUpdateNotAvailable: (callback: () => void) => (() => void) | void;
      onUpdateError: (callback: (error: string) => void) => (() => void) | void;

      getCalendarStatus: () => Promise<{
        connected: boolean;
        email?: string;
      }>;
      calendarConnect: () => Promise<{ success: boolean }>;
      calendarDisconnect: () => Promise<{ success: boolean }>;

      quitApp: () => void;

      onKeybindAction: (
        callback: (data: { action: string }) => void,
      ) => (() => void) | void;

      takeScreenshot: () => Promise<{
        success: boolean;
        path?: string;
        preview?: string;
        error?: string;
      }>;
      takeSelectiveScreenshot: () => Promise<{
        success: boolean;
        path?: string;
        preview?: string;
        error?: string;
      }>;
      deleteScreenshot: (
        filePath: string,
      ) => Promise<{ success: boolean; error?: string }>;
      onScreenshotCaptured: (
        callback: (data: { path: string; preview: string }) => void,
      ) => (() => void) | void;
      analyzeImageStream: (
        prompt: string,
        imagePath: string,
        chatHistory: { role: "user" | "assistant"; content: string }[],
      ) => Promise<{ success: boolean; error?: string }>;
      onCredentialsChanged: (
        callback: (creds: {
          hasGeminiKey: boolean;
          hasGroqKey: boolean;
          selectedModel: string | null;
        }) => void,
      ) => (() => void) | void;
    };
  }
}
