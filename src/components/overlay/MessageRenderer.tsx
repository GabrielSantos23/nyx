import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { ChatMessage } from "@/components/types";

interface MessageRendererProps {
  msg: ChatMessage & { isCode?: boolean; intent?: string };
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ msg }) => {
  if (msg.isCode || (msg.role === "assistant" && msg.content.includes("```"))) {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);
    return (
      <div className="rounded-lg p-0 my-1 w-full overflow-hidden">
        <div className="space-y-2 text-slate-200 text-[13px] leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith("```")) {
              const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
              if (match) {
                const lang = match[1] || "text";
                const code = match[2].trim();
                return (
                  <div
                    key={i}
                    className="my-3 rounded-lg overflow-hidden border border-white/10 shadow-sm bg-[#0f172a]"
                  >
                    <div className="bg-[#1e293b] px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 font-mono">
                        <div className="w-2 h-2 rounded-full bg-purple-500/80" />
                        {lang}
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                      </div>
                    </div>
                    <SyntaxHighlighter
                      language={lang}
                      style={dracula}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: "12px",
                        background: "transparent",
                        padding: "12px",
                        fontFamily: "JetBrains Mono, Menlo, monospace",
                      }}
                      wrapLongLines={true}
                      showLineNumbers={true}
                      lineNumberStyle={{
                        minWidth: "2em",
                        paddingRight: "1em",
                        color: "#475569",
                        textAlign: "right",
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                );
              }
            }
            if (!part.trim()) return null;
            return (
              <div key={i} className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ node, ...props }: any) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                    strong: ({ node, ...props }: any) => (
                      <strong className="font-bold text-white" {...props} />
                    ),
                    em: ({ node, ...props }: any) => (
                      <em className="italic text-slate-300" {...props} />
                    ),
                    ul: ({ node, ...props }: any) => (
                      <ul
                        className="list-disc ml-4 mb-2 space-y-1"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }: any) => (
                      <ol
                        className="list-decimal ml-4 mb-2 space-y-1"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }: any) => (
                      <li className="pl-1" {...props} />
                    ),
                    h1: ({ node, ...props }: any) => (
                      <h1
                        className="text-lg font-bold text-white mb-2 mt-3"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }: any) => (
                      <h2
                        className="text-base font-bold text-white mb-2 mt-3"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }: any) => (
                      <h3
                        className="text-sm font-bold text-white mb-1 mt-2"
                        {...props}
                      />
                    ),
                    code: ({ node, ...props }: any) => (
                      <code
                        className="bg-slate-700/50 rounded px-1 py-0.5 text-xs font-mono text-purple-200"
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }: any) => (
                      <blockquote
                        className="border-l-2 border-purple-500/50 pl-3 italic text-slate-400 my-2"
                        {...props}
                      />
                    ),
                    a: ({ node, ...props }: any) => (
                      <a
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                  }}
                >
                  {part}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }: any) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />
          ),
          strong: ({ node, ...props }: any) => (
            <strong className="font-bold opacity-100 text-white" {...props} />
          ),
          em: ({ node, ...props }: any) => (
            <em className="italic opacity-90" {...props} />
          ),
          ul: ({ node, ...props }: any) => (
            <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }: any) => (
            <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
          code: ({ node, ...props }: any) => (
            <code
              className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono"
              {...props}
            />
          ),
          a: ({ node, ...props }: any) => (
            <a
              className="underline hover:opacity-80 text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {msg.content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;
