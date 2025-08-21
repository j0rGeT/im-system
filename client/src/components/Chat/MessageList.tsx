import React from 'react';
import { Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (days < 7) {
      return date.toLocaleDateString('zh-CN', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const isMyMessage = (message: Message) => {
    return message.sender._id === user?._id;
  };

  const getReadCount = (message: Message) => {
    if (!message.readBy) return 0;
    return message.readBy.length;
  };

  const shouldShowDate = (currentMessage: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const prevDate = new Date(messages[index - 1].createdAt).toDateString();
    
    return currentDate !== prevDate;
  };

  const shouldGroupWithPrevious = (currentMessage: Message, index: number) => {
    if (index === 0) return false;
    
    const prevMessage = messages[index - 1];
    const timeDiff = new Date(currentMessage.createdAt).getTime() - 
                    new Date(prevMessage.createdAt).getTime();
    
    return prevMessage.sender._id === currentMessage.sender._id && 
           timeDiff < 5 * 60 * 1000;
  };

  if (messages.length === 0) {
    return (
      <div style={styles.emptyMessages}>
        <p style={styles.emptyText}>还没有消息，开始聊天吧！</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((message, index) => {
        const isMine = isMyMessage(message);
        const showDate = shouldShowDate(message, index);
        const groupWithPrevious = shouldGroupWithPrevious(message, index);
        
        return (
          <div key={message._id} style={styles.messageWrapper}>
            {showDate && (
              <div style={styles.dateSeperator}>
                <span style={styles.dateText}>
                  {new Date(message.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            
            <div
              style={{
                ...styles.messageContainer,
                ...(isMine ? styles.myMessageContainer : styles.otherMessageContainer),
                ...(groupWithPrevious ? styles.groupedMessage : {}),
              }}
            >
              {!isMine && !groupWithPrevious && (
                <div style={styles.avatar}>
                  {message.sender.avatar ? (
                    <img 
                      src={message.sender.avatar} 
                      alt={message.sender.username}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {message.sender.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              
              {isMine && groupWithPrevious && <div style={styles.spacer} />}
              
              <div style={{
                ...styles.messageContent,
                ...(isMine ? styles.myMessageContent : styles.otherMessageContent),
              }}>
                {!isMine && !groupWithPrevious && (
                  <div style={styles.senderName}>{message.sender.username}</div>
                )}
                
                <div style={{
                  ...styles.messageBubble,
                  ...(isMine ? styles.myMessageBubble : styles.otherMessageBubble),
                }}>
                  <p style={styles.messageText}>{message.content}</p>
                  {message.edited && (
                    <span style={styles.editedLabel}>已编辑</span>
                  )}
                </div>
                
                <div style={{
                  ...styles.messageInfo,
                  ...(isMine ? styles.myMessageInfo : styles.otherMessageInfo),
                }}>
                  <span style={styles.messageTime}>
                    {formatTime(message.createdAt)}
                  </span>
                  {isMine && message.group && (
                    <span style={styles.readCount}>
                      {getReadCount(message) > 1 ? `${getReadCount(message)}人已读` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: '10px 0',
    overflowY: 'auto' as const,
  },
  messageWrapper: {
    marginBottom: '8px',
  },
  dateSeperator: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0 10px 0',
  },
  dateText: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    fontSize: '12px',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  messageContainer: {
    display: 'flex',
    padding: '0 20px',
    gap: '8px',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  groupedMessage: {
    marginTop: '2px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avatarPlaceholder: {
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  spacer: {
    width: '40px',
    flexShrink: 0,
  },
  messageContent: {
    maxWidth: '60%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  myMessageContent: {
    alignItems: 'flex-end',
  },
  otherMessageContent: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '2px',
    marginLeft: '8px',
  },
  messageBubble: {
    padding: '8px 12px',
    borderRadius: '18px',
    wordWrap: 'break-word' as const,
    wordBreak: 'break-word' as const,
  },
  myMessageBubble: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  otherMessageBubble: {
    backgroundColor: '#f1f3f4',
    color: '#333',
  },
  messageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.4,
  },
  editedLabel: {
    fontSize: '10px',
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: '2px',
  },
  messageInfo: {
    display: 'flex',
    gap: '8px',
    marginTop: '2px',
  },
  myMessageInfo: {
    justifyContent: 'flex-end',
  },
  otherMessageInfo: {
    justifyContent: 'flex-start',
    marginLeft: '8px',
  },
  messageTime: {
    fontSize: '10px',
    color: '#888',
  },
  readCount: {
    fontSize: '10px',
    color: '#888',
  },
  emptyMessages: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    padding: '40px',
  },
  emptyText: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
};