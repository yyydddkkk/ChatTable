import type { WebSocketMessage, MessageHandler } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: number | null = null;

  connect(conversationId: string) {
    this.conversationId = conversationId;
    this.createConnection();
  }

  private createConnection() {
    if (!this.conversationId) return;

    const wsUrl = `ws://localhost:8000/ws/${this.conversationId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle ping
        if (message.type === 'ping') {
          this.sendPong();
          return;
        }

        // Notify all handlers
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.createConnection();
    }, this.reconnectDelay);

    // Exponential backoff: 1s -> 2s -> 4s -> 8s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
  }

  private startHeartbeat() {
    // Respond to server pings (server sends ping every 30s)
    // No need to send our own pings
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendPong() {
    this.send({ type: 'pong', timestamp: new Date().toISOString() });
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.conversationId = null;
    this.messageHandlers.clear();
  }
}

export const websocketService = new WebSocketService();

