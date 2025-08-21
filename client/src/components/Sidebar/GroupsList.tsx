import React, { useState } from 'react';
import { Group } from '../../types';
import CreateGroupModal from './CreateGroupModal';
import { groupsApi } from '../../utils/api';

interface GroupsListProps {
  groups: Group[];
  onGroupClick: (group: Group) => void;
  onRefresh: () => void;
}

export default function GroupsList({ groups, onGroupClick, onRefresh }: GroupsListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const formatLastActivity = (lastActivity: string) => {
    const date = new Date(lastActivity);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚活跃';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleCreateGroup = async (data: { name: string; description?: string; memberIds?: string[] }) => {
    try {
      await groupsApi.createGroup(data);
      setShowCreateModal(false);
      onRefresh();
      alert('群组创建成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '创建群组失败');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>群组列表</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={styles.addButton}
          title="创建群组"
        >
          +
        </button>
      </div>

      {groups.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyText}>还没有群组</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={styles.emptyButton}
          >
            创建第一个群组
          </button>
        </div>
      ) : (
        <div style={styles.groupsList}>
          {groups.map((group) => (
            <div
              key={group._id}
              onClick={() => onGroupClick(group)}
              style={styles.groupItem}
            >
              <div style={styles.groupAvatar}>
                {group.avatar ? (
                  <img 
                    src={group.avatar} 
                    alt={group.name}
                    style={styles.avatarImage}
                  />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div style={styles.groupInfo}>
                <div style={styles.groupHeader}>
                  <h4 style={styles.groupName}>{group.name}</h4>
                  <span style={styles.memberCount}>
                    {group.members.length}人
                  </span>
                </div>
                
                <p style={styles.groupActivity}>
                  {formatLastActivity(group.lastActivity)}
                </p>
                
                {group.lastMessage && (
                  <p style={styles.lastMessage}>
                    {group.lastMessage.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
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
    backgroundColor: '#28a745',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  groupsList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  groupItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: 'white',
    borderBottom: '1px solid #f0f0f0',
  },
  groupAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: '#28a745',
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
  groupInfo: {
    flex: 1,
    minWidth: 0,
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  groupName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  memberCount: {
    fontSize: '12px',
    color: '#666',
    marginLeft: '8px',
    flexShrink: 0,
  },
  groupActivity: {
    margin: '2px 0',
    fontSize: '12px',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  lastMessage: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#888',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontStyle: 'italic',
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
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};