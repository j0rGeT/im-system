const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 用户模型
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'friends'
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'zh-CN'
    }
  },
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 好友关系模型
const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: Date
}, {
  timestamps: true
});

// 复合索引确保唯一性
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 群组模型
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  avatar: {
    type: String,
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 500
    },
    allowInvites: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// 消息模型
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'emoji', 'system'],
    default: 'text'
  },
  fileInfo: {
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
    url: String
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: Date,
  deletedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// 消息索引优化
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// 会话模型
const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 会话索引
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ group: 1, lastMessageAt: -1 });

// 通知模型
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['message', 'friend_request', 'group_invite', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// 通知索引
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// 文件模型
const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 用户会话模型 (用于管理在线状态)
const userSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  platform: {
    type: String,
    enum: ['web', 'mobile', 'desktop']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// API密钥模型 (用于第三方集成)
const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [{
    type: String,
    enum: ['read_messages', 'send_messages', 'manage_users', 'manage_groups']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 100
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  }
}, {
  timestamps: true
});

// 审计日志模型
const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  timestamps: true
});

// 审计日志索引
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// 创建模型
const User = mongoose.model('User', userSchema);
const Friendship = mongoose.model('Friendship', friendshipSchema);
const Group = mongoose.model('Group', groupSchema);
const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const File = mongoose.model('File', fileSchema);
const UserSession = mongoose.model('UserSession', userSessionSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// 数据库连接配置
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/im_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 创建索引
    await Promise.all([
      User.createIndexes(),
      Friendship.createIndexes(),
      Group.createIndexes(),
      Message.createIndexes(),
      Conversation.createIndexes(),
      Notification.createIndexes(),
      File.createIndexes(),
      UserSession.createIndexes(),
      ApiKey.createIndexes(),
      AuditLog.createIndexes()
    ]);

    console.log('Database indexes created');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// 数据库工具函数
const dbUtils = {
  // 清理过期的会话
  cleanupExpiredSessions: async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await UserSession.deleteMany({
      lastActivity: { $lt: oneHourAgo },
      isActive: false
    });
  },

  // 清理旧的审计日志 (保留90天)
  cleanupOldAuditLogs: async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await AuditLog.deleteMany({
      createdAt: { $lt: ninetyDaysAgo }
    });
  },

  // 获取用户统计信息
  getUserStats: async (userId) => {
    const stats = await Promise.all([
      Message.countDocuments({ sender: userId }),
      Friendship.countDocuments({ 
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted'
      }),
      Group.countDocuments({ 'members.user': userId })
    ]);

    return {
      messagesSent: stats[0],
      friendsCount: stats[1],
      groupsCount: stats[2]
    };
  },

  // 获取系统统计信息
  getSystemStats: async () => {
    const stats = await Promise.all([
      User.countDocuments(),
      Message.countDocuments(),
      Group.countDocuments(),
      User.countDocuments({ status: 'online' })
    ]);

    return {
      totalUsers: stats[0],
      totalMessages: stats[1],
      totalGroups: stats[2],
      onlineUsers: stats[3]
    };
  },

  // 备份数据库
  backupDatabase: async () => {
    // 这里可以实现数据库备份逻辑
    console.log('Database backup started...');
    // 实际的备份逻辑需要根据部署环境来实现
  }
};

// 定时任务
const startScheduledTasks = () => {
  // 每小时清理一次过期会话
  setInterval(async () => {
    try {
      await dbUtils.cleanupExpiredSessions();
      console.log('Expired sessions cleaned up');
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }, 60 * 60 * 1000);

  // 每天清理一次旧的审计日志
  setInterval(async () => {
    try {
      await dbUtils.cleanupOldAuditLogs();
      console.log('Old audit logs cleaned up');
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
    }
  }, 24 * 60 * 60 * 1000);
};

module.exports = {
  connectDB,
  startScheduledTasks,
  dbUtils,
  models: {
    User,
    Friendship,
    Group,
    Message,
    Conversation,
    Notification,
    File,
    UserSession,
    ApiKey,
    AuditLog
  }
};
