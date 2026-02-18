import React, { useMemo } from "react";
import {
  Eye,
  Layout,
  MessageSquare,
  RotateCcw,
  Camera,
  Crop,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export const KeybindsSettings: React.FC = () => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmd = isMac ? "⌘" : "Ctrl";
  const shift = isMac ? "⇧" : "Shift";

  const generalShortcuts = useMemo(() => [
    {
      label: "Toggle Visibility",
      keys: [cmd, "B"],
      icon: <Eye size={14} />,
    },
    {
      label: "Show/Center Nyx",
      keys: [cmd, shift, "Space"],
      icon: <Layout size={14} />,
    },
    {
      label: "Process Screenshots",
      keys: [cmd, "Enter"],
      icon: <MessageSquare size={14} />,
    },
    {
      label: "Reset / Cancel",
      keys: [cmd, "R"],
      icon: <RotateCcw size={14} />,
    },
    {
      label: "Take Screenshot",
      keys: [cmd, "H"],
      icon: <Camera size={14} />,
    },
    {
      label: "Selective Screenshot",
      keys: [cmd, shift, "H"],
      icon: <Crop size={14} />,
    },
  ], [cmd, shift]);

  const windowShortcuts = useMemo(() => [
    {
      label: "Move Window Up",
      keys: [cmd, "↑"],
      icon: <ArrowUp size={14} />,
    },
    {
      label: "Move Window Down",
      keys: [cmd, "↓"],
      icon: <ArrowDown size={14} />,
    },
    {
      label: "Move Window Left",
      keys: [cmd, "←"],
      icon: <ArrowLeft size={14} />,
    },
    {
      label: "Move Window Right",
      keys: [cmd, "→"],
      icon: <ArrowRight size={14} />,
    },
  ], [cmd]);

  return (
    <div className="space-y-5 animated fadeIn select-text h-full flex flex-col justify-center">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-1">
          Keyboard shortcuts
        </h3>
        <p className="text-xs text-text-secondary">
          Nyx works with these easy to remember commands.
        </p>
      </div>

      <div className="grid gap-6">
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-3">General</h4>
          <div className="space-y-1">
            {generalShortcuts.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary group-hover:text-text-primary transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.keys.map((k, j) => (
                    <span
                      key={j}
                      className="bg-bg-input text-text-secondary px-2 py-1 rounded-md text-xs font-sans min-w-[24px] text-center shadow-sm border border-border-subtle"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-text-primary mb-3">Window</h4>
          <div className="space-y-1">
            {windowShortcuts.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary group-hover:text-text-primary transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.keys.map((k, j) => (
                    <span
                      key={j}
                      className="bg-bg-input text-text-secondary px-2 py-1 rounded-md text-xs font-sans min-w-[24px] text-center shadow-sm border border-border-subtle"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
