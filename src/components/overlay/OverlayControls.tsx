import React from "react";
import {
  Pencil,
  MessageSquare,
  RefreshCw,
  HelpCircle,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  X,
} from "lucide-react";

interface OverlayControlsProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleManualSubmit: () => void;
  textInputRef: React.RefObject<HTMLInputElement>;
  settingsButtonRef: React.RefObject<HTMLButtonElement>;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  screenshotPreview: { path: string; preview: string } | null;
  setScreenshotPreview: (
    preview: null | { path: string; preview: string },
  ) => void;
  handleNewChat: () => void;
  showScreenshotWarning: boolean;
  handleWhatToSay: () => void;
  handleFollowUp: (type: string) => void;
  handleRecap: () => void;
  handleFollowUpQuestions: () => void;
  handleAnswerNow: () => void;
  isListening: boolean;
}

const OverlayControls: React.FC<OverlayControlsProps> = (props) => {
  return (
    <>
      <div className="flex flex-nowrap justify-center items-center gap-1.5 px-4 pb-3 pt-3 overflow-x-hidden">
        <button
          onClick={props.handleWhatToSay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 border border-white/0 hover:text-slate-200 hover:bg-white/10 hover:border-white/5 transition-all active:scale-95 duration-200 whitespace-nowrap shrink-0"
        >
          <Pencil className="w-3 h-3 opacity-70" /> What to answer?
        </button>
        <button
          onClick={() => props.handleFollowUp("shorten")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 border border-white/0 hover:text-slate-200 hover:bg-white/10 hover:border-white/5 transition-all active:scale-95 duration-200 whitespace-nowrap shrink-0"
        >
          <MessageSquare className="w-3 h-3 opacity-70" /> Shorten
        </button>
        <button
          onClick={props.handleRecap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 border border-white/0 hover:text-slate-200 hover:bg-white/10 hover:border-white/5 transition-all active:scale-95 duration-200 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3 h-3 opacity-70" /> Recap
        </button>
        <button
          onClick={props.handleFollowUpQuestions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 border border-white/0 hover:text-slate-200 hover:bg-white/10 hover:border-white/5 transition-all active:scale-95 duration-200 whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-3 h-3 opacity-70" /> Follow Up Question
        </button>
        <button
          onClick={props.handleAnswerNow}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 duration-200 min-w-[74px] whitespace-nowrap shrink-0 ${
            props.isListening
              ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
              : "bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
          }`}
        >
          <Zap className="w-3 h-3 opacity-70" />{" "}
          {props.isListening ? "Answer" : "Start"}
        </button>
      </div>

      <div className="p-3 pt-0">
        {props.showScreenshotWarning && (
          <div className="mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-[12px] animate-in fade-in slide-in-from-bottom-1">
            Configure Gemini, Groq, or Ollama to use screenshots
          </div>
        )}
        <div className="relative group">
          <input
            ref={props.textInputRef}
            type="text"
            value={props.inputValue}
            onChange={(e) => props.setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && props.handleManualSubmit()}
            className="w-full bg-[#1E1E1E] hover:bg-[#252525] focus:bg-[#1E1E1E] border border-white/5 focus:border-white/10 focus:ring-1 focus:ring-white/10 rounded-xl pl-3 pr-10 py-2.5 text-slate-200 focus:outline-none transition-all duration-200 text-[13px] leading-relaxed placeholder:text-slate-500"
          />

          {!props.inputValue && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-[13px] text-slate-400">
              <span>Ask anything on screen or conversation, or</span>
              <div className="flex items-center gap-1 opacity-80">
                <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-sans">
                  ⌘
                </kbd>
                <span className="text-[10px]">+</span>
                <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-sans">
                  H
                </kbd>
              </div>
              <span>for screenshot</span>
            </div>
          )}

          {!props.inputValue && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none opacity-20">
              <span className="text-[10px]">↵</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center gap-1">
              <button
                ref={props.settingsButtonRef}
                onClick={() => props.setIsSettingsOpen(!props.isSettingsOpen)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                  props.isSettingsOpen
                    ? "text-white bg-white/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
                title="Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {props.screenshotPreview && (
                <div className="relative group">
                  <img
                    src={props.screenshotPreview.preview}
                    alt="Screenshot"
                    className="w-10 h-10 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                  />
                  <button
                    onClick={() => props.setScreenshotPreview(null)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              )}
              <button
                onClick={props.handleNewChat}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            onClick={props.handleManualSubmit}
            disabled={!props.inputValue.trim()}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              props.inputValue.trim()
                ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 hover:bg-[#0071E3]"
                : "bg-white/5 text-white/10 cursor-not-allowed"
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default OverlayControls;
