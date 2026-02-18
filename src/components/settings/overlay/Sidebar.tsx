import React from "react";
import {
  Monitor,
  FlaskConical,
  Mic,
  Keyboard,
  Info,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onClose,
}) => {
  const tabs = [
    { id: "general", label: "General", icon: Monitor },
    { id: "ai-providers", label: "AI Providers", icon: FlaskConical },
    { id: "audio", label: "Audio", icon: Mic },
    { id: "keybinds", label: "Keybinds", icon: Keyboard },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="w-64 bg-bg-sidebar flex flex-col border-r border-border-subtle">
      <div className="p-6">
        <h2 className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-2">
          Settings
        </h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${activeTab === tab.id ? "bg-bg-item-active text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50"}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-border-subtle">
        <button
          onClick={() => window.electronAPI.quitApp()}
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
        >
          <LogOut size={16} /> Quit Nyx
        </button>
        <button
          onClick={onClose}
          className="group mt-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-item-active/50 transition-colors flex items-center gap-3"
        >
          <X size={18} className="group-hover:text-red-500 transition-colors" />{" "}
          Close
        </button>
      </div>
    </div>
  );
};
