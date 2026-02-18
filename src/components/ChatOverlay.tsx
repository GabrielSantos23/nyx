import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Copy, Check, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  modelUsed?: string;
}

interface ChatContext {
  title: string;
  createdAt: number;
  messages: Array<{ role: string; content: string; timestamp?: number }>;
  summary?: string;
  actionItems?: string[];
  keyPoints?: string[];
}

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  chatContext: ChatContext;
  initialQuery?: string;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 py-4">
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-text-tertiary"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  </div>
);

const UserMessage: React.FC<{ content: string }> = ({ content }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.15 }}
    className="flex justify-end mb-4"
  >
    <div className="bg-accent-primary text-white px-5 py-3 rounded-2xl rounded-tr-md max-w-[70%] text-[15px] leading-relaxed">
      {content}
    </div>
  </motion.div>
);

const AssistantMessage: React.FC<{
  content: string;
  isStreaming?: boolean;
  modelUsed?: string;
}> = ({ content, isStreaming, modelUsed }) => {
  const [copied, setCopied] = useState(false);

  const getModelDisplayName = (modelId: string) => {
    if (modelId.startsWith("ollama:")) {
      return modelId.replace("ollama:", "") + " (Local)";
    }
    if (modelId.startsWith("gemini:")) {
      return modelId.includes("pro") ? "Gemini Pro" : "Gemini Flash";
    }
    if (modelId.startsWith("groq:")) {
      return "Groq Llama";
    }
    return modelId;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col items-start mb-4"
    >
      <div className="text-text-primary text-[15px] leading-relaxed max-w-[85%]">
        {content}
        {isStreaming && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-text-secondary ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        {!isStreaming && content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? (
              <Check size={12} className="text-emerald-500" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        {modelUsed && !isStreaming && (
          <span className="text-[10px] text-text-tertiary px-2 py-0.5 bg-bg-input rounded-full border border-border-subtle">
            {getModelDisplayName(modelUsed)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isOpen,
  onClose,
  chatContext,
  initialQuery = "",
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue(initialQuery);
      setErrorMessage(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const buildContextString = useCallback((): string => {
    const parts: string[] = [];

    parts.push(`CHAT: ${chatContext.title}`);
    parts.push(`Date: ${new Date(chatContext.createdAt).toLocaleDateString()}`);

    if (chatContext.summary) {
      parts.push(`\nSUMMARY:\n${chatContext.summary}`);
    }

    if (chatContext.keyPoints?.length) {
      parts.push(
        `\nKEY POINTS:\n${chatContext.keyPoints.map((p) => `- ${p}`).join("\n")}`,
      );
    }

    if (chatContext.actionItems?.length) {
      parts.push(
        `\nACTION ITEMS:\n${chatContext.actionItems.map((a) => `- ${a}`).join("\n")}`,
      );
    }

    if (chatContext.messages?.length) {
      const recentMessages = chatContext.messages.slice(-20);
      const messagesText = recentMessages
        .map((m) => `[${m.role === "user" ? "User" : "AI"}]: ${m.content}`)
        .join("\n");
      parts.push(`\nRECENT MESSAGES:\n${messagesText}`);
    }

    return parts.join("\n");
  }, [chatContext]);

  const handleSubmit = useCallback(async () => {
    const question = inputValue.trim();
    if (!question || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);
    setErrorMessage(null);

    const assistantMessageId = `assistant-${Date.now()}`;

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          isStreaming: true,
        },
      ]);

      const contextString = buildContextString();

      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await window.electronAPI?.askAIAboutChat(
        question,
        contextString,
        chatHistory,
      );

      if (response && response.content) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: response.content,
                  modelUsed: response.modelUsed,
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId),
        );
        setErrorMessage("Failed to get response. Please try again.");
      }
    } catch (error) {
      console.error("ChatOverlay error:", error);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId),
      );
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, buildContextString, messages]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="absolute inset-0 z-40 flex flex-col justify-end"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(8px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/40"
          />

          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "85vh", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              },
              opacity: { duration: 0.2 },
            }}
            className="relative mx-auto w-full max-w-[680px] mb-0 bg-bg-secondary dark:bg-[#0C0C0C] rounded-t-[24px] border-t border-x border-border-subtle shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-text-secondary truncate max-w-[400px]">
                  Ask about: {chatContext.title}
                </span>
              </div>
              <button onClick={onClose} className="p-2 transition-colors group">
                <X
                  size={16}
                  className="text-text-tertiary group-hover:text-red-500 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-300"
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 pb-32 custom-scrollbar">
              {messages.length === 0 && !isProcessing && (
                <p className="text-text-tertiary text-center py-8">
                  Ask questions about this chat...
                </p>
              )}

              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} content={msg.content} />
                ) : (
                  <AssistantMessage
                    key={msg.id}
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                    modelUsed={msg.modelUsed}
                  />
                ),
              )}

              {isProcessing &&
                messages[messages.length - 1]?.role === "user" && (
                  <TypingIndicator />
                )}

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#FF6B6B] text-[13px] py-2"
                >
                  {errorMessage}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center pointer-events-none z-20">
              <div className="w-full max-w-[440px] relative group pointer-events-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask about this chat..."
                  className="w-full pl-5 pr-12 py-3 bg-[#1E1E1E]/80 backdrop-blur-[24px] backdrop-saturate-[140%] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 rounded-full text-sm text-text-primary placeholder-text-tertiary/70 focus:outline-none transition-shadow duration-200"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isProcessing}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 border border-white/5 ${
                    inputValue.trim() && !isProcessing
                      ? "bg-text-primary text-bg-primary hover:scale-105"
                      : "bg-bg-item-active text-text-primary opacity-50 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp size={16} className="transform rotate-45" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatOverlay;
