import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { LucideProps } from "lucide-react";

interface BaseToastProps {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
  icon?: React.ComponentType<LucideProps>;
  iconAnimation?: string;
}

interface StackedToastProps extends BaseToastProps {
  id: string;
  onDismiss: (id: string) => void;
  index: number;
  totalCount: number;
  isExpanded: boolean;
  isPaused: boolean;
}

interface InlineToastProps extends BaseToastProps {
  isOpen: boolean;
  onClose: () => void;
  position?: string;
}

type ToastProps = StackedToastProps | InlineToastProps;

const isStackedMode = (props: ToastProps): props is StackedToastProps => {
  return (
    "onDismiss" in props &&
    typeof props.onDismiss === "function" &&
    "index" in props
  );
};

const isInlineMode = (props: ToastProps): props is InlineToastProps => {
  return "isOpen" in props;
};

const variantStyles = {
  default: {
    iconBg: "from-blue-400/20 to-blue-600/20",
    iconColor: "text-blue-300",
    iconGlow: "bg-blue-500/20",
    iconShadow: "drop-shadow-[0_0_5px_rgba(59,130,246,0.6)]",
    descColor: "text-blue-200/60",
    border: "border-blue-500/20",
  },
  success: {
    iconBg: "from-green-400/20 to-green-600/20",
    iconColor: "text-green-300",
    iconGlow: "bg-green-500/20",
    iconShadow: "drop-shadow-[0_0_5px_rgba(34,197,94,0.6)]",
    descColor: "text-green-200/60",
    border: "border-green-500/20",
  },
  error: {
    iconBg: "from-red-400/20 to-red-600/20",
    iconColor: "text-red-300",
    iconGlow: "bg-red-500/20",
    iconShadow: "drop-shadow-[0_0_5px_rgba(239,68,68,0.6)]",
    descColor: "text-red-200/60",
    border: "border-red-500/20",
  },
  warning: {
    iconBg: "from-amber-400/20 to-amber-600/20",
    iconColor: "text-amber-300",
    iconGlow: "bg-amber-500/20",
    iconShadow: "drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]",
    descColor: "text-amber-200/60",
    border: "border-amber-500/20",
  },
  info: {
    iconBg: "from-purple-400/20 to-purple-600/20",
    iconColor: "text-purple-300",
    iconGlow: "bg-purple-500/20",
    iconShadow: "drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]",
    descColor: "text-purple-200/60",
    border: "border-purple-500/20",
  },
};

const ToastContent: React.FC<BaseToastProps & { onClose: () => void }> = ({
  title,
  description,
  variant = "default",
  icon: Icon,
  iconAnimation,
  onClose,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={`relative flex items-center gap-4 pl-4 pr-3 py-3.5 rounded-[18px] bg-[#2A2A2E]/95 backdrop-blur-xl saturate-[180%] border ${styles.border} shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(255,255,255,0.05)] ring-1 ring-black/10 cursor-pointer group min-w-[320px]`}
    >
      {Icon && (
        <div
          className={`relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-b ${styles.iconBg} shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/5 shrink-0`}
        >
          <div
            className={`absolute inset-0 rounded-full ${styles.iconGlow} blur-md`}
          />
          <Icon
            size={15}
            className={`${styles.iconColor} ${styles.iconShadow} ${iconAnimation || ""}`}
          />
        </div>
      )}

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-[14px] font-semibold text-white/95 leading-none tracking-tight drop-shadow-md truncate">
          {title}
        </span>
        {description && (
          <span
            className={`text-[11px] ${styles.descColor} font-medium leading-tight tracking-wide line-clamp-2`}
          >
            {description}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} className="text-white/60" />
      </button>

      <div className="absolute inset-0 rounded-[18px] bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

const StackedToast: React.FC<StackedToastProps> = (props) => {
  const {
    id,
    onDismiss,
    index,
    totalCount,
    isExpanded,
    isPaused,
    duration = 3000,
  } = props;

  const remainingMs = useRef(duration);
  const lastTick = useRef(Date.now());
  const dismissed = useRef(false);

  useEffect(() => {
    lastTick.current = Date.now();

    const interval = setInterval(() => {
      if (isPaused || dismissed.current) {
        lastTick.current = Date.now();
        return;
      }

      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;

      remainingMs.current -= delta;

      if (remainingMs.current <= 0 && !dismissed.current) {
        dismissed.current = true;
        onDismiss(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, onDismiss, isPaused]);

  const yOffset = index * (isExpanded ? 80 : 16);
  const scale = isExpanded
    ? 1
    : Math.max(0.9, 1 - (totalCount - 1 - index) * 0.03);
  const opacity = isExpanded
    ? 1
    : Math.max(0.8, 1 - (totalCount - 1 - index) * 0.05);

  return (
    <motion.div
      layout
      initial={{ x: 400, opacity: 0, scale: 0.9 }}
      animate={{
        x: 0,
        opacity: opacity,
        scale: scale,
        y: -yOffset,
      }}
      exit={{ x: 400, opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30,
        mass: 1,
      }}
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        zIndex: index,
      }}
    >
      <ToastContent {...props} onClose={() => onDismiss(id)} />
    </motion.div>
  );
};

const InlineToast: React.FC<InlineToastProps> = (props) => {
  const { isOpen, onClose, duration = 3000 } = props;
  const [isPaused, setIsPaused] = useState(false);

  const remainingMs = useRef(duration);
  const lastTick = useRef(Date.now());
  const dismissed = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      remainingMs.current = duration;
      dismissed.current = false;
      lastTick.current = Date.now();
      return;
    }

    lastTick.current = Date.now();

    const interval = setInterval(() => {
      if (isPaused || dismissed.current) {
        lastTick.current = Date.now();
        return;
      }

      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;

      remainingMs.current -= delta;

      if (remainingMs.current <= 0 && !dismissed.current) {
        dismissed.current = true;
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, duration, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30,
        mass: 1,
      }}
      className="fixed bottom-6 right-6 z-[2000]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <ToastContent {...props} onClose={onClose} />
    </motion.div>
  );
};

export const Toast: React.FC<ToastProps> = (props) => {
  if (isStackedMode(props)) {
    return <StackedToast {...props} />;
  }

  if (isInlineMode(props)) {
    return <InlineToast {...props} />;
  }

  return null;
};
