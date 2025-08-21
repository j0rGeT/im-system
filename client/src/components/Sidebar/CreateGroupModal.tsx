import React, { useState, useEffect } from 'react';
import { friendsApi } from '../../utils/api';
import { Friend } from '../../types';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (data: { name: string; description?: string; memberIds?: string[] }) => void;
}

export default function CreateGroupModal({ onClose, onCreateGroup }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await friendsApi.getFriends();
      if (response.data?.friends) {
        setFriends(response.data.friends);
      }
    } catch (error) {
      console.error('加载好友列表失败:', error);
    }
  };

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('请输入群组名称');
      return;
    }

    if (name.length > 50) {
      alert('群组名称不能超过50个字符');
      return;
    }

    setLoading(true);
    onCreateGroup({
      name: name.trim(),
      description: description.trim() || undefined,
      memberIds: selectedMembers,
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>创建群组</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.content}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>群组名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入群组名称"
              style={styles.input}
              maxLength={50}
              required
            />
            <div style={styles.charCount}>{name.length}/50</div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>群组描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入群组描述（可选）"
              style={styles.textarea}
              maxLength={200}
            />
            <div style={styles.charCount}>{description.length}/200</div>
          </div>

          <div style={styles.membersSection}>
            <label style={styles.label}>
              邀请成员 (已选择 {selectedMembers.length} 人)
            </label>
            
            {friends.length === 0 ? (
              <div style={styles.emptyFriends}>
                <p style={styles.emptyText}>你还没有好友，无法邀请成员</p>
              </div>
            ) : (
              <div style={styles.friendsList}>
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    onClick={() => handleMemberToggle(friend.user._id)}
                    style={{
                      ...styles.friendItem,
                      ...(selectedMembers.includes(friend.user._id) ? styles.selectedFriend : {}),
                    }}
                  >
                    <div style={styles.checkbox}>
                      {selectedMembers.includes(friend.user._id) && (
                        <span style={styles.checkmark}>✓</span>
                      )}
                    </div>
                    
                    <div style={styles.friendAvatar}>
                      {friend.user.avatar ? (
                        <img 
                          src={friend.user.avatar} 
                          alt={friend.user.username}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {friend.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.friendInfo}>
                      <h4 style={styles.friendName}>{friend.user.username}</h4>
                      <p style={styles.friendEmail}>{friend.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                ...styles.createButton,
                ...(loading ? styles.createButtonDisabled : {}),
              }}
              disabled={loading || !name.trim()}
            >
              {loading ? '创建中...' : '创建群组'}
            </button>
          </div>
        </form>
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
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
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
  membersSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  emptyFriends: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  emptyText: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  friendsList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  friendItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  selectedFriend: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    flexShrink: 0,
  },
  checkmark: {
    color: '#007bff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  friendAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
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
    fontSize: '12px',
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    margin: '0 0 2px 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  friendEmail: {
    margin: 0,
    fontSize: '12px',
    color: '#666',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};