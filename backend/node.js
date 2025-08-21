const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('uploads'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// 数据存储 (生产环境应使用MongoDB/PostgreSQL)
const users = new Map();
const friendships = new Map();
const groups = new Map();
const messages = new Map();
const offlineMessages = new Map();
const userSessions = new Map();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 加密工具
function encryptMessage(message, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptMessage(encryptedMessage, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 用户认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API路由

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    
    // 检查用户是否已存在
    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      avatar: avatar || '',
      status: 'offline',
      createdAt: new Date(),
      settings: {
        notifications: true,
        privacy: 'friends',
        soundEnabled: true,
        theme: 'light'
      }
    };
    
    users.set(username, user);
    friendships.set(userId, []);
    offlineMessages.set(userId, []);
    
    const token = jwt.sign({ userId, username }, JWT_SECRET);
    
    res.json({ 
      message: 'User registered successfully', 
      token,
      user: { ...user, password: undefined }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.get(username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET);
    
    // 更新用户状态为在线
    user.status = 'online';
    user.lastSeen = new Date();
    
    res.json({ 
      message: 'Login successful', 
      token,
      user: { ...user, password: undefined }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 获取用户信息
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ ...user, password: undefined });
});

// 更新用户设置
app.put('/api/settings', authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  user.settings = { ...user.settings, ...req.body };
  res.json({ message: 'Settings updated', settings: user.settings });
});

// 搜索用户
app.get('/api/users/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  const results = Array.from(users.values())
    .filter(user => user.username.toLowerCase().includes(q.toLowerCase()))
    .map(user => ({ id: user.id, username: user.username, avatar: user.avatar, status: user.status }));
  
  res.json(results);
});

// 添加好友
app.post('/api/friends/add', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  const currentUser = users.get(req.user.username);
  const friend = users.get(friendUsername);
  
  if (!friend) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const currentUserFriends = friendships.get(currentUser.id) || [];
  const friendUserFriends = friendships.get(friend.id) || [];
  
  if (!currentUserFriends.includes(friend.id)) {
    currentUserFriends.push(friend.id);
    friendships.set(currentUser.id, currentUserFriends);
  }
  
  if (!friendUserFriends.includes(currentUser.id)) {
    friendUserFriends.push(currentUser.id);
    friendships.set(friend.id, friendUserFriends);
  }
  
  res.json({ message: 'Friend added successfully' });
});

// 获取好友列表
app.get('/api/friends', authenticateToken, (req, res) => {
  const userFriends = friendships.get(req.user.userId) || [];
  const friendsList = userFriends.map(friendId => {
    const friend = Array.from(users.values()).find(u => u.id === friendId);
    return friend ? { 
      id: friend.id, 
      username: friend.username, 
      avatar: friend.avatar, 
      status: friend.status,
      lastSeen: friend.lastSeen 
    } : null;
  }).filter(Boolean);
  
  res.json(friendsList);
});

// 创建群组
app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, description, members } = req.body;
  const groupId = crypto.randomUUID();
  
  const group = {
    id: groupId,
    name,
    description,
    creator: req.user.userId,
    members: [req.user.userId, ...members],
    createdAt: new Date()
  };
  
  groups.set(groupId, group);
  res.json({ message: 'Group created successfully', group });
});

// 获取用户群组
app.get('/api/groups', authenticateToken, (req, res) => {
  const userGroups = Array.from(groups.values())
    .filter(group => group.members.includes(req.user.userId));
  
  res.json(userGroups);
});

// 文件上传
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileInfo = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/uploads/${req.file.filename}`
  };
  
  res.json(fileInfo);
});

// 获取消息历史
app.get('/api/messages', authenticateToken, (req, res) => {
  const { chatId, page = 1, limit = 50 } = req.query;
  const chatMessages = messages.get(chatId) || [];
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedMessages = chatMessages.slice(startIndex, endIndex);
  
  res.json({
    messages: paginatedMessages,
    hasMore: endIndex < chatMessages.length,
    total: chatMessages.length
  });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // 用户认证
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      
      // 更新用户状态
      const user = users.get(decoded.username);
      if (user) {
        user.status = 'online';
        user.socketId = socket.id;
        userSessions.set(decoded.userId, socket.id);
        
        // 发送离线消息
        const userOfflineMessages = offlineMessages.get(decoded.userId) || [];
        if (userOfflineMessages.length > 0) {
          socket.emit('offline_messages', userOfflineMessages);
          offlineMessages.set(decoded.userId, []);
        }
        
        socket.emit('authenticated', { user: { ...user, password: undefined } });
        socket.broadcast.emit('user_status_changed', { 
          userId: decoded.userId, 
          status: 'online' 
        });
      }
    } catch (error) {
      socket.emit('auth_error', 'Invalid token');
    }
  });
  
  // 更新用户状态
  socket.on('update_status', (status) => {
    if (socket.username) {
      const user = users.get(socket.username);
      if (user) {
        user.status = status;
        socket.broadcast.emit('user_status_changed', { 
          userId: socket.userId, 
          status 
        });
      }
    }
  });
  
  // 发送私聊消息
  socket.on('send_message', (data) => {
    const { recipientId, content, type = 'text', fileInfo, isEncrypted = true } = data;
    
    const messageId = crypto.randomUUID();
    const timestamp = new Date();
    
    let messageContent = content;
    if (isEncrypted && type === 'text') {
      messageContent = encryptMessage(content, JWT_SECRET);
    }
    
    const message = {
      id: messageId,
      senderId: socket.userId,
      senderUsername: socket.username,
      recipientId,
      content: messageContent,
      originalContent: content,
      type,
      fileInfo,
      timestamp,
      isEncrypted,
      isRead: false
    };
    
    // 保存消息
    const chatId = [socket.userId, recipientId].sort().join('-');
    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(message);
    
    // 查找接收者
    const recipientSocketId = userSessions.get(recipientId);
    
    if (recipientSocketId) {
      // 接收者在线，直接发送
      io.to(recipientSocketId).emit('new_message', message);
    } else {
      // 接收者离线，保存到离线消息
      if (!offlineMessages.has(recipientId)) {
        offlineMessages.set(recipientId, []);
      }
      offlineMessages.get(recipientId).push(message);
    }
    
    // 确认消息已发送
    socket.emit('message_sent', { messageId, timestamp });
  });
  
  // 发送群聊消息
  socket.on('send_group_message', (data) => {
    const { groupId, content, type = 'text', fileInfo } = data;
    
    const group = groups.get(groupId);
    if (!group || !group.members.includes(socket.userId)) {
      socket.emit('error', 'Unauthorized to send to this group');
      return;
    }
    
    const messageId = crypto.randomUUID();
    const timestamp = new Date();
    
    const message = {
      id: messageId,
      senderId: socket.userId,
      senderUsername: socket.username,
      groupId,
      content,
      type,
      fileInfo,
      timestamp,
      isRead: false
    };
    
    // 保存群组消息
    if (!messages.has(groupId)) {
      messages.set(groupId, []);
    }
    messages.get(groupId).push(message);
    
    // 发送给群组所有在线成员
    group.members.forEach(memberId => {
      if (memberId !== socket.userId) {
        const memberSocketId = userSessions.get(memberId);
        if (memberSocketId) {
          io.to(memberSocketId).emit('new_group_message', message);
        } else {
          // 离线成员保存消息
          if (!offlineMessages.has(memberId)) {
            offlineMessages.set(memberId, []);
          }
          offlineMessages.get(memberId).push(message);
        }
      }
    });
    
    socket.emit('message_sent', { messageId, timestamp });
  });
  
  // 标记消息为已读
  socket.on('mark_as_read', (messageId) => {
    // 在所有消息中查找并标记为已读
    for (const [chatId, chatMessages] of messages.entries()) {
      const message = chatMessages.find(msg => msg.id === messageId);
      if (message && message.recipientId === socket.userId) {
        message.isRead = true;
        
        // 通知发送者消息已读
        const senderSocketId = userSessions.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_read', { messageId, readBy: socket.userId });
        }
        break;
      }
    }
  });
  
  // 正在输入状态
  socket.on('typing_start', (data) => {
    const { recipientId } = data;
    const recipientSocketId = userSessions.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { 
        userId: socket.userId, 
        username: socket.username 
      });
    }
  });
  
  socket.on('typing_stop', (data) => {
    const { recipientId } = data;
    const recipientSocketId = userSessions.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stop_typing', { 
        userId: socket.userId 
      });
    }
  });
  
  // 用户断开连接
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      // 更新用户状态为离线
      const user = users.get(socket.username);
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date();
        delete user.socketId;
        
        userSessions.delete(socket.userId);
        
        socket.broadcast.emit('user_status_changed', { 
          userId: socket.userId, 
          status: 'offline',
          lastSeen: user.lastSeen
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`IM Server running on port ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
