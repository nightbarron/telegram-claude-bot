export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
}

export interface Session {
  sessionId: string;
  userId: number;
  chatId: number;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
