require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const groupsRoutes = require('./routes/groups');
const messagesRoutes = require('./routes/messages');

const { authenticateSocket, handleConnection } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/im-system';

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'IM系统服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '欢迎使用IM系统API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      friends: '/api/friends',
      groups: '/api/groups',
      messages: '/api/messages',
      health: '/api/health'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

io.use(authenticateSocket);

io.on('connection', (socket) => {
  handleConnection(io, socket);
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB连接成功');
    console.log(`数据库: ${MONGODB_URI}`);
  })
  .catch((error) => {
    console.error('MongoDB连接失败:', error);
    process.exit(1);
  });

server.listen(PORT, () => {
  console.log(`\n🚀 IM系统服务器启动成功!`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🌐 客户端地址: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api/health`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('\n可用的API端点:');
  console.log('  - POST /api/auth/register     注册');
  console.log('  - POST /api/auth/login        登录');
  console.log('  - POST /api/auth/logout       退出登录');
  console.log('  - GET  /api/auth/me           获取当前用户信息');
  console.log('  - GET  /api/friends           获取好友列表');
  console.log('  - POST /api/friends/request   发送好友请求');
  console.log('  - POST /api/friends/accept    接受好友请求');
  console.log('  - POST /api/groups            创建群组');
  console.log('  - GET  /api/groups            获取群组列表');
  console.log('  - POST /api/messages/private  发送私聊消息');
  console.log('  - POST /api/messages/group    发送群聊消息');
  console.log('\nWebSocket 事件:');
  console.log('  - sendPrivateMessage          发送私聊消息');
  console.log('  - sendGroupMessage            发送群聊消息');
  console.log('  - joinRoom                    加入房间');
  console.log('  - markMessageRead             标记消息已读');
  console.log('  - typing                      输入状态');
  console.log('');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

module.exports = { app, server, io };