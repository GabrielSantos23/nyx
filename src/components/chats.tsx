import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ChatFile } from "./types";
import { useElectron } from "@/hooks/useElectron";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  }
}

function groupChatsByDate(chats: ChatFile[]): Record<string, ChatFile[]> {
  const groups: Record<string, ChatFile[]> = {};

  const sortedChats = [...chats].sort((a, b) => b.createdAt - a.createdAt);

  for (const chat of sortedChats) {
    const date = new Date(chat.createdAt);
    const label = getDateLabel(date);

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(chat);
  }

  return groups;
}

function generateChatPDF(chat: ChatFile): void {
  const content = `
Chat: ${chat.title}
Date: ${new Date(chat.createdAt).toLocaleString()}

Messages:
${chat.messages.map((m) => `[${m.role}]: ${m.content}`).join("\n\n")}
  `.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chat.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ChatsProps {
  onOpenChat?: (chat: ChatFile) => void;
  refreshKey?: number;
}

export default function Chats({ onOpenChat, refreshKey }: ChatsProps) {
  const [chats, setChats] = useState<ChatFile[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuEntered, setMenuEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingTitles, setGeneratingTitles] = useState<Set<string>>(
    new Set(),
  );
  const electron = useElectron();
  const titleQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  const processNextInQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    if (titleQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;
    const chatId = titleQueueRef.current.shift()!;

    setGeneratingTitles((prev) => new Set(prev).add(chatId));

    try {
      const result = await window.electronAPI?.generateChatTitle(chatId);
      if (result?.success && result.title) {
        const newTitle = result.title;
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? { ...c, title: newTitle, titleGenerated: true }
              : c,
          ),
        );
      }
    } catch (e) {
      console.error(`Failed to generate title for chat ${chatId}`, e);
    } finally {
      setGeneratingTitles((prev) => {
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });

      isProcessingQueueRef.current = false;

      if (titleQueueRef.current.length > 0) {
        processNextInQueue();
      }
    }
  }, []);

  const enqueueTitleGeneration = useCallback(
    (chatList: ChatFile[]) => {
      const needsTitle = chatList.filter(
        (c) => !c.titleGenerated && c.messages.length > 0,
      );

      if (needsTitle.length === 0) return;

      const currentQueue = new Set(titleQueueRef.current);
      for (const chat of needsTitle) {
        if (!currentQueue.has(chat.id)) {
          titleQueueRef.current.push(chat.id);
        }
      }

      processNextInQueue();
    },
    [processNextInQueue],
  );

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedChats = await window.electronAPI?.getAllChatFiles();
      setChats(savedChats || []);
      return savedChats || [];
    } catch (e) {
      console.error("Failed to load chats", e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadChats();
      if (loaded.length > 0) {
        enqueueTitleGeneration(loaded);
      }
    };
    init();

    const handler = (data: { type: string; chatId?: string }) => {
      if (data.type === "chat_deleted" || data.type === "chat_created") {
        loadChats();
      }
    };

    const cleanup = electron?.onAssistUpdate?.(handler);

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [loadChats, electron, enqueueTitleGeneration]);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      const refresh = async () => {
        const loaded = await loadChats();
        if (loaded.length > 0) {
          enqueueTitleGeneration(loaded);
        }
      };
      refresh();
    }
  }, [refreshKey, loadChats, enqueueTitleGeneration]);

  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);
  const sortedGroups = useMemo(() => Object.keys(groupedChats), [groupedChats]);

  const handleOpenChat = useCallback(
    (chat: ChatFile) => {
      onOpenChat?.(chat);
    },
    [onOpenChat],
  );

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      const result = await window.electronAPI?.deleteChatFile(chatId);
      if (result?.success) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (e) {
      console.error("Failed to delete chat", e);
    }
    setActiveMenuId(null);
  }, []);

  const handleExportChat = useCallback(async (chat: ChatFile) => {
    setActiveMenuId(null);
    try {
      const fullChat = await window.electronAPI?.getChatFile(chat.id);
      if (fullChat) {
        generateChatPDF(fullChat);
      } else {
        generateChatPDF(chat);
      }
    } catch (e) {
      console.error("Failed to export chat", e);
      generateChatPDF(chat);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary">
        <section className="px-8 py-8 min-h-full">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <RefreshCw
                size={20}
                className="animate-spin text-text-secondary"
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary">
      <section className="px-8 py-8 min-h-full">
        <div className="max-w-4xl mx-auto space-y-8">
          {sortedGroups.map((label) => (
            <section key={label}>
              <h3 className="text-[13px] font-medium text-text-secondary/50 mb-3 pl-1">
                {label}
              </h3>
              <div className="space-y-1">
                {groupedChats[label].map((chat) => {
                  const isGenerating = generatingTitles.has(chat.id);

                  return (
                    <motion.div
                      key={chat.id}
                      layoutId={`chat-${chat.id}`}
                      className="group relative flex items-center justify-between px-3 py-2 rounded-lg bg-transparent hover:bg-bg-sidebar transition-colors cursor-pointer"
                      onClick={() => handleOpenChat(chat)}
                    >
                      <div className="font-medium text-[14px] max-w-[60%] truncate text-text-secondary">
                        {isGenerating ? (
                          <span className="inline-flex items-center gap-1.5 text-accent-primary">
                            <Sparkles size={13} className="animate-pulse" />
                            <span className="animate-pulse">Generating...</span>
                          </span>
                        ) : (
                          chat.title
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="relative z-10 bg-bg-card text-text-tertiary text-[9px] px-1.5 py-0.5 rounded-full font-medium min-w-[35px] text-center tracking-wide">
                          {chat.messages.length} msgs
                        </span>

                        <span className="text-[13px] text-text-primary font-medium min-w-[60px] text-right transition-all duration-200 ease-out group-hover:opacity-0 group-hover:translate-x-2 delayed-hover-exit">
                          {formatTime(new Date(chat.createdAt).toISOString())}
                        </span>
                      </div>

                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 translate-x-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0">
                        <button
                          className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === chat.id ? null : chat.id,
                            );
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {activeMenuId === chat.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 w-[90px] bg-overlay-bg backdrop-blur-xl border border-border-subtle rounded-lg shadow-2xl z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => setMenuEntered(true)}
                            onMouseLeave={() => {
                              if (menuEntered) setActiveMenuId(null);
                            }}
                          >
                            <div className="p-1 flex flex-col gap-0.5">
                              <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-item-active rounded-lg transition-colors text-left"
                                onClick={() => handleExportChat(chat)}
                              >
                                <Download size={13} />
                                Export
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-left"
                                onClick={() => handleDeleteChat(chat.id)}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}

          {chats.length === 0 && (
            <div className="p-4 text-text-tertiary text-sm">
              No saved chats yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
