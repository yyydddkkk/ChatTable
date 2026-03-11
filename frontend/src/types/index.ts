export interface WebSocketMessage {
  type: string;
  content?: string;
  timestamp?: string;
  agent_id?: string;
  agent_name?: string;
  [key: string]: any;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export interface Conversation {
  id: number;
  type: 'private' | 'group';
  name: string;
  members: string;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'agent';
  sender_id?: number;
  content: string;
  created_at: string;
}
