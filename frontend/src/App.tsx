import { useEffect, useState } from 'react';
import { websocketService } from './services/websocket';
import { WebSocketMessage } from './types';

function App() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to test conversation
    websocketService.connect('test-conversation');
    setIsConnected(true);

    // Listen for messages
    const unsubscribe = websocketService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (inputValue.trim()) {
      websocketService.send({
        type: 'user_message',
        content: inputValue,
      });
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-4">
          ChatTable WebSocket Test
        </h1>

        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-4 mb-4 h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2 p-2 bg-background rounded">
              <div className="text-xs text-text-muted">{msg.type}</div>
              <div className="text-text">{msg.content || JSON.stringify(msg)}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

