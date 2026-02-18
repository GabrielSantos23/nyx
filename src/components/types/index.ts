export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  isStreaming?: boolean;
  intent?: string;
  isCode?: boolean;
  images?: string[];
  thinking?: string;
  rawContent?: string;
}

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

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  summary: string;
  detailedSummary?: {
    actionItems: string[];
    keyPoints: string[];
  };
  transcript?: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
  usage?: Array<{
    type: "assist" | "followup" | "chat" | "followup_questions";
    timestamp: number;
    question?: string;
    answer?: string;
    items?: string[];
  }>;
  active?: boolean;
  time?: string;
}

export type HeaderState = "idle" | "focused" | "typing" | "results";

export interface SearchResult {
  id: string;
  type: "meeting";
  title: string;
  subtitle?: string;
  meetingId: string;
}

export interface HeaderProps {
  meetings: Meeting[];
  onAIQuery: (query: string) => void;
  onLiteralSearch: (query: string) => void;
  onOpenMeeting: (meetingId: string) => void;
  onExpansionChange?: (isExpanded: boolean) => void;
}

export interface ChatDetailsProps {
  chat: ChatFile;
  onBack: () => void;
  onUpdate?: (chat: ChatFile) => void;
  onOpenOverlay?: (chat: ChatFile, initialQuery?: string) => void;
}

export interface TopPillProps {
  expanded: boolean;
  onToggle: () => void;
  isListening: boolean;
}
