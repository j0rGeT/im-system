import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatWindow() {
  const { currentChat, messages, loadMessages, typing } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentChat) {
      loadMessages(currentChat.type, currentChat.id);
    }
  }, [currentChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTypingUsers = () => {
    if (!currentChat) return [];
    
    return Object.entries(typing)
      .filter(([key, isTyping]) => {
        if (!isTyping) return false;
        
        if (currentChat.type === 'group') {
          return key.startsWith(`${currentChat.id}_`) && 
                 !key.endsWith(`_${user?._id}`);
        } else {
          return key === currentChat.id;
        }
      })
      .map(([key]) => {
        if (currentChat.type === 'group') {
          return key.split('_')[1];
        }
        return key;
      });
  };

  const typingUsers = getTypingUsers();

  if (!currentChat) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>💬</div>
        <h3 style={styles.emptyTitle}>选择一个聊天开始对话</h3>
        <p style={styles.emptyText}>从左侧选择好友或群组开始聊天</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.chatInfo}>
          <div style={styles.avatar}>
            {currentChat.avatar ? (
              <img src={currentChat.avatar} alt={currentChat.name} style={styles.avatarImage} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {currentChat.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={styles.chatDetails}>
            <h3 style={styles.chatName}>{currentChat.name}</h3>
            <p style={styles.chatType}>
              {currentChat.type === 'group' ? '群聊' : '私聊'}
            </p>
          </div>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        <MessageList messages={messages} />
        
        {typingUsers.length > 0 && (
          <div style={styles.typingIndicator}>
            <div style={styles.typingDots}>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
            </div>
            <span style={styles.typingText}>
              {typingUsers.length === 1 ? '正在输入...' : `${typingUsers.length}人正在输入...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <MessageInput />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: 'white',
  },
  header: {
    padding: '15px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: 'white',
    zIndex: 10,
  },
  chatInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avatarPlaceholder: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  chatDetails: {
    flex: 1,
  },
  chatName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  chatType: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e0e0e0',
  },
  typingDots: {
    display: 'flex',
    gap: '2px',
  },
  dot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#666',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  typingText: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5,
  },
  emptyTitle: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '20px',
  },
  emptyText: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
};