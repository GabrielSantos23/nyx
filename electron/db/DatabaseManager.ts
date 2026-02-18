import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

export interface Chat {
  id: number;
  title: string;
  createdAt: number;
  transcript: string;
  aiResponse: string;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(app.getPath("userData"), "database.sqlite");
  }

  public init(): void {
    try {
      this.db = new Database(this.dbPath);
      this.prepareTables();
    } catch (error) {
      console.error("Failed to initialize database", error);
    }
  }

  private prepareTables() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        transcript TEXT,
        aiResponse TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(chatId) REFERENCES chats(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime INTEGER,
        endTime INTEGER,
        title TEXT,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetingId INTEGER,
        speaker TEXT,
        text TEXT,
        timestamp INTEGER,
        FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetingId INTEGER,
        question TEXT,
        answer TEXT,
        timestamp INTEGER,
        FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetingId INTEGER,
        content TEXT,
        embedding JSON,
        FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS chunk_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetingId INTEGER,
        summary TEXT,
        tags JSON,
        FOREIGN KEY(meetingId) REFERENCES meetings(id) ON DELETE CASCADE
      );
    `);
  }

  public getInstance(): Database.Database | null {
    return this.db;
  }

  public createChat(title: string, transcript: string, aiResponse: string): number | null {
    if (!this.db) return null;
    
    const stmt = this.db.prepare(`
      INSERT INTO chats (title, createdAt, transcript, aiResponse)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(title, Date.now(), transcript, aiResponse);
    return result.lastInsertRowid as number;
  }

  public getAllChats(): Chat[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT id, title, createdAt, transcript, aiResponse
      FROM chats
      ORDER BY createdAt DESC
    `);
    
    return stmt.all() as Chat[];
  }

  public getChatById(id: number): Chat | null {
    if (!this.db) return null;
    
    const stmt = this.db.prepare(`
      SELECT id, title, createdAt, transcript, aiResponse
      FROM chats
      WHERE id = ?
    `);
    
    return stmt.get(id) as Chat | null;
  }

  public deleteChat(id: number): boolean {
    if (!this.db) return false;
    
    const stmt = this.db.prepare("DELETE FROM chats WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public addChatMessage(chatId: number, role: "user" | "assistant", content: string): number | null {
    if (!this.db) return null;
    
    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (chatId, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(chatId, role, content, Date.now());
    return result.lastInsertRowid as number;
  }

  public getChatMessages(chatId: number): ChatMessage[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT id, chatId, role, content, timestamp
      FROM chat_messages
      WHERE chatId = ?
      ORDER BY timestamp ASC
    `);
    
    return stmt.all(chatId) as ChatMessage[];
  }

  public updateChat(id: number, transcript: string, aiResponse: string): boolean {
    if (!this.db) return false;
    
    const stmt = this.db.prepare(`
      UPDATE chats
      SET transcript = ?, aiResponse = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(transcript, aiResponse, id);
    return result.changes > 0;
  }
}

export const dbRequest = new DatabaseManager();
