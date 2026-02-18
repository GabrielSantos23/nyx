import { useState, useCallback } from "react";

export interface ToastConfig {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
}

export const useToast = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ToastConfig>({
    title: "",
    description: "",
    variant: "default",
    duration: 3000,
  });

  const show = useCallback((newConfig: ToastConfig) => {
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const hide = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    config,
    show,
    hide,
  };
};
