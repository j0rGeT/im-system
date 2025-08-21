const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');

const connectedUsers = new Map();

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('认证失败'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('用户不存在'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('认证失败'));
  }
};

const handleConnection = async (io, socket) => {
  console.log(`用户 ${socket.user.username} 已连接`);
  
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    lastSeen: new Date()
  });

  await User.findByIdAndUpdate(socket.userId, {
    status: 'online',
    lastSeen: new Date()
  });

  socket.emit('connected', {
    message: '连接成功',
    user: socket.user
  });

  socket.broadcast.emit('userOnline', {
    userId: socket.userId,
    username: socket.user.username,
    status: 'online'
  });

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`用户 ${socket.user.username} 加入房间 ${roomId}`);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`用户 ${socket.user.username} 离开房间 ${roomId}`);
  });

  socket.on('sendPrivateMessage', async (data) => {
    try {
      const { recipientId, content, messageType = 'text' } = data;

      if (!recipientId || !content) {
        socket.emit('error', { message: '接收者和消息内容都是必需的' });
        return;
      }

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        socket.emit('error', { message: '接收者不存在' });
        return;
      }

      const message = new Message({
        sender: socket.userId,
        recipient: recipientId,
        content: content.trim(),
        messageType
      });

      await message.save();
      await message.populate([
        { path: 'sender', select: 'username avatar' },
        { path: 'recipient', select: 'username avatar' }
      ]);

      socket.emit('messageDelivered', {
        messageId: message._id,
        message
      });

      const recipientConnection = connectedUsers.get(recipientId);
      if (recipientConnection) {
        io.to(recipientConnection.socketId).emit('newPrivateMessage', message);
      }

      console.log(`私聊消息从 ${socket.user.username} 发送到 ${recipient.username}`);
    } catch (error) {
      console.error('发送私聊消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });

  socket.on('sendGroupMessage', async (data) => {
    try {
      const { groupId, content, messageType = 'text' } = data;

      if (!groupId || !content) {
        socket.emit('error', { message: '群组ID和消息内容都是必需的' });
        return;
      }

      const group = await Group.findById(groupId);
      if (!group) {
        socket.emit('error', { message: '群组不存在' });
        return;
      }

      const isMember = group.members.some(
        member => member.user.toString() === socket.userId
      );

      if (!isMember) {
        socket.emit('error', { message: '您不是该群组的成员' });
        return;
      }

      const message = new Message({
        sender: socket.userId,
        group: groupId,
        content: content.trim(),
        messageType,
        readBy: [{ user: socket.userId }]
      });

      await message.save();
      await message.populate([
        { path: 'sender', select: 'username avatar' },
        { path: 'readBy.user', select: 'username' }
      ]);

      group.lastMessage = message._id;
      group.lastActivity = new Date();
      await group.save();

      socket.emit('messageDelivered', {
        messageId: message._id,
        message
      });

      io.to(`group_${groupId}`).emit('newGroupMessage', message);

      console.log(`群聊消息从 ${socket.user.username} 发送到群组 ${group.name}`);
    } catch (error) {
      console.error('发送群聊消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });

  socket.on('markMessageRead', async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: '消息不存在' });
        return;
      }

      const hasReadPermission = message.recipient?.toString() === socket.userId ||
                               (message.group && message.sender.toString() !== socket.userId);

      if (!hasReadPermission) {
        socket.emit('error', { message: '没有权限标记此消息为已读' });
        return;
      }

      const alreadyRead = message.readBy.some(
        read => read.user.toString() === socket.userId
      );

      if (!alreadyRead) {
        message.readBy.push({ user: socket.userId });
        await message.save();

        if (message.group) {
          io.to(`group_${message.group}`).emit('messageRead', {
            messageId: message._id,
            userId: socket.userId,
            username: socket.user.username
          });
        } else if (message.sender.toString() !== socket.userId) {
          const senderConnection = connectedUsers.get(message.sender.toString());
          if (senderConnection) {
            io.to(senderConnection.socketId).emit('messageRead', {
              messageId: message._id,
              userId: socket.userId,
              username: socket.user.username
            });
          }
        }
      }
    } catch (error) {
      console.error('标记消息已读错误:', error);
      socket.emit('error', { message: '标记消息已读失败' });
    }
  });

  socket.on('typing', (data) => {
    const { recipientId, groupId, isTyping } = data;

    if (recipientId) {
      const recipientConnection = connectedUsers.get(recipientId);
      if (recipientConnection) {
        io.to(recipientConnection.socketId).emit('userTyping', {
          userId: socket.userId,
          username: socket.user.username,
          isTyping
        });
      }
    } else if (groupId) {
      socket.to(`group_${groupId}`).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        isTyping,
        groupId
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log(`用户 ${socket.user.username} 已断开连接`);
    
    connectedUsers.delete(socket.userId);

    await User.findByIdAndUpdate(socket.userId, {
      status: 'offline',
      lastSeen: new Date()
    });

    socket.broadcast.emit('userOffline', {
      userId: socket.userId,
      username: socket.user.username,
      status: 'offline',
      lastSeen: new Date()
    });
  });
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.values()).map(connection => ({
    userId: connection.user._id,
    username: connection.user.username,
    status: 'online',
    lastSeen: connection.lastSeen
  }));
};

module.exports = {
  authenticateSocket,
  handleConnection,
  getConnectedUsers
};