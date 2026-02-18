import { dbRequest } from "../db/DatabaseManager";

export class RAGManager {
  constructor() {}

  async processMeeting(meetingId: number) {
    console.log(`Processing meeting ${meetingId} for RAG`);
  }

  async retrieval(query: string, limit: number = 3): Promise<any[]> {
    return [
      { content: "This is a relevant chunk related to " + query, score: 0.9 },
    ];
  }
}

export const ragManager = new RAGManager();
