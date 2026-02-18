import React from "react";

interface TranscriptionBarProps {
  manualTranscript: string;
  interim: string;
  lastSentIndex: number;
  transcriptionRef: React.RefObject<HTMLParagraphElement>;
}

const TranscriptionBar: React.FC<TranscriptionBarProps> = ({
  manualTranscript,
  interim,
  lastSentIndex,
  transcriptionRef,
}) => {
  if (!manualTranscript && !interim) return null;

  return (
    <div className="px-4 pt-4 pb-0 animate-in fade-in slide-in-from-bottom-1 relative">
      <div
        className="w-full relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <p
          ref={transcriptionRef}
          className="text-[14px] leading-relaxed text-slate-200 whitespace-nowrap overflow-x-auto scrollbar-hide px-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <span className="opacity-50 transition-opacity duration-300">
            {manualTranscript.slice(0, lastSentIndex)}
          </span>
          <span className="font-medium text-text-primary transition-colors duration-200">
            {manualTranscript.slice(lastSentIndex)}
          </span>
          <span className="text-text-secondary italic ml-1">{interim}</span>
        </p>
      </div>
    </div>
  );
};

export default TranscriptionBar;
