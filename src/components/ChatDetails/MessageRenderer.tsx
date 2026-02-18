import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { ChatMessage } from "../types";

interface MessageRendererProps {
  msg: ChatMessage;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ msg }) => {
  if (msg.role === "assistant" && msg.content.includes("```")) {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);
    return (
      <div className="rounded-lg p-0 my-1 w-full overflow-hidden">
        <div className="space-y-2 text-text-secondary text-[13px] leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith("```")) {
              const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
              if (match) {
                const lang = match[1] || "text";
                const code = match[2].trim();
                return (
                  <div
                    key={i}
                    className="my-3 rounded-lg overflow-hidden border border-border-subtle shadow-sm bg-bg-primary"
                  >
                    <div className="bg-bg-elevated px-3 py-1.5 flex items-center justify-between border-b border-border-subtle">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-text-tertiary font-mono">
                        <div className="w-2 h-2 rounded-full bg-purple-500/80" />
                        {lang}
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-text-primary/10" />
                        <div className="w-2 h-2 rounded-full bg-text-primary/10" />
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
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-text-primary">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-text-secondary">{children}</em>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc ml-4 mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-4 mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold text-text-primary mb-2 mt-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold text-text-primary mb-2 mt-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold text-text-primary mb-1 mt-2">
                        {children}
                      </h3>
                    ),
                    code: ({ children }) => (
                      <code className="bg-bg-input rounded px-1 py-0.5 text-xs font-mono text-purple-300">
                        {children}
                      </code>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-purple-500/50 pl-3 italic text-text-tertiary my-2">
                        {children}
                      </blockquote>
                    ),
                    a: ({ children, href }) => (
                      <a
                        className="text-accent-primary hover:text-accent-primary/80 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={href}
                      >
                        {children}
                      </a>
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
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-secondary">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          code: ({ children }) => (
            <code className="bg-bg-input rounded px-1 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              className="text-accent-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              href={href}
            >
              {children}
            </a>
          ),
        }}
      >
        {msg.content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;
