// 安全配置和加密实现
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const validator = require('validator');

// =============================================================================
// 端到端加密 (E2E Encryption)
// =============================================================================

class E2EEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
  }

  // 生成密钥对
  generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  // 生成共享密钥
  generateSharedKey() {
    return crypto.randomBytes(32);
  }

  // 使用RSA加密共享密钥
  encryptSharedKey(sharedKey, publicKey) {
    return crypto.publicEncrypt(publicKey, sharedKey);
  }

  // 使用RSA解密共享密钥
  decryptSharedKey(encryptedKey, privateKey) {
    return crypto.privateDecrypt(privateKey, encryptedKey);
  }

  // 使用AES-GCM加密消息
  encryptMessage(message, sharedKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, sharedKey, { iv });
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // 使用AES-GCM解密消息
  decryptMessage(encryptedData, sharedKey) {
    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipher(
      this.algorithm, 
      sharedKey, 
      { iv: Buffer.from(iv, 'hex') }
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 为两个用户生成会话密钥
  async generateSessionKey(user1Id, user2Id, user1PrivateKey, user2PublicKey) {
    const sharedSecret = crypto.randomBytes(32);
    const sessionKey = crypto.createHash('sha256')
      .update(sharedSecret)
      .update(user1Id + user2Id)
      .digest();

    const encryptedForUser2 = this.encryptSharedKey(sharedSecret, user2PublicKey);

    return {
      sessionKey,
      encryptedSharedSecret: encryptedForUser2.toString('base64')
    };
  }
}

// =============================================================================
// 输入验证和XSS防护
// =============================================================================

class InputValidator {
  static sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    
    // 移除XSS攻击代码
    let sanitized = xss(input);
    
    // 移除SQL注入尝试
    sanitized = sanitized.replace(/['"\\;]/g, '');
    
    // 限制长度
    return sanitized.substring(0, 1000);
  }

  static validateEmail(email) {
    return validator.isEmail(email);
  }

  static validateUsername(username) {
    return /^[a-zA-Z0-9_]{3,30}$/.test(username);
  }

  static validatePassword(password) {
    // 至少8位，包含大小写字母、数字和特殊字符
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  }

  static validateMessage(message) {
    if (!message || typeof message !== 'string') return false;
    return message.length > 0 && message.length <= 5000;
  }

  static sanitizeMessageContent(content) {
    // 允许部分HTML标签用于富文本
    const options = {
      whiteList: {
        b: [],
        i: [],
        u: [],
        strong: [],
        em: [],
        br: [],
        p: []
      }
    };
    
    return xss(content, options);
  }
}

// =============================================================================
// 身份认证和授权
// =============================================================================

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiration = '7d';
    this.refreshTokenExpiration = '30d';
  }

  // 生成访问令牌
  generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiration }
    );
  }

  // 生成刷新令牌
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiration }
    );
  }

  // 验证访问令牌
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'access') throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // 验证刷新令牌
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'refresh') throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // 生成双因素认证密钥
  generate2FASecret(username) {
    const secret = crypto.randomBytes(32).toString('base32');
    const qrCodeUrl = `otpauth://totp/IM System:${username}?secret=${secret}&issuer=IM System`;
    
    return { secret, qrCodeUrl };
  }

  // 验证TOTP代码
  verifyTOTP(secret, token) {
    const speakeasy = require('speakeasy');
    
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
  }
}

// =============================================================================
// 安全中间件
// =============================================================================

// Helmet安全头配置
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// 速率限制配置
const rateLimitConfig = {
  // API通用限制
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 1000, // 每个IP最多1000次请求
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // 登录限制
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 每个IP最多5次登录尝试
    message: 'Too many login attempts',
    skipSuccessfulRequests: true
  }),

  // 消息发送限制
  message: rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 100, // 每分钟最多100条消息
    message: 'Too many messages sent'
  }),

  // 文件上传限制
  upload: rateLimit({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 10, // 每5分钟最多10个文件
    message: 'Too many files uploaded'
  })
};

// IP白名单检查
const ipWhitelist = (req, res, next) => {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
  
  if (allowedIPs.length > 0) {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  next();
};

// 请求大小限制
const requestSizeLimit = (req, res, next) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (req.headers['content-length'] > maxSize) {
    return res.status(413).json({ error: 'Request entity too large' });
  }
  
  next();
};

// =============================================================================
// 安全审计和日志
// =============================================================================

class SecurityAudit {
  static async logSecurityEvent(eventType, details, req) {
    const logEntry = {
      timestamp: new Date(),
      eventType,
      details,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      userId: req?.user?.userId,
      sessionId: req?.sessionID
    };

    // 记录到数据库
    try {
      await AuditLog.create({
        user: req?.user?.userId,
        action: eventType,
        resource: 'security',
        details: logEntry,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        success: details.success !== false
      });

      // 高危事件立即通知
      if (['failed_login_attempt', 'suspicious_activity', 'unauthorized_access'].includes(eventType)) {
        await this.sendSecurityAlert(logEntry);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static async sendSecurityAlert(logEntry) {
    // 发送邮件或短信通知管理员
    const nodemailer = require('nodemailer');
    
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.SECURITY_ALERT_EMAIL,
        subject: `Security Alert: ${logEntry.eventType}`,
        html: `
          <h2>Security Event Detected</h2>
          <p><strong>Event Type:</strong> ${logEntry.eventType}</p>
          <p><strong>Time:</strong> ${logEntry.timestamp}</p>
          <p><strong>IP Address:</strong> ${logEntry.ip}</p>
          <p><strong>User Agent:</strong> ${logEntry.userAgent}</p>
          <p><strong>Details:</strong> ${JSON.stringify(logEntry.details, null, 2)}</p>
        `
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  // 检测可疑活动
  static async detectSuspiciousActivity(userId, activity) {
    const suspiciousPatterns = [
      // 短时间内大量登录失败
      {
        name: 'multiple_failed_logins',
        check: async () => {
          const count = await AuditLog.countDocuments({
            user: userId,
            action: 'failed_login',
            createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
          });
          return count > 5;
        }
      },
      
      // 异常IP地址登录
      {
        name: 'unusual_ip_login',
        check: async () => {
          const recentLogins = await AuditLog.find({
            user: userId,
            action: 'login',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }).limit(10);
          
          const ips = recentLogins.map(log => log.ipAddress);
          const uniqueIPs = [...new Set(ips)];
          
          return uniqueIPs.length > 5;
        }
      },
      
      // 短时间内发送大量消息
      {
        name: 'message_spam',
        check: async () => {
          const count = await Message.countDocuments({
            sender: userId,
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
          });
          return count > 200;
        }
      }
    ];

    for (const pattern of suspiciousPatterns) {
      try {
        if (await pattern.check()) {
          await this.logSecurityEvent('suspicious_activity', {
            pattern: pattern.name,
            userId,
            activity
          });
          
          // 可以触发自动防护措施
          await this.triggerProtectiveMeasures(userId, pattern.name);
        }
      } catch (error) {
        console.error(`Error checking pattern ${pattern.name}:`, error);
      }
    }
  }

  // 触发防护措施
  static async triggerProtectiveMeasures(userId, patternName) {
    switch (patternName) {
      case 'multiple_failed_logins':
        // 临时锁定账户
        await User.findByIdAndUpdate(userId, {
          'security.lockedUntil': new Date(Date.now() + 30 * 60 * 1000) // 锁定30分钟
        });
        break;
        
      case 'message_spam':
        // 限制发送消息
        await User.findByIdAndUpdate(userId, {
          'security.messageLimitedUntil': new Date(Date.now() + 60 * 60 * 1000) // 限制1小时
        });
        break;
        
      case 'unusual_ip_login':
        // 要求重新验证身份
        await User.findByIdAndUpdate(userId, {
          'security.requireReauth': true
        });
        break;
    }
  }
}

// =============================================================================
// 数据加密存储
// =============================================================================

class DataEncryption {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.algorithm = 'aes-256-cbc';
  }

  // 加密敏感数据
  encryptSensitiveData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  // 解密敏感数据
  decryptSensitiveData(encryptedData) {
    const { encrypted, iv } = encryptedData;
    const decipher = crypto.createDecipher(
      this.algorithm,
      this.encryptionKey,
      { iv: Buffer.from(iv, 'hex') }
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // 哈希敏感字段
  hashSensitiveField(data) {
    return crypto.createHash('sha256')
      .update(data + this.encryptionKey.toString('hex'))
      .digest('hex');
  }
}

// =============================================================================
// 导出模块
// =============================================================================

module.exports = {
  E2EEncryption,
  InputValidator,
  AuthService,
  SecurityAudit,
  DataEncryption,
  securityHeaders,
  rateLimitConfig,
  ipWhitelist,
  requestSizeLimit
};
