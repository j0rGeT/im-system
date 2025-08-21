import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { friendsApi, groupsApi } from '../../utils/api';
import { Friend, Group } from '../../types';
import FriendsList from './FriendsList';
import GroupsList from './GroupsList';
import UserProfile from './UserProfile';

type TabType = 'friends' | 'groups';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { setCurrentChat } = useChat();

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendsApi.getFriends();
      if (response.data?.friends) {
        setFriends(response.data.friends);
      }
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await groupsApi.getGroups();
      if (response.data?.groups) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('加载群组列表失败:', error);
    }
  };

  const handleFriendClick = (friend: Friend) => {
    setCurrentChat({
      type: 'private',
      id: friend.user._id,
      name: friend.user.username,
      avatar: friend.user.avatar,
    });
  };

  const handleGroupClick = (group: Group) => {
    setCurrentChat({
      type: 'group',
      id: group._id,
      name: group.name,
      avatar: group.avatar,
    });
  };

  return (
    <div style={styles.container}>
      <UserProfile user={user} onLogout={logout} />
      
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            ...styles.tab,
            ...(activeTab === 'friends' ? styles.activeTab : {}),
          }}
        >
          好友 ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          style={{
            ...styles.tab,
            ...(activeTab === 'groups' ? styles.activeTab : {}),
          }}
        >
          群组 ({groups.length})
        </button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'friends' ? (
              <FriendsList
                friends={friends}
                onFriendClick={handleFriendClick}
                onRefresh={loadFriends}
              />
            ) : (
              <GroupsList
                groups={groups}
                onGroupClick={handleGroupClick}
                onRefresh={loadGroups}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '300px',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#007bff',
    backgroundColor: 'white',
    borderBottom: '2px solid #007bff',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '15px',
  },
  loadingSpinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
};