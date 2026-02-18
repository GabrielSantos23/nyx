import React from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SummaryTabProps {
  isSummaryLoading: boolean;
  summaryError: string | null;
  detailedSummary: any;
  loadSummary: () => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  isSummaryLoading,
  summaryError,
  detailedSummary,
  loadSummary,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {isSummaryLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <RefreshCw size={24} className="animate-spin text-text-tertiary" />
          <p className="text-sm text-text-tertiary">Generating AI summary…</p>
        </div>
      )}

      {summaryError && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-red-400">{summaryError}</p>
          <button
            onClick={loadSummary}
            className="text-xs text-accent-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!isSummaryLoading && !summaryError && detailedSummary && (
        <>
          <div className="mb-6 pb-6 border-b border-border-subtle prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-text-primary mt-4 mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-text-primary mt-4 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-text-primary mt-3 mb-1">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-text-secondary leading-relaxed mb-2">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-4 mb-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm text-text-secondary">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-text-primary">
                    {children}
                  </strong>
                ),
                a: ({ children, href }) => (
                  <a
                    className="text-accent-primary hover:underline"
                    href={href}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {detailedSummary.overview || ""}
            </ReactMarkdown>
          </div>

          {detailedSummary.actionItems?.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">
                  {detailedSummary.actionItemsTitle || "Action Items"}
                </h2>
              </div>
              <ul className="space-y-3">
                {detailedSummary.actionItems.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-text-secondary group-hover:bg-accent-primary transition-colors shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {item}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detailedSummary.keyPoints?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">
                  {detailedSummary.keyPointsTitle || "Key Points"}
                </h2>
              </div>
              <ul className="space-y-3">
                {detailedSummary.keyPoints.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-text-secondary group-hover:bg-purple-500 transition-colors shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {item}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
};

export default SummaryTab;
