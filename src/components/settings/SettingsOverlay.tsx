import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { AboutSection } from "../AboutSection";
import { AIProvidersSettings } from "./AIProvidersSettings";
import { Toast } from "../ui/Toast";
import { useToast } from "@/hooks/useToast";
import {
  Sidebar,
  GeneralSettings,
  AudioSettings,
  KeybindsSettings,
} from "./overlay";

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const toast = useToast();

  const getToastIcon = () => {
    switch (toast.config.variant) {
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

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings isOpen={isOpen} onClose={onClose} />;
      case "ai-providers":
        return <AIProvidersSettings />;
      case "audio":
        return <AudioSettings />;
      case "keybinds":
        return <KeybindsSettings />;
      case "about":
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-bg-sidebar w-full max-w-4xl h-[80vh]  rounded-2xl border border-border-subtle shadow-2xl flex overflow-hidden"
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onClose={onClose}
            />

            <div className="flex-1 overflow-y-auto bg-bg-main p-8  border-bg-sidebar rounded-2xl border-3">
              {renderContent()}
            </div>
          </motion.div>
        </motion.div>
      )}
      <Toast
        isOpen={toast.isOpen}
        title={toast.config.title}
        description={toast.config.description}
        icon={getToastIcon()}
        iconAnimation={
          toast.config.variant === "default"
            ? "animate-[spin_2s_linear_infinite]"
            : ""
        }
        variant={toast.config.variant}
        duration={toast.config.duration}
        onClose={toast.hide}
        position="bottom-right"
      />
    </AnimatePresence>
  );
};

export default SettingsOverlay;
