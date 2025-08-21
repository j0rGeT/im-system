export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  friends?: Friend[];
  friendRequests?: FriendRequest[];
}

export interface Friend {
  _id: string;
  user: User;
  addedAt: string;
}

export interface FriendRequest {
  _id: string;
  from: User;
  message?: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  sender: User;
  recipient?: User;
  group?: Group;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  readBy: ReadStatus[];
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadStatus {
  _id: string;
  user: User;
  readAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  owner: User;
  admins: User[];
  members: GroupMember[];
  settings: GroupSettings;
  lastMessage?: Message;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  _id: string;
  user: User;
  joinedAt: string;
  role: 'member' | 'admin' | 'owner';
}

export interface GroupSettings {
  isPrivate: boolean;
  allowMemberInvite: boolean;
  maxMembers: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface ChatState {
  currentChat: {
    type: 'private' | 'group';
    id: string;
    name: string;
    avatar?: string;
  } | null;
  messages: Message[];
  typing: { [key: string]: boolean };
  onlineUsers: User[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  user?: User;
  token?: string;
  error?: string;
}

export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  connected: (data: { message: string; user: User }) => void;
  error: (data: { message: string }) => void;
  userOnline: (data: { userId: string; username: string; status: string }) => void;
  userOffline: (data: { userId: string; username: string; status: string; lastSeen: string }) => void;
  newPrivateMessage: (message: Message) => void;
  newGroupMessage: (message: Message) => void;
  messageDelivered: (data: { messageId: string; message: Message }) => void;
  messageRead: (data: { messageId: string; userId: string; username: string }) => void;
  userTyping: (data: { userId: string; username: string; isTyping: boolean; groupId?: string }) => void;
}