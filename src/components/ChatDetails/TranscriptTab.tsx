import React from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import MessageRenderer from "./MessageRenderer";
import { formatTime } from "./utils";
import { ChatMessage } from "../types";

interface TranscriptTabProps {
  mockTranscript: any[];
  expandedThinking: Record<string, boolean>;
  setExpandedThinking: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

const TranscriptTab: React.FC<TranscriptTabProps> = ({
  mockTranscript,
  expandedThinking,
  setExpandedThinking,
}) => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="space-y-6">
        {mockTranscript.length === 0 ? (
          <p className="text-text-tertiary">No transcript available.</p>
        ) : (
          mockTranscript.map((entry, i) => {
            const msg: ChatMessage = {
              role: entry.speaker === "user" ? "user" : "assistant",
              content: entry.text,
              timestamp: entry.timestamp,
              images: entry.images,
            };
            return (
              <div key={i} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-text-secondary">
                    {entry.speaker === "user" ? "Me" : "AI"}
                  </span>
                  <span className="text-xs text-text-tertiary font-mono">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                {entry.images && entry.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {entry.images.map((imgPath: string, imgIdx: number) => (
                      <img
                        key={imgIdx}
                        src={`file://${imgPath}`}
                        alt="Attached image"
                        className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-border-subtle"
                      />
                    ))}
                  </div>
                )}
                {entry.speaker === "assistant" && entry.thinking && (
                  <div className="mb-3">
                    <button
                      onClick={() =>
                        setExpandedThinking((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                      className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      <Brain className="w-3 h-3" />
                      <span>Thinking</span>
                      {expandedThinking[i] ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                    {expandedThinking[i] && (
                      <div className="mt-2 p-3 bg-bg-input rounded-lg border border-border-subtle text-[12px] text-text-tertiary italic whitespace-pre-wrap">
                        {entry.thinking}
                      </div>
                    )}
                  </div>
                )}
                {entry.speaker === "assistant" ? (
                  <MessageRenderer msg={msg} />
                ) : (
                  <p className="text-text-secondary text-[15px] leading-relaxed transition-colors select-text cursor-text">
                    {entry.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.section>
  );
};

export default TranscriptTab;
