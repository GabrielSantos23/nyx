import React, { useState, useEffect, useRef } from "react";
import {
  Power,
  MessageSquare,
  Palette,
  BadgeCheck,
  Ghost,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  RefreshCw,
  Check,
  X,
  ArrowDown,
} from "lucide-react";
import { analytics } from "@/lib/analytics/analytics.service";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/contexts/ToastContext";

interface GeneralSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [isUndetectable, setIsUndetectable] = useState(false);
  const [openOnLogin, setOpenOnLogin] = useState(false);
  const { mode: themeMode, setTheme: setThemeMode } = useTheme();
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "uptodate" | "error"
  >("idle");
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [showTranscript, setShowTranscript] = useState(() => {
    const stored = localStorage.getItem("nyx_interviewer_transcript");
    return stored !== "false";
  });

  useEffect(() => {
    if (window.electronAPI?.onUndetectableChanged) {
      const unsubscribe = window.electronAPI.onUndetectableChanged(
        (newState: boolean) => {
          setIsUndetectable(newState);
        },
      );
      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThemeDropdownOpen(false);
      }
    };

    if (isThemeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isThemeDropdownOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubs: Array<(() => void) | void> = [];

    if (window.electronAPI?.onUpdateChecking) {
      unsubs.push(
        window.electronAPI.onUpdateChecking(() => {
          setUpdateStatus("checking");
        }),
      );
    }
    if (window.electronAPI?.onUpdateAvailable) {
      unsubs.push(
        window.electronAPI.onUpdateAvailable(() => {
          setUpdateStatus("available");
        }),
      );
    }
    if (window.electronAPI?.onUpdateNotAvailable) {
      unsubs.push(
        window.electronAPI.onUpdateNotAvailable(() => {
          setUpdateStatus("uptodate");
          setTimeout(() => setUpdateStatus("idle"), 3000);
        }),
      );
    }
    if (window.electronAPI?.onUpdateError) {
      unsubs.push(
        window.electronAPI.onUpdateError((err: string) => {
          console.error("[Settings] Update error:", err);
          setUpdateStatus("error");
          setTimeout(() => setUpdateStatus("idle"), 3000);
        }),
      );
    }

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (window.electronAPI?.getUndetectable) {
        window.electronAPI.getUndetectable().then(setIsUndetectable);
      }
      if (window.electronAPI?.getAutoLaunch) {
        window.electronAPI.getAutoLaunch().then((status) => {
          setOpenOnLogin(status.enabled);
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("nyx_interviewer_transcript");
      setShowTranscript(stored !== "false");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleSetTheme = async (mode: "system" | "light" | "dark") => {
    setThemeMode(mode);
  };

  const handleCheckForUpdates = async () => {
    if (updateStatus === "checking") return;
    setUpdateStatus("checking");
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setUpdateStatus("error");
      setTimeout(() => setUpdateStatus("idle"), 3000);
    }
  };

  return (
    <div className="space-y-8 animated fadeIn">
      <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isUndetectable ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-primary"
              >
                <path
                  d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"
                  fill="currentColor"
                  stroke="currentColor"
                />
                <path
                  d="M9 10h.01"
                  stroke="var(--bg-item-surface)"
                  strokeWidth="2.5"
                />
                <path
                  d="M15 10h.01"
                  stroke="var(--bg-item-surface)"
                  strokeWidth="2.5"
                />
              </svg>
            ) : (
              <Ghost size={18} className="text-text-primary" />
            )}
            <h3 className="text-lg font-bold text-text-primary">
              {isUndetectable ? "Undetectable" : "Detectable"}
            </h3>
          </div>
          <p className="text-xs text-text-secondary">
            Nyx is currently {isUndetectable ? "undetectable" : "detectable"} by
            screen-sharing.{" "}
            <button className="text-blue-400 hover:underline">
              Supported apps here
            </button>
          </p>
        </div>
        <div
          onClick={() => {
            const newState = !isUndetectable;
            setIsUndetectable(newState);
            window.electronAPI?.setUndetectable(newState);
            analytics.trackModeSelected(newState ? "undetectable" : "overlay");
          }}
          className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${isUndetectable ? "bg-accent-primary" : "bg-bg-toggle-switch border border-border-muted"}`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isUndetectable ? "translate-x-5" : "translate-x-0"}`}
          />
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-lg font-bold text-text-primary mb-1">
          General settings
        </h3>
        <p className="text-xs text-text-secondary mb-2">
          Customize how Nyx works for you
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                <Power size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Open Nyx when you log in
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Nyx will open automatically when you log in to your computer
                </p>
              </div>
            </div>
            <div
              onClick={async () => {
                const newState = !openOnLogin;
                setOpenOnLogin(newState);
                try {
                  await window.electronAPI?.setAutoLaunch(newState, false);
                  toast.show({
                    title: newState
                      ? "Auto-launch enabled"
                      : "Auto-launch disabled",
                    description: newState
                      ? "Nyx will start when you log in"
                      : "Nyx won't start automatically",
                    variant: "success",
                    duration: 5000,
                  });
                } catch (error) {
                  toast.show({
                    title: "Failed to update setting",
                    description: "Please try again",
                    variant: "error",
                    duration: 5000,
                  });
                }
              }}
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${openOnLogin ? "bg-accent-primary" : "bg-bg-toggle-switch border border-border-muted"}`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${openOnLogin ? "translate-x-5" : "translate-x-0"}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary">
                <Palette size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Theme</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Customize how Nyx looks on your device
                </p>
              </div>
            </div>

            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                className="bg-bg-component hover:bg-bg-elevated border border-border-subtle text-text-primary px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 min-w-[100px] justify-between"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-text-secondary shrink-0">
                    {themeMode === "system" && <Monitor size={14} />}
                    {themeMode === "light" && <Sun size={14} />}
                    {themeMode === "dark" && <Moon size={14} />}
                  </span>
                  <span className="capitalize text-ellipsis overflow-hidden whitespace-nowrap">
                    {themeMode}
                  </span>
                </div>
                <ChevronDown
                  size={12}
                  className={`shrink-0 transition-transform ${isThemeDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isThemeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-full bg-bg-elevated border border-border-subtle rounded-lg shadow-xl overflow-hidden z-20 p-1 animated fadeIn select-none">
                  {[
                    {
                      mode: "system",
                      label: "System",
                      icon: <Monitor size={14} />,
                    },
                    {
                      mode: "light",
                      label: "Light",
                      icon: <Sun size={14} />,
                    },
                    {
                      mode: "dark",
                      label: "Dark",
                      icon: <Moon size={14} />,
                    },
                  ].map((option) => (
                    <button
                      key={option.mode}
                      onClick={() => {
                        handleSetTheme(
                          option.mode as "system" | "light" | "dark",
                        );
                        setIsThemeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${themeMode === option.mode ? "text-text-primary bg-bg-item-active/50" : "text-text-secondary hover:bg-bg-input hover:text-text-primary"}`}
                    >
                      <span
                        className={
                          themeMode === option.mode
                            ? "text-text-primary"
                            : "text-text-secondary group-hover:text-text-primary"
                        }
                      >
                        {option.icon}
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-item-surface rounded-lg border border-border-subtle flex items-center justify-center text-text-tertiary shrink-0">
                <BadgeCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Version</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  You are currently using Nyx version 1.0.1.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (updateStatus === "available") {
                  try {
                    // @ts-ignore
                    await window.electronAPI.downloadUpdate();
                    onClose();
                  } catch (err) {
                    console.error("Failed to start download:", err);
                  }
                } else {
                  handleCheckForUpdates();
                }
              }}
              disabled={updateStatus === "checking"}
              className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 shrink-0 ${
                updateStatus === "checking"
                  ? "bg-bg-input text-text-tertiary cursor-wait"
                  : updateStatus === "available"
                    ? "bg-accent-primary text-white hover:bg-accent-secondary shadow-lg shadow-blue-500/20"
                    : updateStatus === "uptodate"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : updateStatus === "error"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-bg-component hover:bg-bg-input text-text-primary"
              }`}
            >
              {updateStatus === "checking" ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Checking...
                </>
              ) : updateStatus === "available" ? (
                <>
                  <ArrowDown size={14} />
                  Update Available
                </>
              ) : updateStatus === "uptodate" ? (
                <>
                  <Check size={14} />
                  Up to date
                </>
              ) : updateStatus === "error" ? (
                <>
                  <X size={14} />
                  Error
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Check for updates
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
