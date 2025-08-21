# IM 即时通讯系统

一个功能完整的即时通讯系统，支持用户注册登录、好友管理、私聊、群聊等功能。

## 功能特性

### 用户认证
- ✅ 用户注册和登录
- ✅ JWT Token 认证
- ✅ 点对点登录（一个账号只能在一个设备登录）
- ✅ 用户状态管理（在线/离线/离开）

### 好友管理
- ✅ 搜索用户
- ✅ 发送好友请求
- ✅ 接受/拒绝好友请求
- ✅ 删除好友
- ✅ 好友列表显示

### 群聊功能
- ✅ 创建群组
- ✅ 邀请好友加入群组
- ✅ 群组成员管理
- ✅ 群组信息修改
- ✅ 删除群组

### 消息功能
- ✅ 实时消息传输（WebSocket）
- ✅ 私聊消息
- ✅ 群聊消息
- ✅ 消息已读状态
- ✅ 输入状态提示
- ✅ 消息编辑和删除
- ✅ 消息历史记录

### 用户界面
- ✅ 响应式设计
- ✅ 现代化UI界面
- ✅ 实时状态更新
- ✅ 消息气泡样式
- ✅ 用户头像显示

## 技术栈

### 后端
- **Node.js** - 服务器运行环境
- **Express** - Web 框架
- **Socket.io** - 实时通信
- **MongoDB** - 数据库
- **Mongoose** - MongoDB ODM
- **JWT** - 用户认证
- **bcryptjs** - 密码加密

### 前端
- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Socket.io-client** - 实时通信客户端
- **Axios** - HTTP 请求库
- **React Context** - 状态管理

## 项目结构

```
im-system/
├── server/                 # 后端代码
│   ├── models/            # 数据模型
│   │   ├── User.js        # 用户模型
│   │   ├── Message.js     # 消息模型
│   │   └── Group.js       # 群组模型
│   ├── routes/            # API 路由
│   │   ├── auth.js        # 认证相关
│   │   ├── friends.js     # 好友管理
│   │   ├── groups.js      # 群组管理
│   │   └── messages.js    # 消息管理
│   ├── middleware/        # 中间件
│   │   └── auth.js        # 认证中间件
│   ├── socket/            # Socket 处理
│   │   └── socketHandler.js
│   └── server.js          # 服务器入口
├── client/                # 前端代码
│   ├── public/            # 静态文件
│   └── src/
│       ├── components/    # React 组件
│       │   ├── Auth/      # 认证组件
│       │   ├── Chat/      # 聊天组件
│       │   └── Sidebar/   # 侧边栏组件
│       ├── contexts/      # React Context
│       ├── types/         # TypeScript 类型
│       ├── utils/         # 工具函数
│       └── App.tsx        # 应用入口
├── package.json           # 项目配置
└── README.md             # 项目说明
```

## 安装和运行

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd im-system
```

### 2. 安装依赖
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 3. 配置环境变量
复制 `.env` 文件并配置：
```bash
PORT=3001
MONGODB_URI=mongodb://localhost:27017/im-system
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:3000
```

### 4. 启动 MongoDB
确保 MongoDB 服务正在运行：
```bash
mongod
```

### 5. 启动应用

#### 开发模式（推荐）
```bash
# 同时启动前后端
npm run dev
```

#### 分别启动
```bash
# 启动后端服务器
npm run server

# 在另一个终端启动前端
npm run client
```

### 6. 访问应用
- 前端：http://localhost:3000
- 后端API：http://localhost:3001
- API健康检查：http://localhost:3001/api/health

## API 文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 退出登录
- `GET /api/auth/me` - 获取当前用户信息

### 好友管理
- `GET /api/friends` - 获取好友列表
- `GET /api/friends/search` - 搜索用户
- `POST /api/friends/request` - 发送好友请求
- `POST /api/friends/accept` - 接受好友请求
- `POST /api/friends/reject` - 拒绝好友请求
- `DELETE /api/friends/:friendId` - 删除好友

### 群组管理
- `GET /api/groups` - 获取群组列表
- `POST /api/groups` - 创建群组
- `GET /api/groups/:groupId` - 获取群组详情
- `PUT /api/groups/:groupId` - 更新群组信息
- `DELETE /api/groups/:groupId` - 删除群组
- `POST /api/groups/:groupId/members` - 添加群组成员
- `DELETE /api/groups/:groupId/members/:userId` - 移除群组成员

### 消息管理
- `GET /api/messages/private/:userId` - 获取私聊消息
- `GET /api/messages/group/:groupId` - 获取群聊消息
- `POST /api/messages/private` - 发送私聊消息
- `POST /api/messages/group` - 发送群聊消息
- `PUT /api/messages/:messageId/read` - 标记消息已读
- `PUT /api/messages/:messageId` - 编辑消息
- `DELETE /api/messages/:messageId` - 删除消息

## WebSocket 事件

### 客户端发送
- `sendPrivateMessage` - 发送私聊消息
- `sendGroupMessage` - 发送群聊消息
- `joinRoom` - 加入房间
- `leaveRoom` - 离开房间
- `markMessageRead` - 标记消息已读
- `typing` - 输入状态

### 服务器发送
- `connected` - 连接成功
- `newPrivateMessage` - 新私聊消息
- `newGroupMessage` - 新群聊消息
- `messageDelivered` - 消息已送达
- `messageRead` - 消息已读
- `userOnline` - 用户上线
- `userOffline` - 用户下线
- `userTyping` - 用户输入状态
- `error` - 错误信息

## 数据库设计

### 用户表 (User)
```javascript
{
  username: String,      // 用户名
  email: String,         // 邮箱
  password: String,      // 加密密码
  avatar: String,        // 头像URL
  status: String,        // 在线状态
  friends: [Object],     // 好友列表
  friendRequests: [Object], // 好友请求
  lastSeen: Date         // 最后在线时间
}
```

### 消息表 (Message)
```javascript
{
  sender: ObjectId,      // 发送者
  recipient: ObjectId,   // 接收者（私聊）
  group: ObjectId,       // 群组（群聊）
  content: String,       // 消息内容
  messageType: String,   // 消息类型
  readBy: [Object],      // 已读用户
  edited: Boolean,       // 是否已编辑
  editedAt: Date        // 编辑时间
}
```

### 群组表 (Group)
```javascript
{
  name: String,          // 群组名称
  description: String,   // 群组描述
  avatar: String,        // 群组头像
  owner: ObjectId,       // 群主
  admins: [ObjectId],    // 管理员
  members: [Object],     // 成员列表
  settings: Object,      // 群组设置
  lastMessage: ObjectId, // 最后一条消息
  lastActivity: Date     // 最后活跃时间
}
```

## 部署

### Docker 部署（推荐）
```bash
# 构建镜像
docker build -t im-system .

# 运行容器
docker run -p 3001:3001 -d im-system
```

### 传统部署
1. 构建前端：
```bash
cd client
npm run build
```

2. 设置环境变量并启动：
```bash
NODE_ENV=production npm start
```

## 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：your-email@example.com
- GitHub Issues：[创建 Issue](../../issues)

## 更新日志

### v1.0.0 (2024-xx-xx)
- ✅ 初始版本发布
- ✅ 完整的IM系统功能
- ✅ 用户认证和好友管理
- ✅ 私聊和群聊功能
- ✅ 实时消息传输
- ✅ 现代化用户界面