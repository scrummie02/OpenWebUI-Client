import React, { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

const App: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMsg, setCurrentMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('serverUrl') || '';
    const savedKey = localStorage.getItem('apiKey') || '';
    if (savedUrl) setServerUrl(savedUrl);
    if (savedKey) {
      setApiKey(savedKey);
      setToken(savedKey);
    }
  }, []);

  // Helper to compute API base path
  const getApiBase = () => {
    const trimmed = serverUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };

  // Fetch chat history once authenticated.
  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${getApiBase()}/chats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          const text = await res.text();
          console.warn('Unexpected response:', text);
          setError('Failed to fetch chat history');
        }
      } catch (err) {
        console.error(err);
        setError('Network error');
      }
    };
    fetchHistory();
  }, [serverUrl, token]);

  // Connect using API key
  const connect = () => {
    setError(null);
    const key = apiKey.trim();
    const url = serverUrl.trim();
    if (!key || !url) {
      setError('Server URL and API key required');
      return;
    }
    // Save credentials locally (not exposed publicly)
    localStorage.setItem('serverUrl', url);
    localStorage.setItem('apiKey', key);
    setToken(key);
  };

  const sendMessage = async () => {
    if (!token) return;
    const trimmed = currentMsg.trim();
    if (!trimmed) return;
    const newMsg: ChatMessage = { id: Date.now().toString(), text: trimmed, role: 'user' };
    setMessages((prev) => [...prev, newMsg]);
    setCurrentMsg('');
    try {
      const res = await fetch(`${getApiBase()}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMsg.text })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const assistantMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          text: msg.text || msg.content || '',
          role: msg.role || 'assistant'
        }));
        setMessages((prev) => [...prev, ...assistantMessages]);
      } else {
        const text = await res.text();
        console.warn('Unexpected response:', text);
        setError('Failed to send message');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  if (!token) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Connect to OpenWebUI</h2>
        <div>
          <input
            placeholder="Server URL (e.g., https://openwebui.example.com)"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <button onClick={connect}>Connect</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '1rem' }}>
        <input
          style={{ flex: 1, marginRight: '0.5rem' }}
          value={currentMsg}
          onChange={(e) => setCurrentMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      {error && <p style={{ color: 'red', padding: '0 1rem' }}>{error}</p>}
    </div>
  );
};

export default App;
