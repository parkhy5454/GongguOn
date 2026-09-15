'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ChannelPage() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [chRes, msgRes] = await Promise.all([
        fetch(`/api/channels/${id}`),
        fetch(`/api/channels/${id}/messages`),
      ]);
      if (!active) return;
      if (chRes.ok) setChannel((await chRes.json()).channel);
      if (msgRes.ok) setMessages((await msgRes.json()).messages);
    }
    load();

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;
    socket.emit('join-channel', id);

    socket.on('new-message', (msg) => {
      if (msg.channelId === id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('message-updated', (msg) => {
      if (msg.channelId === id) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    });

    socket.on('todo-created', (todo) => {
      if (todo.channelId === id) {
        setMessages((prev) => prev.map((m) => (m.id === todo.messageId ? { ...m, todo } : m)));
      }
    });

    return () => {
      active = false;
      socket.emit('leave-channel', id);
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);

    let attachment = null;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (upRes.ok) attachment = await upRes.json();
    }

    await fetch(`/api/channels/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() || `📎 ${file?.name}`, attachment }),
    });

    setText('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(false);
  }

  async function toggleDecision(messageId) {
    const res = await fetch(`/api/messages/${messageId}/decision`, { method: 'PATCH' });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    }
  }

  async function makeTodo(messageId) {
    const res = await fetch(`/api/messages/${messageId}/todo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { todo } = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, todo } : m)));
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1># {channel?.name || '...'}</h1>
          {channel?.description && <p>{channel.description}</p>}
        </div>
      </div>

      <div className="content">
        <div className="message-list">
          {messages.length === 0 && <div className="empty-state">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</div>}
          {messages.map((m) => (
            <div key={m.id} className={`message-row ${m.isDecision ? 'is-decision' : ''}`}>
              <div className="avatar">{initials(m.author?.name)}</div>
              <div className="message-body">
                <div className="message-meta">
                  {m.isDecision && <span className="decision-tag">📌 결정됨</span>}
                  <span className="message-author">{m.author?.name}</span>
                  <span className="message-time">{formatTime(m.createdAt)}</span>
                </div>
                <div className="message-text">{m.content}</div>
                {m.attachments?.map((a) => (
                  <a key={a.id} className="attachment" href={a.url} target="_blank" rel="noreferrer">
                    📎 {a.filename}
                  </a>
                ))}
                {m.todo && (
                  <div className="attachment" style={{ borderColor: 'var(--accent)' }}>
                    ✅ 할 일로 등록됨 · {m.todo.status}
                  </div>
                )}
                <div className="message-actions">
                  <button className={`mini-btn ${m.isDecision ? 'on' : ''}`} onClick={() => toggleDecision(m.id)}>
                    {m.isDecision ? '결정 해제' : '결정으로 표시'}
                  </button>
                  {!m.todo && (
                    <button className="mini-btn" onClick={() => makeTodo(m.id)}>
                      할 일로 전환
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form className="composer" onSubmit={sendMessage}>
        {file && (
          <div className="attachment" style={{ alignSelf: 'flex-start' }}>
            📎 {file.name}
            <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', marginLeft: 4, cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}
        <div className="composer-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            title="파일 첨부"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={sending} style={{ width: 'auto', padding: '10px 18px' }}>
            보내기
          </button>
        </div>
      </form>
    </>
  );
}
