import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { ChatMessage } from "@/components/types";
import { useElectron } from "../../hooks/useElectron";
import TopPill from "@/components/overlay/TopPill";

import { parseThinking } from "./utils";
import ChatHistory from "./ChatHistory";
import TranscriptionBar from "./TranscriptionBar";
import OverlayControls from "./OverlayControls";
import SettingsMenu from "./SettingsMenu";

export default function Overlay() {
  const electron = useElectron();

  const contentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const transcriptionRef = useRef<HTMLParagraphElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const [interim, setInterim] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestQueue, setRequestQueue] = useState<string[]>([]);
  const [lastSentIndex, setLastSentIndex] = useState(0);
  const sentInterimLengthRef = useRef(0);
  const [isDetectable, setIsDetectable] = useState(true);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<{
    path: string;
    preview: string;
  } | null>(null);
  const [canUseScreenshot, setCanUseScreenshot] = useState(false);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    const loadInitialState = async () => {
      const undetectable = await (window as any).electronAPI?.getUndetectable();
      setIsDetectable(!undetectable);
    };
    loadInitialState();

    const unsubscribe = (window as any).electronAPI?.onUndetectableChanged?.(
      (state: boolean) => {
        setIsDetectable(!state);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const toggleDetectable = async () => {
    const newState = !isDetectable;
    setIsDetectable(newState);
    await (window as any).electronAPI?.setUndetectable(!newState);
  };

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  const checkCanUseScreenshot = useCallback(async () => {
    const creds = await electron?.getStoredCredentials?.();
    const hasUserKey =
      creds?.hasGeminiKey ||
      creds?.hasGroqKey ||
      creds?.selectedModel?.startsWith("ollama-");
    setCanUseScreenshot(!!hasUserKey);
  }, [electron]);

  useEffect(() => {
    checkCanUseScreenshot();
  }, [checkCanUseScreenshot]);

  useEffect(() => {
    const cleanup = electron?.onCredentialsChanged?.(() => {
      checkCanUseScreenshot();
    });
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [electron, checkCanUseScreenshot]);

  const updateDimensions = useCallback(() => {
    if (!contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    electron?.updateContentDimensions({
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    });
  }, [electron]);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    let rafId: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDimensions);
    });

    observer.observe(contentRef.current);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updateDimensions]);

  useEffect(() => {
    const timer = setTimeout(updateDimensions, 50);
    return () => clearTimeout(timer);
  }, [isExpanded, updateDimensions, manualTranscript, interim, isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    const handleWindowBlur = () => setIsSettingsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isProcessing && requestQueue.length > 0) {
      const nextMessage = requestQueue[0];
      setRequestQueue((prev) => prev.slice(1));
      const screenshotPath = (window as any).__screenshotPath;
      (window as any).__screenshotPath = undefined;
      handleProcessMessage(nextMessage, screenshotPath);
    }
  }, [isProcessing, requestQueue]);

  useEffect(() => {
    const handler = (data: any) => {
      if (data.type === "transcription") {
        const newText = data.text;
        setInterim("");
        setManualTranscript((prev) => (prev ? prev + " " + newText : newText));
        const consumed = Math.min(newText.length, sentInterimLengthRef.current);
        setLastSentIndex((prev) => prev + consumed);
        sentInterimLengthRef.current = 0;
        if (!isExpanded) setIsExpanded(true);
      } else if (data.type === "interim") {
        setInterim(data.text || "");
        if (!isExpanded) setIsExpanded(true);
      } else if (data.type === "ai_processing") {
        setIsProcessing(true);
      } else if (data.type === "ai_response") {
        setInterim("");
        setIsProcessing(false);
      } else if (data.type === "load_chat") {
        if (data.chat) {
          electron?.abortAIStream?.();
          setIsProcessing(false);
          setCurrentChatId(data.chat.id);
          setMessages(data.chat.messages || []);
          setIsExpanded(true);
        }
      } else if (data.type === "chat_deleted") {
        if (currentChatId === data.chatId) {
          setCurrentChatId(null);
          setMessages([]);
          setInputValue("");
          setInterim("");
        }
      } else if (data.type === "meeting_started") {
        setIsListening(true);
        setManualTranscript("");
        setInterim("");
        setLastSentIndex(0);
        sentInterimLengthRef.current = 0;
      } else if (data.type === "meeting_stopped") {
        setIsListening(false);
      }
    };
    const cleanup = electron?.onAssistUpdate?.(handler);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [electron, isExpanded, currentChatId]);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollLeft =
        transcriptionRef.current.scrollWidth;
    }
  }, [manualTranscript, interim]);

  useEffect(() => {
    electron?.showOverlay();
  }, [electron]);

  useEffect(() => {
    const handleKeybind = (data: { action: string }) => {
      if (data.action === "reset") {
        handleNewChat();
      } else if (data.action === "process") {
        if (inputValue.trim()) handleManualSubmit();
      }
    };
    const cleanup = electron?.onKeybindAction?.(handleKeybind);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [electron, inputValue, messages]);

  useEffect(() => {
    const cleanup = electron?.onScreenshotCaptured?.((data) => {
      if (!canUseScreenshot) {
        setShowScreenshotWarning(true);
        setTimeout(() => setShowScreenshotWarning(false), 3000);
        return;
      }
      setScreenshotPreview(data);
      setIsExpanded(true);
    });
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [electron, canUseScreenshot]);

  const handleNewChat = () => {
    electron?.abortAIStream?.();
    setCurrentChatId(null);
    setMessages([]);
    setInputValue("");
    setInterim("");
    setManualTranscript("");
    setLastSentIndex(0);
    setRequestQueue([]);
    setScreenshotPreview(null);
    sentInterimLengthRef.current = 0;
    setIsProcessing(false);
  };

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(
      electron?.onStreamToken((token) => {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.isStreaming && lastMsg.role === "assistant") {
            const currentRaw = lastMsg.rawContent ?? lastMsg.content ?? "";
            const newRaw = currentRaw + token;
            const { thinking, content } = parseThinking(newRaw);
            const updated = [...prev];

            if (thinking && !lastMsg.thinking) {
              setTimeout(() => {
                setExpandedThinking((p) => ({
                  ...p,
                  [Object.keys(p).length]: true,
                }));
              }, 0);
            }

            updated[prev.length - 1] = {
              ...lastMsg,
              rawContent: newRaw,
              content,
              thinking,
            };
            return updated;
          }
          return prev;
        });
      }) || (() => {}),
    );

    cleanups.push(
      electron?.onStreamDone(() => {
        setIsProcessing(false);
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.isStreaming) {
            const updatedMsg = { ...lastMsg, isStreaming: false };
            const updated = [...prev];
            updated[prev.length - 1] = updatedMsg;

            const chatId = currentChatIdRef.current;
            if (chatId && updatedMsg.content) {
              electron?.appendChatMessage(chatId, {
                role: "assistant",
                content: updatedMsg.content,
                timestamp: updatedMsg.timestamp,
                thinking: updatedMsg.thinking,
              });
            }
            return updated;
          }
          return prev;
        });
      }) || (() => {}),
    );

    cleanups.push(
      electron?.onStreamError((error) => {
        setIsProcessing(false);
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.isStreaming) {
            const updated = [...prev];
            updated[prev.length - 1] = {
              ...lastMsg,
              isStreaming: false,
              content: lastMsg.content + `\n\n[Error: ${error}]`,
            };
            return updated;
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: `❌ Error: ${error}`,
              timestamp: Date.now(),
            },
          ];
        });
      }) || (() => {}),
    );

    return () => cleanups.forEach((fn) => fn());
  }, [electron]);

  const handleProcessMessage = async (
    content: string,
    screenshotPath?: string,
  ) => {
    if (!content) return;
    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
      images: screenshotPath ? [screenshotPath] : undefined,
    };
    const newMessages = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setIsExpanded(true);
    let chatId = currentChatId;

    try {
      if (!chatId) {
        const result = await electron?.createChatFile(userMessage);
        if (result?.id) {
          chatId = result.id;
          setCurrentChatId(chatId);
        }
      } else {
        await electron?.appendChatMessage(chatId, userMessage);
      }
      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
        },
      ]);

      if (screenshotPath) {
        await electron?.analyzeImageStream(
          content,
          screenshotPath,
          chatHistory,
        );
      } else {
        await electron?.streamAI(content, chatHistory);
      }
    } catch (e) {
      console.error("Failed to start AI stream", e);
      setIsProcessing(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming && !last.content) return prev.slice(0, -1);
        return prev;
      });
    }
  };

  const handleManualSubmit = async () => {
    const content = inputValue.trim();
    if (!content) return;
    setInputValue("");
    setInterim("");
    const screenshotPath = screenshotPreview?.path;
    setScreenshotPreview(null);
    setRequestQueue((prev) => [...prev, content]);
    if (screenshotPath) (window as any).__screenshotPath = screenshotPath;
  };

  const handleAnswerNow = () => {
    const deltaManual = manualTranscript.slice(lastSentIndex);
    const deltaInterim = interim.slice(
      Math.min(interim.length, sentInterimLengthRef.current),
    );
    const typed = inputValue.trim();
    let messageToSend = "";

    if (typed) {
      messageToSend += typed + " ";
      setInputValue("");
    }
    if (deltaManual.trim()) {
      messageToSend += deltaManual + " ";
      setLastSentIndex(manualTranscript.length);
    }
    if (deltaInterim.trim()) {
      messageToSend += deltaInterim;
      sentInterimLengthRef.current = interim.length;
    }

    if (messageToSend.trim()) {
      setRequestQueue((prev) => [...prev, messageToSend]);
    } else if (!isListening) {
      electron?.startMeeting();
    }
  };

  const handleWhatToSay = () => {
    setInputValue("");
    setRequestQueue((prev) => [
      ...prev,
      "What should I say in response to the conversation so far?",
    ]);
  };

  const handleFollowUp = (type: string) => {
    setInputValue("");
    setRequestQueue((prev) => [
      ...prev,
      `Please help me ${type} my last response`,
    ]);
  };

  const handleRecap = () => {
    setInputValue("");
    setRequestQueue((prev) => [
      ...prev,
      "Can you recap the conversation so far?",
    ]);
  };

  const handleFollowUpQuestions = () => {
    setInputValue("");
    setRequestQueue((prev) => [
      ...prev,
      "What follow-up questions should I ask?",
    ]);
  };

  return (
    <div ref={contentRef} className="flex flex-col gap-2">
      <TopPill
        expanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        isListening={isListening}
      />

      <div
        className={`
          relative w-[600px] max-w-full bg-[#1E1E1E]/95 backdrop-blur-2xl
          border border-white/10 shadow-2xl shadow-black/40 rounded-[24px] 
          overflow-visible flex flex-col transition-all duration-200
          ${isExpanded ? "opacity-100" : "opacity-0 h-0 pointer-events-none"}
        `}
      >
        <div className="rounded-[24px] overflow-hidden bg-[#1E1E1E]/95">
          <ChatHistory
            messages={messages}
            isProcessing={isProcessing}
            expandedThinking={expandedThinking}
            setExpandedThinking={setExpandedThinking}
            onCopy={(text) => navigator.clipboard.writeText(text)}
            messagesEndRef={messagesEndRef}
          />

          <TranscriptionBar
            manualTranscript={manualTranscript}
            interim={interim}
            lastSentIndex={lastSentIndex}
            transcriptionRef={transcriptionRef}
          />

          <OverlayControls
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleManualSubmit={handleManualSubmit}
            textInputRef={textInputRef}
            settingsButtonRef={settingsButtonRef}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            screenshotPreview={screenshotPreview}
            setScreenshotPreview={setScreenshotPreview}
            handleNewChat={handleNewChat}
            showScreenshotWarning={showScreenshotWarning}
            handleWhatToSay={handleWhatToSay}
            handleFollowUp={handleFollowUp}
            handleRecap={handleRecap}
            handleFollowUpQuestions={handleFollowUpQuestions}
            handleAnswerNow={handleAnswerNow}
            isListening={isListening}
          />
        </div>
      </div>

      <SettingsMenu
        isSettingsOpen={isSettingsOpen}
        settingsDropdownRef={settingsDropdownRef}
        isDetectable={isDetectable}
        toggleDetectable={toggleDetectable}
        setIsSettingsOpen={setIsSettingsOpen}
      />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        .select-none { user-select: none; }
      `}</style>
    </div>
  );
}
