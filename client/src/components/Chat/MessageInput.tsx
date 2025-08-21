import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { currentChat, sendMessage, setTyping } = useChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentChat) return;

    sendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }

    if (!currentChat) return;

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      setTyping(currentChat.id, true, currentChat.type === 'group' ? currentChat.id : undefined);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        setTyping(currentChat.id, false, currentChat.type === 'group' ? currentChat.id : undefined);
      }
    }, 1000);

    if (!value.trim() && isTyping) {
      setIsTyping(false);
      setTyping(currentChat.id, false, currentChat.type === 'group' ? currentChat.id : undefined);
    }
  };

  if (!currentChat) {
    return null;
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputContainer}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            style={styles.textarea}
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            style={{
              ...styles.sendButton,
              ...(message.trim() ? styles.sendButtonActive : styles.sendButtonDisabled),
            }}
          >
            <span style={styles.sendIcon}>➤</span>
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '15px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: 'white',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '20px',
    padding: '8px 15px',
    border: '1px solid #e0e0e0',
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    resize: 'none' as const,
    fontSize: '14px',
    lineHeight: '1.4',
    padding: '6px 0',
    minHeight: '20px',
    maxHeight: '120px',
    fontFamily: 'inherit',
  },
  sendButton: {
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  sendButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#999',
    cursor: 'not-allowed',
  },
  sendIcon: {
    fontSize: '16px',
    transform: 'rotate(0deg)',
    transition: 'transform 0.2s',
  },
};