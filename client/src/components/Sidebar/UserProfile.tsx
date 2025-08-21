import React, { useState } from 'react';
import { User } from '../../types';

interface UserProfileProps {
  user: User | null;
  onLogout: () => void;
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!user) {
    return null;
  }

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

  return (
    <div style={styles.container}>
      <div 
        style={styles.profile}
        onClick={() => setShowMenu(!showMenu)}
      >
        <div style={styles.avatar}>
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
          <div
            style={{
              ...styles.statusIndicator,
              backgroundColor: getStatusColor(user.status),
            }}
          />
        </div>
        
        <div style={styles.userInfo}>
          <h3 style={styles.username}>{user.username}</h3>
          <p style={styles.status}>{getStatusText(user.status)}</p>
        </div>

        <div style={styles.menuIcon}>
          ⚙️
        </div>
      </div>

      {showMenu && (
        <div style={styles.menu}>
          <div style={styles.menuItem}>
            <span>个人资料</span>
          </div>
          <div style={styles.menuItem}>
            <span>设置</span>
          </div>
          <div style={styles.menuDivider} />
          <div 
            style={styles.menuItem}
            onClick={() => {
              setShowMenu(false);
              onLogout();
            }}
          >
            <span style={styles.logoutText}>退出登录</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative' as const,
    backgroundColor: '#007bff',
    color: 'white',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  avatar: {
    position: 'relative' as const,
    width: '50px',
    height: '50px',
    borderRadius: '25px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: '20px',
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute' as const,
    bottom: '2px',
    right: '2px',
    width: '12px',
    height: '12px',
    borderRadius: '6px',
    border: '2px solid white',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    margin: '0 0 2px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  status: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  menuIcon: {
    fontSize: '16px',
    opacity: 0.8,
    marginLeft: '8px',
  },
  menu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderTop: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  menuItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #f0f0f0',
    color: '#333',
    fontSize: '14px',
  },
  menuDivider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '4px 0',
  },
  logoutText: {
    color: '#dc3545',
  },
};