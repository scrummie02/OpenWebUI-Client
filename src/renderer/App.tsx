import React, { useState, useEffect } from 'react';

// Define a chat message type used by the UI
interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

/**
 * The main application component for the native OpenWebUI client.
 *
 * This component maintains state for the server URL, API key, selected model,
 * authentication token, chat messages, and UI inputs. It persists the
 * server URL and API key in localStorage so they are restored on reload and
 * performs API calls against OpenWebUI's REST endpoints using the Bearer
 * authentication scheme. When connected, it fetches the list of available
 * models and chooses the first one to send chat completion requests with.
 */
const App: React.FC = () => {
  // URL of the OpenWebUI instance (without the trailing /api path)
  const [serverUrl, setServerUrl] = useState('');
  // User‑supplied API key (also used as bearer token)
  const [apiKey, setApiKey] = useState('');
  // Active authentication token (null when disconnected)
  const [token, setToken] = useState<string | null>(null);
  // Selected model identifier returned from /api/models
  const [model, setModel] = useState<string | null>(null);
  // History of chat messages shown in the UI
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Current text typed by the user in the input box
  const [currentMsg, setCurrentMsg] = useState('');
  // Any error message to display to the user
  const [error, setError] = useState<string | null>(null);

  /**
   * On component mount, populate the server URL and API key from
   * localStorage. If an API key is present, immediately set the token so
   * that the user does not need to re‑enter it every session.
   */
  useEffect(() => {
    const savedUrl = localStorage.getItem('serverUrl') || '';
    const savedKey = localStorage.getItem('apiKey') || '';
    if (savedUrl) setServerUrl(savedUrl);
    if (savedKey) {
      setApiKey(savedKey);
      setToken(savedKey);
    }
  }, []);

  /**
   * Compute the base API path from the server URL. Ensures the URL ends
   * with '/api'. This helper avoids requiring the user to include '/api'
   * themselves when entering the server address.
   */
  const getApiBase = () => {
    const trimmed = serverUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };

  /**
   * Fetch the list of available models from the server and return the first
   * model's identifier. If no models are found or an error occurs, null is
   * returned. Requires a valid authentication token to be set.
   */
  const fetchFirstModel = async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiBase()}/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          const first = data.models[0];
          // Some endpoints return an object with id/name fields
          return first.id || first.name || null;
        }
      } else {
        const text = await res.text();
        console.warn('Unexpected response:', text);
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  /**
   * Whenever the token or server URL changes, attempt to fetch the
   * available models. On success, update the model state; otherwise set
   * an error. This effect also clears the existing chat messages when
   * reconnecting to a different server to avoid mixing sessions.
   */
  useEffect(() => {
    const setup = async () => {
      if (!token) return;
      setError(null);
      // Clear previous chat when reconnecting
      setMessages([]);
      const mdl = await fetchFirstModel();
      if (mdl) {
        setModel(mdl);
      } else {
        setModel(null);
        setError('Failed to retrieve models');
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, serverUrl]);

  /**
   * Handle connect button click. Validates inputs, saves credentials to
   * localStorage, and sets the authentication token. Model discovery is
   * performed automatically by the useEffect above when the token is set.
   */
  const connect = () => {
    setError(null);
    const url = serverUrl.trim();
    const key = apiKey.trim();
    if (!url || !key) {
      setError('Server URL and API key required');
      return;
    }
    localStorage.setItem('serverUrl', url);
    localStorage.setItem('apiKey', key);
    setToken(key);
  };

  /**
   * Send the current message to the server via the chat completions API.
   * Constructs the conversation array from the existing messages plus the
   * new user message, calls the /api/chat/completions endpoint, and
   * appends the assistant's reply to the chat history. Handles
   * unexpected responses and network errors gracefully.
   */
  const sendMessage = async () => {
    if (!token || !model) return;
    const trimmed = currentMsg.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: trimmed,
      role: 'user'
    };
    // Optimistically add the user's message to the UI
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMsg('');
    const conversation = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.text
    }));
    try {
      const res = await fetch(`${getApiBase()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model: model,
          messages: conversation
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        // The API returns an array of choices with assistant messages
        if (data.choices && data.choices.length > 0) {
          const reply =
            data.choices[0].message?.content || data.choices[0].delta?.content || '';
          if (reply) {
            const assistantMsg: ChatMessage = {
              id: Date.now().toString() + '-a',
              text: reply,
              role: 'assistant'
            };
            setMessages((prev) => [...prev, assistantMsg]);
          }
        } else if (data.messages) {
          // Some endpoints return a messages array instead of choices
          const assistantMessages: ChatMessage[] = (data.messages as any[])
            .filter((msg: any) => msg.role && msg.role !== 'user')
            .map((msg: any) => ({
              id: msg.id || Date.now().toString() + '-a',
              text: msg.content || msg.text || '',
              role: msg.role || 'assistant'
            }));
          setMessages((prev) => [...prev, ...assistantMessages]);
        } else {
          setError('Invalid response format');
        }
      } else {
        const text = await res.text();
        console.warn('Unexpected response:', text);
        setError(`Unexpected response: ${text}`);
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  // Render a simple connection form when not authenticated
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

  // Once authenticated, ensure a model has been selected before rendering chat
  if (!model) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading available models...</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  // Render the chat interface
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
