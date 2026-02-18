import { useState, useEffect } from "react";
import { Ghost, RefreshCw } from "lucide-react";
import icon from "./icon.png";
import { useToast } from "@/contexts/ToastContext";

interface BannerProps {
  onRefresh?: () => void | Promise<void>;
  isOverlayVisible?: boolean;
  onCloseOverlay?: () => void;
}

export const Banner = ({
  onRefresh,
  isOverlayVisible,
  onCloseOverlay,
}: BannerProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetectable, setIsDetectable] = useState(true);
  const [_status, setStatus] = useState("Idle");
  const [_transcript, setTranscript] = useState<
    Array<{ speaker: string; text: string }>
  >([]);
  const [_interim, setInterim] = useState("");
  const [_isRunning, setIsRunning] = useState(false);
  const [isPrepared, setIsPrepared] = useState(false);
  const [preparedEvent, setPreparedEvent] = useState<any>(null);
  const [upcomingEvents, _setUpcomingEvents] = useState<any[]>([]);
  const [isCalendarConnected, _setIsCalendarConnected] = useState(false);

  const { show } = useToast();

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

  const handlePrepare = (event: any) => {
    setPreparedEvent(event);
    setIsPrepared(true);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await onRefresh?.();
      show({
        title: "State Refreshed",
        description: "Your chats and settings are up to date",
        variant: "success",
        duration: 5000,
      });
    } catch (e) {
      console.error("Failed to load chats", e);
      show({
        title: "Refresh Failed",
        description: "Could not update state",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const start = async () => {
    setStatus("Starting...");
    try {
      await (window as any).electronAPI?.showOverlay();
    } catch (err: any) {
      setStatus("Error: " + (err.message || String(err)));
    }
  };

  const handleStartPreparedMeeting = async () => {
    if (!preparedEvent) return;
    try {
      await (window as any).electronAPI?.startMeeting();
      setIsPrepared(false);
    } catch (e) {
      console.error("Failed to start prepared meeting", e);
    }
  };

  const nextMeeting = upcomingEvents.find((e) => {
    const diff = new Date(e.startTime).getTime() - Date.now();
    return diff > -5 * 60000 && diff < 60 * 60000;
  });

  return (
    <div className="bg-bg-elevated px-8 pt-6 pb-8 border-b border-border-subtle shrink-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-celeb-light font-medium text-text-primary tracking-wide drop-shadow-sm">
              My Nyx
            </h1>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 text-text-secondary hover:text-text-primary hover:bg-bg-item-active rounded-full transition-colors ${isRefreshing ? "animate-spin text-accent-primary" : ""}`}
              title="Refresh State"
            >
              <RefreshCw size={18} />
            </button>

            <div className="flex items-center gap-3 bg-bg-card border border-border-muted rounded-full px-3 py-1.5 min-w-[140px]">
              {isDetectable ? (
                <Ghost
                  size={14}
                  strokeWidth={2}
                  className="text-text-secondary transition-colors"
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
              <span className="text-xs font-medium flex-1 transition-colors text-text-tertiary">
                {isDetectable ? "Detectable" : "Undetectable"}
              </span>
              <div
                className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${!isDetectable ? "bg-accent-primary" : "bg-bg-toggle-switch"}`}
                onClick={toggleDetectable}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-text-primary transition-all ${!isDetectable ? "left-[18px]" : "left-0.5"}`}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (isOverlayVisible) {
                onCloseOverlay?.();
              } else {
                start();
              }
            }}
            className={`
              group relative overflow-hidden
              bg-bg-sidebar hover:bg-bg-item-active border-border-muted hover:border-border-subtle
              text-text-primary
              px-6 py-3
              rounded-full
              font-celeb font-medium tracking-normal
              border
              shadow-[0_1px_3px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.2)]
              hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]
              active:scale-[0.98] active:shadow-none
              transition-all duration-200 ease-out
              flex items-center justify-center gap-3
            `}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-text-primary/10 pointer-events-none" />

            <div
              className={`
                w-2 h-2 rounded-full flex-shrink-0
                ${
                  isOverlayVisible
                    ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                    : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                }
              `}
            />

            <span className="text-[20px] leading-none text-text-primary/90">
              {isOverlayVisible ? "Close Nyx" : "Start Nyx"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
