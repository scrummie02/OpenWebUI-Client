import React, { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

const App: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMsg, setCurrentMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch chat history once authenticated.
  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/chats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          setError('Failed to fetch chat history');
        }
      } catch (err) {
        console.error(err);
        setError('Network error');
      }
    };
    fetchHistory();
  }, [serverUrl, token]);

  const login = async () => {
  setError(null);
  try {
    const res = await fetch(`${serverUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
    } else {
      setError('Login failed');
    }
  } catch (err) {
    console.error(err);
    setError('Network error');
  }
  };

  const sendMessage = async () => {
    if (!token) return;
    const trimmed = currentMsg.trim();
    if (!trimmed) return;
    const newMsg: ChatMessage = { id: Date.now().toString(), text: trimmed, role: 'user' };
    setMessages((prev) => [...prev, newMsg]);
    setCurrentMsg('');
    try {
      const res = await fetch(`${serverUrl}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMsg.text })
      });
      if (res.ok) {
        const data = await res.json();
        // Append assistant messages to chat.
        const assistantMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          text: msg.text || msg.content || '',
          role: msg.role || 'assistant'
        }));
        setMessages((prev) => [...prev, ...assistantMessages]);
      } else {
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
        <h2>Login to OpenWebUI</h2>
        <div>
          <input
            placeholder="Server URL (e.g., https://openwebui.example.com)"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <button onClick={login}>Login</button>
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
