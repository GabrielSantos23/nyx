import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface ChatSummary {
  overview: string;
  actionItems: string[];
  keyPoints: string[];
  generatedAt: number;
}

export interface ChatFile {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  summary?: ChatSummary;
  titleGenerated?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  images?: string[];
  thinking?: string;
}

export class ChatFileManager {
  private chatsDir: string;

  constructor() {
    this.chatsDir = path.join(app.getPath("userData"), "chats");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.chatsDir)) {
      fs.mkdirSync(this.chatsDir, { recursive: true });
    }
  }

  public saveChat(messages: ChatMessage[]): string | null {
    if (messages.length === 0) return null;

    const id = Date.now().toString();
    const title = this.generateTitle(messages);

    const chat: ChatFile = {
      id,
      title,
      createdAt: Date.now(),
      messages,
    };

    const filePath = this.getChatPath(id);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return id;
  }

  public appendMessage(chatId: string, message: ChatMessage): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    chat.messages.push(message);
    const filePath = this.getChatPath(chatId);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return true;
  }

  public createChat(firstMessage: ChatMessage): string | null {
    if (!firstMessage.content.trim()) return null;

    const id = Date.now().toString();
    const title = this.generateTitle([firstMessage]);

    const chat: ChatFile = {
      id,
      title,
      createdAt: Date.now(),
      messages: [firstMessage],
    };

    const filePath = this.getChatPath(id);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return id;
  }

  public getAllChats(): ChatFile[] {
    this.ensureDir();
    const files = fs.readdirSync(this.chatsDir);
    const chats: ChatFile[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = fs.readFileSync(
            path.join(this.chatsDir, file),
            "utf-8",
          );
          const chat = JSON.parse(content) as ChatFile;
          chats.push(chat);
        } catch (e) {
          console.error(`Failed to read chat file ${file}`, e);
        }
      }
    }

    return chats.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getChatById(id: string): ChatFile | null {
    const filePath = this.getChatPath(id);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as ChatFile;
    } catch (e) {
      console.error(`Failed to read chat ${id}`, e);
      return null;
    }
  }

  public deleteChat(id: string): boolean {
    const filePath = this.getChatPath(id);
    if (!fs.existsSync(filePath)) return false;

    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      console.error(`Failed to delete chat ${id}`, e);
      return false;
    }
  }

  public updateChat(id: string, messages: ChatMessage[]): boolean {
    const chat = this.getChatById(id);
    if (!chat) return false;

    chat.messages = messages;
    chat.title = this.generateTitle(messages);

    const filePath = this.getChatPath(id);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return true;
  }

  public updateSummary(id: string, summary: ChatSummary): boolean {
    const chat = this.getChatById(id);
    if (!chat) return false;

    chat.summary = summary;

    const filePath = this.getChatPath(id);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return true;
  }

  public updateTitle(id: string, title: string): boolean {
    const chat = this.getChatById(id);
    if (!chat) return false;

    chat.title = title;
    chat.titleGenerated = true;

    const filePath = this.getChatPath(id);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8");
    return true;
  }

  private getChatPath(id: string): string {
    return path.join(this.chatsDir, `${id}.json`);
  }

  private generateTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      return content.length > 50 ? content.substring(0, 50) + "..." : content;
    }
    return "New Chat";
  }
}

export const chatFileManager = new ChatFileManager();
