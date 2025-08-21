import React, { useState } from 'react';
import { friendsApi } from '../../utils/api';
import { User } from '../../types';

interface AddFriendModalProps {
  onClose: () => void;
  onAddFriend: (userId: string, message?: string) => void;
}

export default function AddFriendModal({ onClose, onAddFriend }: AddFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      alert('搜索关键词至少需要2个字符');
      return;
    }

    try {
      setLoading(true);
      const response = await friendsApi.searchUsers(searchQuery.trim());
      if (response.data?.users) {
        setSearchResults(response.data.users);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleSendRequest = () => {
    if (!selectedUser) return;
    onAddFriend(selectedUser._id, message.trim() || undefined);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>添加好友</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {!selectedUser ? (
            <>
              <div style={styles.searchSection}>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入用户名或邮箱搜索..."
                    style={styles.searchInput}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    style={{
                      ...styles.searchButton,
                      ...(loading || !searchQuery.trim() ? styles.searchButtonDisabled : {}),
                    }}
                  >
                    {loading ? '搜索中...' : '搜索'}
                  </button>
                </div>
              </div>

              <div style={styles.resultsSection}>
                {searchResults.length === 0 ? (
                  <div style={styles.emptyResults}>
                    {searchQuery ? '没有找到用户' : '输入关键词开始搜索'}
                  </div>
                ) : (
                  <div style={styles.userList}>
                    {searchResults.map((user) => (
                      <div
                        key={user._id}
                        onClick={() => handleUserSelect(user)}
                        style={styles.userItem}
                      >
                        <div style={styles.userAvatar}>
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.username}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <div style={styles.avatarPlaceholder}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div style={styles.userInfo}>
                          <h4 style={styles.userName}>{user.username}</h4>
                          <p style={styles.userEmail}>{user.email}</p>
                        </div>
                        <button style={styles.addButton}>添加</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={styles.requestSection}>
              <div style={styles.selectedUser}>
                <div style={styles.userAvatar}>
                  {selectedUser.avatar ? (
                    <img 
                      src={selectedUser.avatar} 
                      alt={selectedUser.username}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={styles.userInfo}>
                  <h4 style={styles.userName}>{selectedUser.username}</h4>
                  <p style={styles.userEmail}>{selectedUser.email}</p>
                </div>
              </div>

              <div style={styles.messageSection}>
                <label style={styles.messageLabel}>验证消息（可选）:</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="请输入验证消息..."
                  style={styles.messageInput}
                  maxLength={200}
                />
                <div style={styles.charCount}>{message.length}/200</div>
              </div>

              <div style={styles.requestActions}>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={styles.backButton}
                >
                  返回
                </button>
                <button
                  onClick={handleSendRequest}
                  style={styles.sendButton}
                >
                  发送好友请求
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto' as const,
  },
  searchSection: {
    marginBottom: '20px',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  resultsSection: {
    minHeight: '200px',
  },
  emptyResults: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#666',
    fontSize: '14px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    flexShrink: 0,
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
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  userEmail: {
    margin: 0,
    fontSize: '12px',
    color: '#666',
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  requestSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  selectedUser: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  messageSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  messageLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  messageInput: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
    minHeight: '80px',
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'right' as const,
  },
  requestActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};