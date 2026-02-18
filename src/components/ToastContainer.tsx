import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import { Check, X, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Toast } from "./ui/Toast";

const getIconForVariant = (variant?: string) => {
  switch (variant) {
    case "success":
      return Check;
    case "error":
      return X;
    case "warning":
      return AlertTriangle;
    case "info":
      return Info;
    default:
      return RefreshCw;
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandTimer, setExpandTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (expandTimer) {
      clearTimeout(expandTimer);
      setExpandTimer(null);
    }
    const timer = setTimeout(() => {
      setIsExpanded(true);
    }, 300);
    setExpandTimer(timer);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (expandTimer) {
      clearTimeout(expandTimer);
      setExpandTimer(null);
    }
    setIsExpanded(false);
  };

  if (toasts.length === 0) return null;

  const containerHeight = isExpanded
    ? toasts.length * 80
    : 70 + (toasts.length - 1) * 16;

  return (
    <div
      className="fixed bottom-6 right-6 z-[2000] pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative" style={{ height: containerHeight }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => (
            <Toast
              key={toast.id}
              {...toast}
              icon={toast.icon || getIconForVariant(toast.variant)}
              onDismiss={dismiss}
              index={index}
              totalCount={toasts.length}
              isExpanded={isExpanded}
              isPaused={isHovered}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
