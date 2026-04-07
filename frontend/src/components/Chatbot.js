import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const SUGGESTIONS = [
  'Show hostel overview',
  'Available rooms',
  'Fee pending students',
  'Unallocated students',
  'Allocation history',
  'Maintenance rooms',
];

export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello! 👋 I'm your Hostel Assistant. Ask me anything about rooms, students, fees, or allocations!\n\nType **\"help\"** to see all commands.",
      time: new Date(),
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;

    const userMsg = { id: Date.now(), type: 'user', text: userText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chatbot/message', { message: userText });
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: res.data.reply,
        time: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: '❌ Sorry, something went wrong. Please try again.',
        time: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatText = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold text **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} style={{ color: 'var(--accent-2)', fontWeight: 700 }}>{part}</strong>
                : part
            )}
            <br />
          </span>
        );
      });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 24px var(--accent-glow-lg)',
          zIndex: 500,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: open ? 'scale(0.9) rotate(10deg)' : 'scale(1)',
        }}
        title="Hostel Assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 96,
          right: 28,
          width: 380,
          height: 520,
          background: 'rgba(255, 252, 246, 0.96)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass-border-strong)',
          borderRadius: 'var(--r-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 499,
          boxShadow: '0 24px 48px rgba(114,78,32,0.14)',
          animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(245,179,67,0.1)',
          }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 0 16px var(--accent-glow)',
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Hostel Assistant
              </div>
              <div style={{ fontSize: 11, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.type === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: msg.type === 'user'
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                    : 'rgba(255,255,255,0.78)',
                  border: msg.type === 'user'
                    ? 'none'
                    : '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  boxShadow: msg.type === 'user'
                    ? '0 4px 14px var(--accent-glow)'
                    : 'none',
                }}>
                  {formatText(msg.text)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                  {formatTime(msg.time)}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.78)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '18px 18px 18px 4px',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent-2)',
                      animation: `pulse-glow 1s ease-in-out ${i * 0.2}s infinite`,
                      opacity: 0.7,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div style={{
            padding: '8px 16px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderTop: '1px solid var(--glass-border)',
          }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  padding: '4px 10px',
                  background: 'var(--glass-white)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 100,
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(124,107,255,0.4)'; e.target.style.color = 'var(--accent-2)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.color = 'var(--text-secondary)'; }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                padding: '9px 14px',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid var(--glass-border)',
                borderRadius: 100,
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(124,107,255,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                  : 'var(--glass-white)',
                border: '1px solid var(--glass-border)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.2s',
                flexShrink: 0,
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
