import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  ArrowUp,
  RefreshCw,
  Cpu,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { ChatDetailsProps } from "../types";

import SummaryTab from "./SummaryTab";
import TranscriptTab from "./TranscriptTab";
import UsageTab from "./UsageTab";

import {
  formatTime,
  getModelDisplayName,
  generateMockTranscript,
  generateMockUsage,
} from "./utils";

const ChatDetails: React.FC<ChatDetailsProps> = ({
  chat,
  onBack: _onBack,
  onUpdate,
  onOpenOverlay,
}) => {
  const [activeTab, setActiveTab] = useState<
    "summary" | "transcript" | "usage"
  >("summary");
  const [query, setQuery] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentChat, setCurrentChat] = useState(chat);
  const [expandedThinking, setExpandedThinking] = useState<
    Record<string, boolean>
  >({});

  const [detailedSummary, setDetailedSummary] = useState<any>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryRequestedRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentChat(chat);
    if (chat.summary) {
      setDetailedSummary({
        overview: chat.summary.overview || "",
        actionItems: chat.summary.actionItems || [],
        keyPoints: chat.summary.keyPoints || [],
        actionItemsTitle: "Action Items",
        keyPointsTitle: "Key Points",
      });
      summaryRequestedRef.current = chat.id;
    } else {
      setDetailedSummary(null);
      summaryRequestedRef.current = null;
    }
    setSummaryError(null);
  }, [chat]);

  const refreshChat = async () => {
    setIsRefreshing(true);
    try {
      // @ts-ignore
      const updatedChat = await window.electronAPI?.getChatFile(chat.id);
      if (updatedChat) {
        setCurrentChat(updatedChat);
        onUpdate?.(updatedChat);
      }
    } catch (e) {
      console.error("Failed to refresh chat:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const modelsUsed = [
    ...new Set(
      (currentChat.messages || [])
        .filter((m) => m.role === "assistant" && m.modelUsed)
        .map((m) => m.modelUsed as string),
    ),
  ];

  const loadSummary = async () => {
    if ((currentChat.messages || []).length === 0) return;
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      // @ts-ignore
      const result = await window.electronAPI?.generateSummary(
        currentChat.id,
        currentChat.title,
        (currentChat.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );
      if (result?.success && result.summary) {
        const newSummary = { ...result.summary, generatedAt: Date.now() };
        setDetailedSummary({
          overview: newSummary.overview || "",
          actionItems: newSummary.actionItems || [],
          keyPoints: newSummary.keyPoints || [],
          actionItemsTitle: "Action Items",
          keyPointsTitle: "Key Points",
        });
        summaryRequestedRef.current = currentChat.id;

        const updatedChat = { ...currentChat, summary: newSummary };
        setCurrentChat(updatedChat);
        onUpdate?.(updatedChat);
      } else {
        setSummaryError(result?.error || "Failed to generate summary.");
      }
    } catch (e: any) {
      console.error("Failed to generate summary:", e);
      setSummaryError(e.message || "Unexpected error.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeTab === "summary" &&
      !detailedSummary &&
      !isSummaryLoading &&
      summaryRequestedRef.current !== currentChat.id
    ) {
      summaryRequestedRef.current = currentChat.id;
      loadSummary();
    }
  }, [activeTab, currentChat.id, detailedSummary, isSummaryLoading]);

  const mockTranscript = generateMockTranscript(currentChat.messages || []);
  const mockUsage = generateMockUsage(currentChat.messages || []);

  const handleCopy = async () => {
    let textToCopy = "";

    if (activeTab === "summary") {
      textToCopy = `
Chat: ${currentChat.title}
Date: ${new Date(currentChat.createdAt).toLocaleDateString()}

OVERVIEW:
${detailedSummary?.overview || ""}

ACTION ITEMS:
${detailedSummary?.actionItems?.map((item: string) => `- ${item}`).join("\n") || "None"}

KEY POINTS:
${detailedSummary?.keyPoints?.map((item: string) => `- ${item}`).join("\n") || "None"}
      `.trim();
    } else if (activeTab === "transcript") {
      textToCopy = mockTranscript
        .map(
          (t) =>
            `[${formatTime(t.timestamp)}] ${t.speaker === "user" ? "Me" : "AI"}: ${t.text}`,
        )
        .join("\n");
    } else if (activeTab === "usage") {
      textToCopy = mockUsage
        .map((u) => `Q: ${u.question || ""}\nA: ${u.answer || ""}`)
        .join("\n\n");
    }

    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && query.trim()) {
      e.preventDefault();
      handleOpenOverlay();
    }
  };

  const handleOpenOverlay = () => {
    if (query.trim() && onOpenOverlay) {
      onOpenOverlay(currentChat, query.trim());
      setQuery("");
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-bg-secondary text-text-secondary font-sans overflow-hidden">
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="max-w-4xl mx-auto px-8 py-8 pb-32"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="w-full pr-4">
              <div className="text-xs text-text-tertiary font-medium mb-1">
                {new Date(currentChat.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                {currentChat.title}
              </h1>
              {modelsUsed.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Cpu size={12} className="text-text-tertiary" />
                  <div className="flex flex-wrap gap-1">
                    {modelsUsed.map((model) => (
                      <span
                        key={model}
                        className="text-[10px] px-2 py-0.5 bg-bg-input rounded-full text-text-secondary border border-border-subtle"
                      >
                        {getModelDisplayName(model)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={refreshChat}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors shrink-0"
              title="Refresh chat"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="bg-bg-component p-1 rounded-xl inline-flex items-center gap-0.5 border border-border-subtle">
              {["summary", "transcript", "usage"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`
                    relative px-3 py-1 text-[13px] font-medium rounded-lg transition-all duration-200 z-10
                    ${activeTab === tab ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"}
                  `}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-bg-elevated rounded-lg -z-10 shadow-sm"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {isCopied ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} />
              )}
              {isCopied
                ? "Copied"
                : activeTab === "summary"
                  ? "Copy full summary"
                  : activeTab === "transcript"
                    ? "Copy full transcript"
                    : "Copy usage"}
            </button>
          </div>

          <div className="space-y-8">
            {activeTab === "summary" && (
              <SummaryTab
                isSummaryLoading={isSummaryLoading}
                summaryError={summaryError}
                detailedSummary={detailedSummary}
                loadSummary={loadSummary}
              />
            )}
            {activeTab === "transcript" && (
              <TranscriptTab
                mockTranscript={mockTranscript}
                expandedThinking={expandedThinking}
                setExpandedThinking={setExpandedThinking}
              />
            )}
            {activeTab === "usage" && (
              <UsageTab
                mockUsage={mockUsage}
                currentChat={currentChat}
                expandedThinking={expandedThinking}
                setExpandedThinking={setExpandedThinking}
              />
            )}
          </div>
        </motion.div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-3 pointer-events-none z-20">
        <button
          // @ts-ignore
          onClick={() => window.electronAPI?.loadChatInOverlay(currentChat.id)}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-full text-sm font-medium hover:bg-accent-primary/80 transition-colors shadow-lg"
        >
          <MessageSquare size={16} />
          Continue Chat
        </button>
        <div className="w-full max-w-[440px] relative group pointer-events-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask about this chat..."
            className="w-full pl-5 pr-12 py-3 bg-overlay-bg backdrop-blur-[24px] backdrop-saturate-[140%] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border-subtle rounded-full text-sm text-text-primary placeholder-text-tertiary/70 focus:outline-none transition-shadow duration-200"
          />
          <button
            onClick={handleOpenOverlay}
            disabled={!query.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 border border-border-subtle ${
              query.trim()
                ? "bg-text-primary text-bg-primary hover:scale-105"
                : "bg-bg-item-active text-text-primary opacity-50 cursor-not-allowed"
            }`}
          >
            <ArrowUp size={16} className="transform rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetails;
