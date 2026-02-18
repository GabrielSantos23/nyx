import React from "react";
import { Brain, ChevronDown, ChevronRight, Copy } from "lucide-react";
import MessageRenderer from "./MessageRenderer";
import { ChatMessage } from "@/components/types";

interface ChatHistoryProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  expandedThinking: Record<number, boolean>;
  setExpandedThinking: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  onCopy: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isProcessing,
  expandedThinking,
  setExpandedThinking,
  onCopy,
  messagesEndRef,
}) => {
  if (messages.length === 0 && !isProcessing) return null;

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[clamp(300px,35vh,450px)]"
      style={{ scrollbarWidth: "none" }}
    >
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
        >
          <div
            className={`
              ${msg.role === "user" ? "max-w-[72.25%] px-[13.6px] py-[10.2px]" : "max-w-[85%] px-4 py-3"} 
              text-[14px] leading-relaxed relative group whitespace-pre-wrap
              ${
                msg.role === "user"
                  ? "bg-blue-600/20 backdrop-blur-md border border-blue-500/30 text-blue-100 rounded-[20px] rounded-tr-[4px] shadow-sm font-medium"
                  : "text-slate-200 font-normal"
              }
            `}
          >
            {msg.images && msg.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {msg.images.map((imgPath, imgIdx) => (
                  <img
                    key={imgIdx}
                    src={`file://${imgPath}`}
                    alt="Attached image"
                    className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-white/10"
                  />
                ))}
              </div>
            )}

            {msg.role === "assistant" && typeof msg.thinking === "string" && (
              <div className="mb-3">
                <button
                  onClick={() =>
                    setExpandedThinking((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <Brain className="w-3 h-3" />
                  <span>Thinking</span>
                  {expandedThinking[idx] ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {expandedThinking[idx] && (
                  <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-[12px] text-slate-300 italic whitespace-pre-wrap">
                    {msg.thinking}
                  </div>
                )}
              </div>
            )}

            <MessageRenderer msg={msg} />

            {msg.role === "assistant" && !msg.isStreaming && msg.content && (
              <button
                onClick={() => onCopy(msg.content)}
                className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            )}
          </div>
        </div>
      ))}

      {isProcessing && (
        <div className="flex justify-start">
          <div className="px-3 py-2 flex gap-1.5">
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
