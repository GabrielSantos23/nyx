import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Search, Sparkles, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderProps, HeaderState, Meeting, SearchResult } from "./types";

function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedText.includes(normalizedQuery)) return true;

  return false;
}

function searchMeetings(meetings: Meeting[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const meeting of meetings) {
    if (seen.has(meeting.id)) continue;

    const titleMatch = fuzzyMatch(meeting.title, query);
    const summaryMatch = meeting.summary && fuzzyMatch(meeting.summary, query);

    if (titleMatch || summaryMatch) {
      seen.add(meeting.id);
      results.push({
        id: meeting.id,
        type: "meeting",
        title: meeting.title,
        subtitle: new Date(meeting.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        meetingId: meeting.id,
      });
    }

    if (results.length >= 5) break;
  }

  return results;
}

const Header: React.FC<HeaderProps> = ({
  meetings,
  onAIQuery,
  onLiteralSearch,
  onOpenMeeting,
  onExpansionChange,
}) => {
  const [state, setState] = useState<HeaderState>("idle");
  const [query, setQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = state !== "idle";
  const showResults = state === "results" && query.trim();

  useEffect(() => {
    onExpansionChange?.(state !== "idle");
  }, [state, onExpansionChange]);

  const sessionResults = useMemo(() => {
    if (state !== "results" || !query.trim()) return [];
    return searchMeetings(meetings, query);
  }, [meetings, query, state]);

  const totalItems = 2 + sessionResults.length;

  const open = useCallback(() => {
    setState("focused");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setState("idle");
    setTimeout(() => {
      setQuery("");
      setSelectedIndex(-1);
    }, 150);
    inputRef.current?.blur();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedIndex(-1);

      if (value.trim()) {
        setState("results");
      } else {
        setState("focused");
      }
    },
    [],
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (index === 0) {
        onAIQuery(query);
        close();
      } else if (index === 1) {
        onLiteralSearch(query);
        close();
      } else {
        const sessionIndex = index - 2;
        const result = sessionResults[sessionIndex];
        if (result) {
          onOpenMeeting(result.meetingId);
          close();
        }
      }
    },
    [query, sessionResults, onAIQuery, onLiteralSearch, onOpenMeeting, close],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (state === "idle") {
          open();
        } else {
          close();
        }
        return;
      }

      if (state === "idle") return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (state === "results") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleSelect(selectedIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, open, close, selectedIndex, totalItems, handleSelect]);

  useEffect(() => {
    if (state === "idle") return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [state, close]);

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[8px] z-[90]"
              onClick={close}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      <div
        ref={containerRef}
        className="absolute left-1/2 -translate-x-1/2 top-[7px] no-drag z-40"
      >
        <div className="relative">
          <motion.div
            initial={false}
            animate={{
              width: isExpanded ? 480 : 340,
            }}
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 25,
            }}
            className="relative transform-gpu"
          >
            <div className="relative">
              <div
                className={`
                                    relative overflow-hidden
                                    bg-bg-sidebar
                                    backdrop-blur-xl backdrop-saturate-150
                                    rounded-2xl
                                    shadow-sm
                                `}
              >
                <div
                  className="relative flex items-center"
                  onClick={() => state === "idle" && open()}
                >
                  <div className="absolute left-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-text-tertiary" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => state === "idle" && setState("focused")}
                    className={`
                                        w-full bg-transparent
                                        pl-9 pr-4 py-1
                                        text-[13px] text-text-primary
                                        placeholder-text-tertiary
                                        focus:outline-none
                                        ${state === "idle" ? "cursor-pointer" : "cursor-text"}
                                    `}
                    placeholder="Search or ask anything..."
                  />
                </div>

                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 150,
                        damping: 25,
                        opacity: { duration: 0.3 },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="w-[480px]">
                        <div className="border-t border-border-muted py-2">
                          <div className="px-3 py-1">
                            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                              Explore
                            </div>

                            <motion.button
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`
                                                            w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left
                                                            transition-colors duration-100
                                                            ${
                                                              selectedIndex ===
                                                              0
                                                                ? "bg-bg-item-active"
                                                                : "hover:bg-bg-item-hover"
                                                            }
                                                        `}
                              onClick={() => handleSelect(0)}
                              onMouseEnter={() => setSelectedIndex(0)}
                            >
                              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                <Sparkles size={12} className="text-white" />
                              </div>
                              <span className="text-[13px] text-text-primary truncate">
                                {query}
                              </span>
                            </motion.button>

                            <motion.button
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`
                                                            w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left
                                                            transition-colors duration-100
                                                            ${
                                                              selectedIndex ===
                                                              1
                                                                ? "bg-bg-item-active"
                                                                : "hover:bg-bg-item-hover"
                                                            }
                                                        `}
                              onClick={() => handleSelect(1)}
                              onMouseEnter={() => setSelectedIndex(1)}
                            >
                              <div className="w-6 h-6 rounded-md bg-bg-item-surface flex items-center justify-center shrink-0">
                                <Search
                                  size={12}
                                  className="text-text-secondary"
                                />
                              </div>
                              <span className="text-[13px] text-text-secondary">
                                Search for{" "}
                                <span className="text-text-primary">
                                  "{query}"
                                </span>
                              </span>
                            </motion.button>
                          </div>

                          {sessionResults.length > 0 && (
                            <div className="px-3 py-1 mt-1">
                              <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                                Sessions
                              </div>

                              <AnimatePresence initial={false} mode="popLayout">
                                {sessionResults.map((result, index) => (
                                  <motion.button
                                    layout="position"
                                    key={result.id}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`
                                                                        w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left
                                                                        transition-colors duration-100
                                                                        ${
                                                                          selectedIndex ===
                                                                          index +
                                                                            2
                                                                            ? "bg-bg-item-active"
                                                                            : "hover:bg-bg-item-hover"
                                                                        }
                                                                    `}
                                    onClick={() => handleSelect(index + 2)}
                                    onMouseEnter={() =>
                                      setSelectedIndex(index + 2)
                                    }
                                  >
                                    <div className="w-6 h-6 rounded-md bg-bg-item-surface flex items-center justify-center shrink-0">
                                      <FileText
                                        size={12}
                                        className="text-text-secondary"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[13px] text-text-primary truncate">
                                        {result.title}
                                      </div>
                                      {result.subtitle && (
                                        <div className="text-[11px] text-text-tertiary">
                                          {result.subtitle}
                                        </div>
                                      )}
                                    </div>
                                  </motion.button>
                                ))}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Header;
