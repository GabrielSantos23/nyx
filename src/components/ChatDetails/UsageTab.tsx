import React from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import MessageRenderer from "./MessageRenderer";
import { formatTime } from "./utils";

interface UsageTabProps {
  mockUsage: any[];
  currentChat: any;
  expandedThinking: Record<string, boolean>;
  setExpandedThinking: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

const UsageTab: React.FC<UsageTabProps> = ({
  mockUsage,
  currentChat,
  expandedThinking,
  setExpandedThinking,
}) => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 pb-10"
    >
      {mockUsage.length === 0 ? (
        <p className="text-text-tertiary">No usage history.</p>
      ) : (
        mockUsage.map((interaction, i) => {
          const userMsg = (currentChat.messages || []).filter(
            (m: any) => m.role === "user",
          )[i];
          const assistantMsg = (currentChat.messages || []).filter(
            (m: any) => m.role === "assistant",
          )[i];

          if (!interaction.answer && !interaction.question) return null;

          return (
            <div key={i} className="space-y-4">
              {interaction.question && (
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2">
                    {userMsg?.images && userMsg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {userMsg.images.map(
                          (imgPath: string, imgIdx: number) => (
                            <img
                              key={imgIdx}
                              src={`file://${imgPath}`}
                              alt="Attached image"
                              className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-border-subtle"
                            />
                          ),
                        )}
                      </div>
                    )}
                    <div className="bg-accent-primary text-white px-5 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] text-[15px] font-medium leading-relaxed shadow-sm">
                      {interaction.question}
                    </div>
                  </div>
                </div>
              )}

              {assistantMsg && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-bg-input flex items-center justify-center border border-border-subtle shrink-0">
                    <span className="text-xs font-bold text-text-tertiary">
                      AI
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-text-tertiary mb-1.5 font-medium">
                      {formatTime(interaction.timestamp)}
                    </div>
                    {assistantMsg.thinking !== undefined && (
                      <div className="mb-3">
                        <button
                          onClick={() =>
                            setExpandedThinking((prev) => ({
                              ...prev,
                              [`usage-${i}`]: !prev[`usage-${i}`],
                            }))
                          }
                          className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          <Brain className="w-3 h-3" />
                          <span>Thinking</span>
                          {expandedThinking[`usage-${i}`] ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        {expandedThinking[`usage-${i}`] && (
                          <div className="mt-2 p-3 bg-bg-input rounded-lg border border-border-subtle text-[12px] text-text-tertiary italic whitespace-pre-wrap">
                            {assistantMsg.thinking}
                          </div>
                        )}
                      </div>
                    )}
                    <MessageRenderer msg={assistantMsg} />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </motion.section>
  );
};

export default UsageTab;
