import { ChatMessage } from "../types";

export const formatTime = (ms: number) => {
  const date = new Date(ms);
  return date
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    .toLowerCase();
};

export const getModelDisplayName = (modelId: string) => {
  if (modelId.startsWith("ollama:")) {
    return modelId.replace("ollama:", "") + " (Local)";
  }
  if (modelId.startsWith("gemini:")) {
    return modelId.includes("pro") ? "Gemini Pro" : "Gemini Flash";
  }
  if (modelId.startsWith("groq:")) {
    return "Groq Llama";
  }
  return modelId;
};

export const generateMockTranscript = (messages: ChatMessage[]) => {
  const result: Array<{
    speaker: string;
    text: string;
    timestamp: number;
    modelUsed?: string;
    images?: string[];
    thinking?: string;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") {
      const nextMsg = messages[i + 1];
      if (nextMsg && nextMsg.role === "assistant") {
        result.push({
          speaker: "user",
          text: m.content,
          timestamp: m.timestamp || Date.now() - (messages.length - i) * 60000,
          images: m.images,
        });
        result.push({
          speaker: "assistant",
          text: nextMsg.content,
          timestamp:
            nextMsg.timestamp ||
            Date.now() - (messages.length - (i + 1)) * 60000,
          modelUsed: nextMsg.modelUsed,
          thinking: nextMsg.thinking,
        });
      }
    }
  }
  return result;
};

export const generateMockUsage = (messages: ChatMessage[]) => {
  return messages
    .filter((m) => m.role === "user")
    .map((m, i) => ({
      type: "chat" as const,
      timestamp: m.timestamp || Date.now() - i * 60000,
      question: m.content,
      answer:
        messages.find(
          (msg, idx) => idx > messages.indexOf(m) && msg.role === "assistant",
        )?.content || "",
    }));
};
