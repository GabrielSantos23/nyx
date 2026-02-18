import { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastContainer } from "@/components/ToastContainer";
import StartupSequence from "@/components/StartupSequence";
import Launcher from "./pages/Launcher";
import { Overlay } from "./components/overlay";

function AppContent() {
  const [showStartup, setShowStartup] = useState(true);
  const location = useLocation();
  const isOverlay = location.pathname === "/overlay";

  useEffect(() => {
    if (isOverlay) {
      setShowStartup(false);
    }
  }, [isOverlay]);

  useEffect(() => {
    if (showStartup && !isOverlay) {
      (window as any).electronAPI?.setTitleBarOverlay({
        color: "#000000",
        symbolColor: "#000000",
      });
    } else if (!isOverlay) {
      const theme =
        document.documentElement.getAttribute("data-theme") || "dark";
      const colors =
        theme === "dark"
          ? { color: "#050505", symbolColor: "#ffffff" }
          : { color: "#f2efe9", symbolColor: "#000000" };
      (window as any).electronAPI?.setTitleBarOverlay(colors);
    }
  }, [showStartup, isOverlay]);

  if (isOverlay) {
    return (
      <>
        <Overlay />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="h-full w-full relative bg-black text-white">
      <AnimatePresence>
        {showStartup ? (
          <motion.div
            key="startup"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              pointerEvents: "none",
              transition: { duration: 0.6, ease: "easeInOut" },
            }}
          >
            <StartupSequence onComplete={() => setShowStartup(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            className="h-full w-full"
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.19, 1, 0.22, 1],
              delay: 0.1,
            }}
          >
            <Launcher />
            <ToastContainer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/launcher" replace />} />
            <Route path="/launcher" element={<AppContent />} />
            <Route path="/overlay" element={<AppContent />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
