import { useEffect } from "react";
import { motion } from "framer-motion";

interface StartupSequenceProps {
  onComplete: () => void;
}

const StartupSequence = ({ onComplete }: StartupSequenceProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center overflow-hidden">
      <motion.div
        className="absolute w-96 h-96 bg-white/10 rounded-full blur-[120px]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1.2 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      <motion.img
        src="./app-icon.png"
        alt="App Icon"
        className="w-24 h-24 object-contain relative z-10"
        initial={{
          opacity: 0,
          scale: 0.5,
          filter:
            "grayscale(1) brightness(0.4) drop-shadow(0 0 0px rgba(255,255,255,0))",
        }}
        animate={{
          opacity: 1,
          scale: 1,
          filter: [
            "grayscale(1) brightness(0.4) drop-shadow(0 0 0px rgba(255,255,255,0))",
            "grayscale(1) brightness(0.4) drop-shadow(0 0 0px rgba(255,255,255,0))",
            "grayscale(0) brightness(1) drop-shadow(0 0 20px rgba(255,255,255,0.3))",
          ],
        }}
        transition={{
          opacity: { duration: 0.6, ease: "easeOut" },
          scale: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
          filter: { times: [0, 0.25, 1], duration: 1.8, ease: "easeInOut" },
        }}
      />
    </div>
  );
};

export default StartupSequence;
