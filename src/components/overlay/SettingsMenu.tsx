import React from "react";
import {
  Monitor,
  Mic,
  Keyboard,
  Info,
  Ghost,
  MessageSquare,
  Camera,
} from "lucide-react";

interface SettingsMenuProps {
  isSettingsOpen: boolean;
  settingsDropdownRef: React.RefObject<HTMLDivElement>;
  isDetectable: boolean;
  toggleDetectable: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

const mockSettingsOptions = [
  { id: "general", label: "General", icon: Monitor },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "keybinds", label: "Keybinds", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
];

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isSettingsOpen,
  settingsDropdownRef,
  isDetectable,
  toggleDetectable,
  setIsSettingsOpen,
}) => {
  if (!isSettingsOpen) return null;

  return (
    <div
      ref={settingsDropdownRef}
      className="w-48 bg-[#1E1E1E]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in"
      style={{ marginTop: "8px" }}
    >
      <div className="p-2">
        <button
          onClick={toggleDetectable}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            {isDetectable ? (
              <Ghost
                size={14}
                strokeWidth={2}
                className="text-slate-500 transition-colors"
              />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-colors"
              >
                <path
                  d="M12 2C7.58172 2 4 5.58172 4 10V22L7 19L9.5 21.5L12 19L14.5 21.5L17 19L20 22V10C20 5.58172 16.4183 2 12 2Z"
                  fill="white"
                />
                <circle cx="9" cy="10" r="1.5" fill="black" />
                <circle cx="15" cy="10" r="1.5" fill="black" />
              </svg>
            )}
            <span>{isDetectable ? "Detectable" : "Undetectable"}</span>
          </div>
          <div
            className={`w-8 h-4 rounded-full relative transition-colors ${!isDetectable ? "bg-blue-500" : "bg-zinc-700"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${!isDetectable ? "left-[18px]" : "left-0.5"}`}
            />
          </div>
        </button>

        {mockSettingsOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setIsSettingsOpen(false)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <option.icon size={14} className="text-slate-500" />
            {option.label}
          </button>
        ))}

        <div className="my-2 h-px bg-white/5" />

        <div className="space-y-1">
          <div className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] text-slate-400 rounded-lg cursor-default">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-slate-500" />
              <span>Show/Hide</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-400">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-400">
                B
              </kbd>
            </div>
          </div>
          <div className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] text-slate-400 rounded-lg cursor-default">
            <div className="flex items-center gap-2">
              <Camera size={14} className="text-slate-500" />
              <span>Screenshot</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-400">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-400">
                H
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
