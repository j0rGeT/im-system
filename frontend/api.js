// API路由和第三方集成接口
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const router = express.Router();

// API密钥验证中间件
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const signature = req.headers['x-signature'];
    
    if (!apiKey || !signature) {
      return res.status(401).json({ error: 'API key and signature required' });
    }

    // 查找API密钥
    const keyRecord = await ApiKey.findOne({ key: apiKey, isActive: true });
    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // 验证签名
    const timestamp = req.headers['x-timestamp'] || Date.now().toString();
    const payload = req.method + req.originalUrl + JSON.stringify(req.body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', keyRecord.secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 检查时间戳（防重放攻击）
    const requestTime = parseInt(timestamp);
    const currentTime = Date.now();
    if (Math.abs(currentTime - requestTime) > 300000) { // 5分钟
      return res.status(401).json({ error: 'Request timestamp expired' });
    }

    // 更新使用统计
    keyRecord.lastUsed = new Date();
    keyRecord.usageCount += 1;
    await keyRecord.save();

    req.apiKey = keyRecord;
    req.apiUser = await User.findById(keyRecord.owner);
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// API速率限制
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: (req) => req.apiKey?.rateLimit?.requestsPerMinute || 100,
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false
});

// 权限检查中间件
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({ error: `Permission '${permission}' required` });
    }
    next();
  };
};

// 输入验证中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// =============================================================================
// 第三方API接口
// =============================================================================

// 获取用户信息
router.get('/users/:userId', 
  authenticateApiKey,
  apiRateLimit,
  requirePermission('read_messages'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId)
        .select('-password -deviceTokens')
        .populate('friends', 'username avatar status');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
);

// 发送消息API
router.post('/messages',
  authenticateApiKey,
  apiRateLimit,
  requirePermission('send_messages'),
  [
    body('recipientId').isMongoId().withMessage('Valid recipient ID required'),
    body('content').isLength({ min: 1, max: 1000 }).withMessage('Message content required'),
    body('type').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { recipientId, content, type = 'text', fileInfo } = req.body;

      // 验证接收者存在
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // 创建消息
      const message = new Message({
        sender: req.apiUser._id,
        recipient: recipientId,
        content,
        type,
        fileInfo
      });

      await message.save();

      // 通过Socket.IO发送实时通知
      const recipientSocket = userSessions.get(recipientId);
      if (recipientSocket) {
        io.to(recipientSocket).emit('new_message', {
          ...message.toObject(),
          senderUsername: req.apiUser.username
        });
      }

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// 获取消息历史API
router.get('/conversations/:conversationId/messages',
  authenticateApiKey,
  apiRateLimit,
  requirePermission('read_messages'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      const conversation = await Conversation.findById(req.params.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // 验证用户是否有权限访问此会话
      if (!conversation.participants.includes(req.apiUser._id)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await Message.find({
        $or: [
          { sender: { $in: conversation.participants }, recipient: { $in: conversation.participants } },
          { group: conversation.group }
        ]
      })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      res.json({
        success: true,
        data: {
          messages: messages.reverse(),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: messages.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
);

// 创建群组API
router.post('/groups',
  authenticateApiKey,
  apiRateLimit,
  requirePermission('manage_groups'),
  [
    body('name').isLength({ min: 1, max: 50 }).withMessage('Group name required'),
    body('description').optional().isLength({ max: 200 }),
    body('members').isArray().withMessage('Members array required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, members } = req.body;

      // 验证所有成员存在
      const memberUsers = await User.find({ _id: { $in: members } });
      if (memberUsers.length !== members.length) {
        return res.status(400).json({ error: 'Some members not found' });
      }

      const group = new Group({
        name,
        description,
        creator: req.apiUser._id,
        members: [
          { user: req.apiUser._id, role: 'admin' },
          ...members.map(memberId => ({ user: memberId, role: 'member' }))
        ]
      });

      await group.save();

      res.status(201).json({
        success: true,
        data: group
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create group' });
    }
  }
);

// 获取系统统计信息API
router.get('/stats',
  authenticateApiKey,
  apiRateLimit,
  requirePermission('read_messages'),
  async (req, res) => {
    try {
      const stats = await dbUtils.getSystemStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }
);

// Webhook配置API
router.post('/webhooks',
  authenticateApiKey,
  apiRateLimit,
  [
    body('url').isURL().withMessage('Valid webhook URL required'),
    body('events').isArray().withMessage('Events array required'),
    body('secret').optional().isLength({ min: 16 }).withMessage('Secret must be at least 16 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { url, events, secret } = req.body;

      const webhook = {
        id: crypto.randomUUID(),
        url,
        events,
        secret: secret || crypto.randomBytes(32).toString('hex'),
        isActive: true,
        createdAt: new Date()
      };

      // 保存到API密钥的webhooks数组中
      req.apiKey.webhooks = req.apiKey.webhooks || [];
      req.apiKey.webhooks.push(webhook);
      await req.apiKey.save();

      res.status(201).json({
        success: true,
        data: webhook
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }
);

// =============================================================================
// Webhook触发函数
// =============================================================================

const triggerWebhook = async (event, data) => {
  try {
    // 获取所有订阅此事件的API密钥
    const apiKeys = await ApiKey.find({
      'webhooks.events': event,
      'webhooks.isActive': true
    });

    for (const apiKey of apiKeys) {
      const webhooks = apiKey.webhooks.filter(w => 
        w.events.includes(event) && w.isActive
      );

      for (const webhook of webhooks) {
        try {
          const payload = {
            event,
            data,
            timestamp: Date.now(),
            webhook_id: webhook.id
          };

          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');

          await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event
            },
            body: JSON.stringify(payload)
          });

        } catch (webhookError) {
          console.error(`Webhook delivery failed for ${webhook.url}:`, webhookError);
        }
      }
    }
  } catch (error) {
    console.error('Webhook trigger failed:', error);
  }
};

// =============================================================================
// SDK和客户端库示例
// =============================================================================

const generateSDKExample = () => {
  return {
    javascript: `
// IM系统 JavaScript SDK
class IMClient {
  constructor(apiKey, secret, baseURL = 'https://api.your-im-system.com') {
    this.apiKey = apiKey;
    this.secret = secret;
    this.baseURL = baseURL;
  }

  async request(method, endpoint, data = null) {
    const url = this.baseURL + endpoint;
    const timestamp = Date.now().toString();
    const payload = method + endpoint + JSON.stringify(data || {}) + timestamp;
    const signature = require('crypto')
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Signature': signature,
        'X-Timestamp': timestamp
      },
      body: data ? JSON.stringify(data) : null
    });

    return await response.json();
  }

  // 发送消息
  async sendMessage(recipientId, content, type = 'text') {
    return await this.request('POST', '/messages', {
      recipientId,
      content,
      type
    });
  }

  // 获取用户信息
  async getUser(userId) {
    return await this.request('GET', \`/users/\${userId}\`);
  }

  // 创建群组
  async createGroup(name, description, members) {
    return await this.request('POST', '/groups', {
      name,
      description,
      members
    });
  }
}

// 使用示例
const client = new IMClient('your-api-key', 'your-secret');
await client.sendMessage('user-id', 'Hello World!');
`,
    python: `
# IM系统 Python SDK
import requests
import hmac
import hashlib
import json
import time

class IMClient:
    def __init__(self, api_key, secret, base_url='https://api.your-im-system.com'):
        self.api_key = api_key
        self.secret = secret
        self.base_url = base_url
    
    def request(self, method, endpoint, data=None):
        url = self.base_url + endpoint
        timestamp = str(int(time.time() * 1000))
        payload = method + endpoint + json.dumps(data or {}) + timestamp
        signature = hmac.new(
            self.secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
            'X-Signature': signature,
            'X-Timestamp': timestamp
        }
        
        response = requests.request(
            method, url, 
            headers=headers, 
            json=data if data else None
        )
        
        return response.json()
    
    def send_message(self, recipient_id, content, message_type='text'):
        return self.request('POST', '/messages', {
            'recipientId': recipient_id,
            'content': content,
            'type': message_type
        })
    
    def get_user(self, user_id):
        return self.request('GET', f'/users/{user_id}')

# 使用示例
client = IMClient('your-api-key', 'your-secret')
result = client.send_message('user-id', 'Hello World!')
`
  };
};

// =============================================================================
// API文档生成
// =============================================================================

const generateAPIDocumentation = () => {
  return {
    openapi: "3.0.0",
    info: {
      title: "IM System API",
      version: "1.0.0",
      description: "即时通讯系统API接口文档"
    },
    servers: [
      {
        url: "https://api.your-im-system.com",
        description: "生产环境"
      },
      {
        url: "https://api-dev.your-im-system.com",
        description: "测试环境"
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            username: { type: "string" },
            email: { type: "string" },
            avatar: { type: "string" },
            status: { type: "string", enum: ["online", "offline", "busy", "away"] }
          }
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "string" },
            sender: { type: "string" },
            recipient: { type: "string" },
            content: { type: "string" },
            type: { type: "string", enum: ["text", "image", "file"] },
            timestamp: { type: "string", format: "date-time" }
          }
        }
      }
    },
    paths: {
      "/messages": {
        post: {
          summary: "发送消息",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    recipientId: { type: "string" },
                    content: { type: "string" },
                    type: { type: "string", enum: ["text", "image", "file"] }
                  },
                  required: ["recipientId", "content"]
                }
              }
            }
          },
          responses: {
            "201": {
              description: "消息发送成功",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { $ref: "#/components/schemas/Message" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
};

module.exports = {
  router,
  triggerWebhook,
  generateSDKExample,
  generateAPIDocumentation,
  authenticateApiKey,
  requirePermission
};
