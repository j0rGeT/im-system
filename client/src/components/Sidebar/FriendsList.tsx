import React, { useState } from 'react';
import { Friend, User } from '../../types';
import { friendsApi } from '../../utils/api';
import AddFriendModal from './AddFriendModal';

interface FriendsListProps {
  friends: Friend[];
  onFriendClick: (friend: Friend) => void;
  onRefresh: () => void;
}

export default function FriendsList({ friends, onFriendClick, onRefresh }: FriendsListProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#28a745';
      case 'away': return '#ffc107';
      case 'offline': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'away': return '离开';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚在线';
    if (minutes < 60) return `${minutes}分钟前在线`;
    if (hours < 24) return `${hours}小时前在线`;
    if (days < 7) return `${days}天前在线`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleAddFriend = async (userId: string, message?: string) => {
    try {
      await friendsApi.sendFriendRequest(userId, message);
      setShowAddModal(false);
      alert('好友请求发送成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '发送好友请求失败');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>好友列表</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          style={styles.addButton}
          title="添加好友"
        >
          +
        </button>
      </div>

      {friends.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyText}>还没有好友</p>
          <button
            onClick={() => setShowAddModal(true)}
            style={styles.emptyButton}
          >
            添加第一个好友
          </button>
        </div>
      ) : (
        <div style={styles.friendsList}>
          {friends.map((friend) => (
            <div
              key={friend._id}
              onClick={() => onFriendClick(friend)}
              style={styles.friendItem}
            >
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
                <div
                  style={{
                    ...styles.statusIndicator,
                    backgroundColor: getStatusColor(friend.user.status),
                  }}
                />
              </div>
              
              <div style={styles.friendInfo}>
                <h4 style={styles.friendName}>{friend.user.username}</h4>
                <p style={styles.friendStatus}>
                  {friend.user.status === 'online' 
                    ? getStatusText(friend.user.status)
                    : formatLastSeen(friend.user.lastSeen)
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddFriendModal
          onClose={() => setShowAddModal(false)}
          onAddFriend={handleAddFriend}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: 'white',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: '30px',
    height: '30px',
    borderRadius: '15px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  friendsList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  friendItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: 'white',
    borderBottom: '1px solid #f0f0f0',
  },
  friendAvatar: {
    position: 'relative' as const,
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
  statusIndicator: {
    position: 'absolute' as const,
    bottom: '2px',
    right: '2px',
    width: '10px',
    height: '10px',
    borderRadius: '5px',
    border: '2px solid white',
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  friendStatus: {
    margin: 0,
    fontSize: '12px',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center' as const,
    flex: 1,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    opacity: 0.5,
  },
  emptyText: {
    margin: '0 0 20px 0',
    color: '#666',
    fontSize: '14px',
  },
  emptyButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};