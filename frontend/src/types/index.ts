export interface WebSocketMessage {
  type: string;
  content?: string;
  timestamp?: string;
  agent_id?: string;
  agent_name?: string;
  [key: string]: any;
}

export type MessageHandler = (message: WebSocketMessage) => void;
