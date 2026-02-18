import Header from "@/components/header";
import Chats from "@/components/chats";
import ChatOverlay from "@/components/ChatOverlay";
import { SettingsOverlay } from "@/components/settings";
import { useElectron } from "../hooks/useElectron";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight, Settings } from "lucide-react";
import { Banner } from "@/components/banner";
import { ChatFile } from "@/components/types";
import { ChatDetails } from "../components/ChatDetails";

const THEME_COLORS = {
  dark: { color: "#050505", symbolColor: "#ffffff" },
  light: { color: "#f2efe9", symbolColor: "#000000" },
};

export default function Launcher() {
  const electron = useElectron();
  const [chats, setChats] = useState<ChatFile[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatFile | null>(null);
  const [forwardChat, setForwardChat] = useState<ChatFile | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayChat, setOverlayChat] = useState<ChatFile | null>(null);
  const [overlayInitialQuery, setOverlayInitialQuery] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetectable, setIsDetectable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  const updateTitleBarTheme = useCallback(() => {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    const colors =
      THEME_COLORS[theme as keyof typeof THEME_COLORS] || THEME_COLORS.dark;
    (window as any).electronAPI?.setTitleBarOverlay(colors);
  }, []);

  useEffect(() => {
    updateTitleBarTheme();

    const observer = new MutationObserver(() => {
      updateTitleBarTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [updateTitleBarTheme]);

  const meetings = useMemo(
    () =>
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        date: new Date(chat.createdAt).toISOString(),
        duration: "",
        summary: chat.messages[chat.messages.length - 1]?.content || "",
      })),
    [chats],
  );

  useEffect(() => {
    if (window.electronAPI?.getUndetectable) {
      window.electronAPI.getUndetectable().then(setIsDetectable);
    }

    const unsubscribe = window.electronAPI?.onUndetectableChanged?.(
      (newState) => {
        setIsDetectable(newState);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkOverlayVisibility = async () => {
      const visible = await window.electronAPI?.isOverlayVisible?.();
      setIsOverlayVisible(visible ?? false);
    };
    checkOverlayVisibility();

    const unsubscribe = window.electronAPI?.onOverlayVisibilityChanged?.(
      (isVisible) => {
        setIsOverlayVisible(isVisible);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const savedChats = await window.electronAPI?.getAllChatFiles();
      setChats(savedChats || []);
    } catch (e) {
      console.error("Failed to load chats", e);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    const handler = (data: { type: string }) => {
      if (data.type === "chat_deleted" || data.type === "chat_created") {
        loadChats();
      }
    };

    const cleanup = electron?.onAssistUpdate?.(handler);

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [electron, loadChats]);

  const handleOpenChat = useCallback((chat: ChatFile) => {
    setForwardChat(null);
    setSelectedChat(chat);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedChat) {
      setForwardChat(selectedChat);
      setSelectedChat(null);
    }
  }, [selectedChat]);

  const handleForward = useCallback(() => {
    if (forwardChat) {
      setSelectedChat(forwardChat);
      setForwardChat(null);
    }
  }, [forwardChat]);

  const handleChatUpdate = useCallback((updatedChat: ChatFile) => {
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)),
    );
    setSelectedChat(updatedChat);
  }, []);

  const handleOpenOverlay = useCallback(
    (chat: ChatFile, initialQuery?: string) => {
      setOverlayChat(chat);
      setOverlayInitialQuery(initialQuery || "");
      setIsOverlayOpen(true);
    },
    [],
  );

  const handleCloseOverlay = useCallback(() => {
    setIsOverlayOpen(false);
    setOverlayChat(null);
    setOverlayInitialQuery("");
    setIsOverlayVisible(false);
    window.electronAPI?.hideOverlay?.();
    loadChats();
  }, [loadChats]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleBannerRefresh = useCallback(async () => {
    await loadChats();
    setRefreshKey((k) => k + 1);
  }, [loadChats]);

  return (
    <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden selection:bg-accent-secondary/30">
      <header className="h-[40px] relative shrink-0 flex items-center justify-between pl-0 pr-2 drag-region select-none bg-bg-secondary border-b border-border-subtle z-[200]">
        <div className="flex items-center gap-1 no-drag">
          <div className="flex items-center gap-3 no-drag">
            <button
              onClick={handleOpenSettings}
              className="p-2 text-text-secondary hover:text-text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
          <button
            onClick={selectedChat ? handleBack : undefined}
            disabled={!selectedChat}
            className={`
              transition-all duration-300 p-1 flex items-center justify-center mt-1 ml-2
              ${
                selectedChat
                  ? "text-text-secondary hover:text-text-primary hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] cursor-pointer"
                  : "text-text-tertiary opacity-50 cursor-default"
              }
            `}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={handleForward}
            disabled={!forwardChat}
            className={`
              transition-all duration-300 p-1 flex items-center justify-center mt-1
              ${
                forwardChat
                  ? "text-text-secondary hover:text-text-primary hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] cursor-pointer"
                  : "text-text-tertiary opacity-0 cursor-default"
              }
            `}
          >
            <ArrowRight size={16} />
          </button>
        </div>
        {!selectedChat && (
          <Header
            meetings={meetings}
            onAIQuery={(query) => {
              const matchingChat = chats.find(
                (c) =>
                  c.title.toLowerCase().includes(query.toLowerCase()) ||
                  c.messages.some((m) =>
                    m.content.toLowerCase().includes(query.toLowerCase()),
                  ),
              );
              if (matchingChat) {
                handleOpenChat(matchingChat);
              }
            }}
            onLiteralSearch={() => {}}
            onOpenMeeting={(meetingId) => {
              const chat = chats.find((c) => c.id === meetingId);
              if (chat) {
                handleOpenChat(chat);
              }
            }}
          />
        )}
      </header>

      {isDetectable && (
        <div className="absolute top-[41px] left-1 right-1 bottom-1 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none z-[100]" />
      )}
      {!selectedChat && (
        <Banner
          onRefresh={handleBannerRefresh}
          isOverlayVisible={isOverlayVisible}
          onCloseOverlay={handleCloseOverlay}
        />
      )}

      {selectedChat ? (
        <ChatDetails
          chat={selectedChat}
          onBack={handleBack}
          onUpdate={handleChatUpdate}
          onOpenOverlay={handleOpenOverlay}
        />
      ) : (
        <Chats onOpenChat={handleOpenChat} refreshKey={refreshKey} />
      )}

      <ChatOverlay
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        chatContext={{
          title: overlayChat?.title || "",
          createdAt: overlayChat?.createdAt || 0,
          messages: overlayChat?.messages || [],
        }}
        initialQuery={overlayInitialQuery}
      />

      <SettingsOverlay isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </div>
  );
}
