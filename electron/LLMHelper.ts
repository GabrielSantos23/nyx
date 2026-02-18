import * as path from "node:path";
import * as fs from "node:fs";
import { app } from "electron";
import { CHAT_SYSTEM_PROMPT } from "./prompts";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ImageMessage extends ChatMessage {
  images?: string[];
}

const credentialsPath = path.join(app.getPath("userData"), "credentials.json");

function loadStoredCredentials(): Record<string, string> {
  try {
    if (fs.existsSync(credentialsPath)) {
      const data = fs.readFileSync(credentialsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load credentials:", e);
  }
  return {};
}

function saveCredentials(creds: Record<string, string>) {
  try {
    fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2));
  } catch (e) {
    console.error("Failed to save credentials:", e);
  }
}

export class LLMHelper {
  private selectedModel: string = "groq";
  private abortController: AbortController | null = null;

  abortStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  setModel(model: string) {
    this.selectedModel = model;
    const creds = loadStoredCredentials();
    creds.selectedModel = model;
    saveCredentials(creds);
  }

  getModel(): string {
    const creds = loadStoredCredentials();
    return creds.selectedModel || this.selectedModel;
  }

  async generateSummaryWithGroq(
    prompt: string,
    context: ChatMessage[],
  ): Promise<{ content: string; modelUsed: string }> {
    const storedCreds = loadStoredCredentials();
    const groqKey = storedCreds.groqApiKey || process.env.GROQ_API_KEY;

    if (groqKey) {
      const content = await this.callGroq(
        groqKey,
        prompt,
        context,
        CHAT_SYSTEM_PROMPT,
      );
      return { content, modelUsed: "groq:llama-3.3-70b-versatile" };
    }

    return {
      content: "No Groq API key available for summary generation.",
      modelUsed: "none",
    };
  }

  async generateTitleWithGroq(
    prompt: string,
  ): Promise<{ content: string; modelUsed: string }> {
    const storedCreds = loadStoredCredentials();
    const groqKey = storedCreds.groqApiKey || process.env.GROQ_API_KEY;

    if (!groqKey) {
      return { content: "", modelUsed: "none" };
    }

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 30,
            temperature: 0.3,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq title generation error:", errorText);
        return { content: "", modelUsed: "none" };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() || "";
      return { content: text, modelUsed: "groq:llama-3.3-70b-versatile" };
    } catch (error) {
      console.error("Groq title generation failed:", error);
      return { content: "", modelUsed: "none" };
    }
  }

  async generate(
    prompt: string,
    context: ChatMessage[] | string[],
    systemPrompt: string = CHAT_SYSTEM_PROMPT,
  ): Promise<{ content: string; modelUsed: string }> {
    const storedCreds = loadStoredCredentials();
    const selectedModel = storedCreds.selectedModel || this.selectedModel;
    const groqKey = storedCreds.groqApiKey || process.env.GROQ_API_KEY;
    const geminiKey = storedCreds.geminiApiKey;

    const chatHistory = this.normalizeContext(context);
    console.log("Chat history for AI:", JSON.stringify(chatHistory, null, 2));
    console.log("Selected model:", selectedModel);

    if (selectedModel.startsWith("ollama-")) {
      const modelName = selectedModel.replace("ollama-", "");
      console.log("Using Ollama model:", modelName);
      const content = await this.callOllama(
        modelName,
        prompt,
        chatHistory,
        systemPrompt,
      );
      console.log("Ollama content result:", content);
      return { content, modelUsed: `ollama:${modelName}` };
    }

    if (selectedModel.startsWith("gemini") && geminiKey) {
      const content = await this.callGemini(
        geminiKey,
        selectedModel,
        prompt,
        chatHistory,
        systemPrompt,
      );
      return { content, modelUsed: `gemini:${selectedModel}` };
    }

    if (groqKey) {
      const content = await this.callGroq(
        groqKey,
        prompt,
        chatHistory,
        systemPrompt,
      );
      return { content, modelUsed: "groq:llama-3.3-70b-versatile" };
    }

    console.log("No API keys found");
    return {
      content:
        "Add GROQ_API_KEY or OPENAI_API_KEY to your .env file for AI assistance.",
      modelUsed: "none",
    };
  }

  async generateWithCustomSystemPrompt(
    prompt: string,
    context: ChatMessage[] | string[],
    systemPrompt: string,
  ): Promise<{ content: string; modelUsed: string }> {
    return this.generate(prompt, context, systemPrompt);
  }

  private normalizeContext(context: ChatMessage[] | string[]): ChatMessage[] {
    if (context.length === 0) return [];

    if (typeof context[0] === "string") {
      return [];
    }

    return context as ChatMessage[];
  }

  private async callOllama(
    model: string,
    prompt: string,
    chatHistory: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-20),
      { role: "user", content: prompt },
    ];

    console.log(
      "Calling Ollama with model:",
      model,
      "messages:",
      JSON.stringify(messages, null, 2),
    );

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ollama API error:", errorText);
        return "";
      }

      const data = await response.json();
      console.log("Ollama response:", JSON.stringify(data, null, 2));
      const text = data.message?.content;

      if (text) {
        return text.trim();
      }

      return "";
    } catch (error) {
      console.error("Ollama API call failed:", error);
      return "";
    }
  }

  private async callGemini(
    apiKey: string,
    model: string,
    prompt: string,
    chatHistory: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const modelName =
      model === "gemini-pro" ? "gemini-1.5-pro" : "gemini-2.0-flash";

    const contents = chatHistory.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    contents.push({ role: "user", parts: [{ text: prompt }] });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        return "";
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        return text.trim();
      }

      return "";
    } catch (error) {
      console.error("Gemini API call failed:", error);
      return "";
    }
  }

  private async callGroq(
    apiKey: string,
    prompt: string,
    chatHistory: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-20),
      { role: "user", content: prompt },
    ];

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API error:", errorText);
        return "";
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        return text.trim();
      }

      return "";
    } catch (error) {
      console.error("Groq API call failed:", error);
      return "";
    }
  }

  async generateStream(
    prompt: string,
    context: ChatMessage[] | string[],
    callback: (chunk: string) => void,
  ): Promise<void> {
    this.abortController = new AbortController();
    const storedCreds = loadStoredCredentials();
    const selectedModel = storedCreds.selectedModel || this.selectedModel;
    const groqKey = storedCreds.groqApiKey || process.env.GROQ_API_KEY;
    const geminiKey = storedCreds.geminiApiKey;

    const chatHistory = this.normalizeContext(context);
    console.log("Stream Request:", {
      model: selectedModel,
      promptLength: prompt.length,
    });

    if (selectedModel.startsWith("ollama-")) {
      const modelName = selectedModel.replace("ollama-", "");
      await this.streamOllama(
        modelName,
        prompt,
        chatHistory,
        callback,
        this.abortController.signal,
      );
      return;
    }

    if (selectedModel.startsWith("gemini") && geminiKey) {
      await this.streamGemini(
        geminiKey,
        selectedModel,
        prompt,
        chatHistory,
        callback,
        this.abortController.signal,
      );
      return;
    }

    if (groqKey) {
      await this.streamGroq(
        groqKey,
        prompt,
        chatHistory,
        callback,
        this.abortController.signal,
      );
      return;
    }

    callback("Error: No API keys configured for " + selectedModel);
  }

  private async streamOllama(
    model: string,
    prompt: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) {
    const messages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...chatHistory.slice(-20),
      { role: "user", content: prompt },
    ];

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              console.log(
                "Ollama raw chunk content:",
                JSON.stringify(data.message.content),
              );
              onChunk(data.message.content);
            }
            if (data.done) break;
          } catch (e) {
            console.error("Error parsing Ollama chunk", e);
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Ollama stream aborted");
        return;
      }
      console.error("Ollama stream error:", e);
      onChunk("\n[Error: Connection to Ollama failed]");
    }
  }

  private async streamGemini(
    apiKey: string,
    model: string,
    prompt: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) {
    const modelName =
      model === "gemini-pro" ? "gemini-1.5-pro" : "gemini-2.0-flash";
    const contents = chatHistory.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    contents.push({ role: "user", parts: [{ text: prompt }] });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          }),
          signal,
        },
      );

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.substring(6).trim();
            if (jsonStr === "[DONE]") return;
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) onChunk(text);
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Gemini stream aborted");
        return;
      }
      console.error("Gemini stream error:", e);
      onChunk("\n[Error: Gemini API failure]");
    }
  }

  private async streamGroq(
    apiKey: string,
    prompt: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) {
    const messages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...chatHistory.slice(-20),
      { role: "user", content: prompt },
    ];

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 1000,
            temperature: 0.7,
            stream: true,
          }),
          signal,
        },
      );

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.trim() === "data: [DONE]") return;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Groq stream aborted");
        return;
      }
      console.error("Groq stream error:", e);
      onChunk("\n[Error: Groq API failure]");
    }
  }

  async analyzeImageWithStream(
    prompt: string,
    imagePath: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const storedCreds = loadStoredCredentials();
    const selectedModel = storedCreds.selectedModel || this.selectedModel;
    const geminiKey = storedCreds.geminiApiKey;

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

    if (selectedModel.startsWith("ollama-")) {
      const modelName = selectedModel.replace("ollama-", "");
      await this.streamOllamaWithImage(
        modelName,
        prompt,
        base64Image,
        chatHistory,
        onChunk,
      );
      return;
    }

    if (selectedModel.startsWith("gemini") && geminiKey) {
      await this.streamGeminiWithImage(
        geminiKey,
        selectedModel,
        prompt,
        base64Image,
        mimeType,
        chatHistory,
        onChunk,
      );
      return;
    }

    onChunk(
      "[Error: Image analysis requires Gemini or Ollama with vision support]",
    );
  }

  private async streamOllamaWithImage(
    model: string,
    prompt: string,
    base64Image: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const messages: { role: string; content: string; images?: string[] }[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...chatHistory.slice(-20),
      { role: "user", content: prompt, images: [base64Image] },
    ];

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              onChunk(data.message.content);
            }
            if (data.done) break;
          } catch (e) {
            console.error("Error parsing Ollama chunk", e);
          }
        }
      }
    } catch (e) {
      console.error("Ollama image stream error:", e);
      onChunk("\n[Error: Connection to Ollama failed]");
    }
  }

  private async streamGeminiWithImage(
    apiKey: string,
    model: string,
    prompt: string,
    base64Image: string,
    mimeType: string,
    chatHistory: ChatMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const modelName =
      model === "gemini-pro" ? "gemini-1.5-pro" : "gemini-2.0-flash";

    const contents = chatHistory.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }] as { text: string }[],
    }));

    contents.push({
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } },
      ] as any,
    });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          }),
        },
      );

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.substring(6).trim();
            if (jsonStr === "[DONE]") return;
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) onChunk(text);
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error("Gemini image stream error:", e);
      onChunk("\n[Error: Gemini API failure]");
    }
  }
}

export const llmHelper = new LLMHelper();
