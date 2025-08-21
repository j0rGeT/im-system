import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, Settings, UserPlus, Users, Smile, Paperclip, Search, MoreVertical } from 'lucide-react';

const IMSystem = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 表情包数据
  const emojis = ['😀', '😃', '😄', '😁', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'];

  useEffect(() => {
    if (token) {
      initializeSocket();
      fetchUserData();
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.emit('authenticate', token);
    
    newSocket.on('authenticated', (data) => {
      setUser(data.user);
      fetchFriends();
      fetchGroups();
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      // 播放消息提示音
      playNotificationSound();
    });

    newSocket.on('new_group_message', (message) => {
      setMessages(prev => [...prev, message]);
      playNotificationSound();
    });

    newSocket.on('offline_messages', (offlineMessages) => {
      setMessages(prev => [...prev, ...offlineMessages]);
    });

    newSocket.on('user_status_changed', (data) => {
      setOnlineUsers(prev => ({
        ...prev,
        [data.userId]: { status: data.status, lastSeen: data.lastSeen }
      }));
    });

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => ({ ...prev, [data.userId]: data.username }));
    });

    newSocket.on('user_stop_typing', (data) => {
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        delete newTyping[data.userId];
        return newTyping;
      });
    });

    newSocket.on('message_read', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? { ...msg, isRead: true } : msg
      ));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvWYfBDWEyOvbeDIEHnys8tjy3J');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const friendsList = await response.json();
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const groupsList = await response.json();
        setGroups(groupsList);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert('登录失败，请检查网络连接');
    }
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert('注册失败，请检查网络连接');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    socket?.close();
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !socket) return;

    const messageData = {
      recipientId: activeChat.type === 'user' ? activeChat.id : undefined,
      groupId: activeChat.type === 'group' ? activeChat.id : undefined,
      content: messageInput,
      type: 'text'
    };

    if (activeChat.type === 'group') {
      socket.emit('send_group_message', messageData);
    } else {
      socket.emit('send_message', messageData);
    }

    // 添加到本地消息列表
    const newMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderUsername: user.username,
      content: messageInput,
      type: 'text',
      timestamp: new Date(),
      isRead: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
  };

  const handleTyping = () => {
    if (!activeChat || !socket) return;

    socket.emit('typing_start', { recipientId: activeChat.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { recipientId: activeChat.id });
    }, 1000);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/search?q=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  const addFriend = async (friendUsername) => {
    try {
      const response = await fetch('http://localhost:3001/api/friends/add', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendUsername })
      });
      
      if (response.ok) {
        fetchFriends();
        alert('好友添加成功！');
      }
    } catch (error) {
      console.error('添加好友失败:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const fileInfo = await response.json();
        
        const messageData = {
          recipientId: activeChat.type === 'user' ? activeChat.id : undefined,
          groupId: activeChat.type === 'group' ? activeChat.id : undefined,
          content: `发送了文件: ${fileInfo.originalName}`,
          type: 'file',
          fileInfo
        };

        if (activeChat.type === 'group') {
          socket.emit('send_group_message', messageData);
        } else {
          socket.emit('send_message', messageData);
        }
      }
    } catch (error) {
      console.error('文件上传失败:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">IM聊天系统</h1>
            <p className="text-gray-600">连接你我，沟通无界</p>
          </div>
          
          {!isRegistering ? (
            <form onSubmit={login} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入密码"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
              >
                登录
              </button>
              <p className="text-center text-sm text-gray-600">
                还没有账户？
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 hover:text-blue-500 ml-1 font-semibold"
                >
                  立即注册
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={register} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入邮箱"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入密码"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-200 font-semibold"
              >
                注册
              </button>
              <p className="text-center text-sm text-gray-600">
                已有账户？
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-purple-600 hover:text-purple-500 ml-1 font-semibold"
                >
                  立即登录
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 左侧边栏 */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* 用户信息头部 */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-semibold text-lg">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold">{user?.username}</h3>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(user?.status)}`}></div>
                  <span className="text-sm opacity-90">{user?.status || 'offline'}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={logout}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            {searchQuery && (
              <button
                onClick={searchUsers}
                className="absolute right-2 top-1.5 px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                搜索
              </button>
            )}
          </div>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="px-4 py-2 border-b bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">搜索结果</h4>
            {searchResults.map(result => (
              <div key={result.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold">{result.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm">{result.username}</span>
                </div>
                <button
                  onClick={() => addFriend(result.username)}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 联系人列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Users className="mr-2" size={16} />
              好友 ({friends.length})
            </h4>
            {friends.map(friend => (
              <div
                key={friend.id}
                onClick={() => {
                  setActiveChat({ ...friend, type: 'user' });
                  setMessages([]);
                }}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  activeChat?.id === friend.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm">{friend.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${getStatusColor(onlineUsers[friend.id]?.status || 'offline')}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 truncate">{friend.username}</h5>
                  <p className="text-sm text-gray-500 truncate">
                    {onlineUsers[friend.id]?.status === 'online' ? '在线' : 
                     onlineUsers[friend.id]?.lastSeen ? `最后上线: ${formatTime(onlineUsers[friend.id].lastSeen)}` : '离线'}
                  </p>
                </div>
                {typingUsers[friend.id] && (
                  <div className="text-xs text-blue-500 animate-pulse">正在输入...</div>
                )}
              </div>
            ))}
          </div>

          {groups.length > 0 && (
            <div className="p-4 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Users className="mr-2" size={16} />
                群组 ({groups.length})
              </h4>
              {groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => {
                    setActiveChat({ ...group, type: 'group' });
                    setMessages([]);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChat?.id === group.id ? 'bg-purple-50 border-l-4 border-purple-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <Users className="text-white" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 truncate">{group.name}</h5>
                    <p className="text-sm text-gray-500 truncate">{group.members.length} 成员</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* 聊天头部 */}
            <div className="bg-white shadow-sm p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  {activeChat.type === 'group' ? (
                    <Users size={20} />
                  ) : (
                    <span className="font-semibold">{activeChat.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {activeChat.type === 'group' ? activeChat.name : activeChat.username}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeChat.type === 'group' 
                      ? `${activeChat.members.length} 成员` 
                      : (onlineUsers[activeChat.id]?.status === 'online' ? '在线' : '离线')
                    }
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => {
                const isOwn = message.senderId === user.id;
                const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                    {!isOwn && showAvatar && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mb-1">
                        <span className="text-xs font-semibold">
                          {message.senderUsername?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-8"></div>}
                    
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}>
                      {!isOwn && activeChat.type === 'group' && showAvatar && (
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {message.senderUsername}
                        </div>
                      )}
                      
                      {message.type === 'file' ? (
                        <div className="flex items-center space-x-2">
                          <Paperclip size={16} />
                          <span className="text-sm">
                            {message.fileInfo?.originalName || '文件'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(message.timestamp)}
                        {isOwn && message.isRead && <span className="ml-1">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="bg-white border-t p-4">
              {showEmojiPicker && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessageInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-2 hover:bg-gray-200 rounded text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-end space-x-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Smile size={20} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Paperclip size={20} className="text-gray-600" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="输入消息..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="1"
                  />
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    messageInput.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">欢迎使用IM聊天系统</h3>
              <p className="text-gray-500">选择一个联系人开始聊天</p>
            </div>
          </div>
        )}
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">用户设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户状态
                </label>
                <select 
                  value={user?.status || 'online'}
                  onChange={(e) => {
                    socket?.emit('update_status', e.target.value);
                    setUser(prev => ({...prev, status: e.target.value}));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="online">在线</option>
                  <option value="busy">忙碌</option>
                  <option value="away">离开</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  消息通知
                </label>
                <input
                  type="checkbox"
                  checked={user?.settings?.notifications !== false}
                  onChange={(e) => {
                    // 更新设置逻辑
                  }}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  声音提醒
                </label>
                <input
                  type="checkbox"
                  checked={user?.settings?.soundEnabled !== false}
                  onChange={(e) => {
                    // 更新设置逻辑
                  }}
                  className="rounded"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
