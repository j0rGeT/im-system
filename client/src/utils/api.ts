import axios from 'axios';
import { LoginData, RegisterData, ApiResponse, User, Friend, Group, Message } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: RegisterData): Promise<ApiResponse<User>> =>
    api.post('/auth/register', data).then(res => res.data),
  
  login: (data: LoginData): Promise<ApiResponse<User>> =>
    api.post('/auth/login', data).then(res => res.data),
  
  logout: (): Promise<ApiResponse> =>
    api.post('/auth/logout').then(res => res.data),
  
  getMe: (): Promise<ApiResponse<User>> =>
    api.get('/auth/me').then(res => res.data),
};

export const friendsApi = {
  searchUsers: (query: string): Promise<ApiResponse<{ users: User[] }>> =>
    api.get(`/friends/search?query=${encodeURIComponent(query)}`).then(res => res.data),
  
  sendFriendRequest: (userId: string, message?: string): Promise<ApiResponse> =>
    api.post('/friends/request', { userId, message }).then(res => res.data),
  
  acceptFriendRequest: (requestId: string): Promise<ApiResponse> =>
    api.post('/friends/accept', { requestId }).then(res => res.data),
  
  rejectFriendRequest: (requestId: string): Promise<ApiResponse> =>
    api.post('/friends/reject', { requestId }).then(res => res.data),
  
  removeFriend: (friendId: string): Promise<ApiResponse> =>
    api.delete(`/friends/${friendId}`).then(res => res.data),
  
  getFriends: (): Promise<ApiResponse<{ friends: Friend[] }>> =>
    api.get('/friends').then(res => res.data),
};

export const groupsApi = {
  createGroup: (data: { name: string; description?: string; memberIds?: string[] }): Promise<ApiResponse<Group>> =>
    api.post('/groups', data).then(res => res.data),
  
  getGroups: (): Promise<ApiResponse<{ groups: Group[] }>> =>
    api.get('/groups').then(res => res.data),
  
  getGroup: (groupId: string): Promise<ApiResponse<{ group: Group }>> =>
    api.get(`/groups/${groupId}`).then(res => res.data),
  
  updateGroup: (groupId: string, data: { name?: string; description?: string; settings?: any }): Promise<ApiResponse<Group>> =>
    api.put(`/groups/${groupId}`, data).then(res => res.data),
  
  addMembers: (groupId: string, userIds: string[]): Promise<ApiResponse<Group>> =>
    api.post(`/groups/${groupId}/members`, { userIds }).then(res => res.data),
  
  removeMember: (groupId: string, userId: string): Promise<ApiResponse> =>
    api.delete(`/groups/${groupId}/members/${userId}`).then(res => res.data),
  
  deleteGroup: (groupId: string): Promise<ApiResponse> =>
    api.delete(`/groups/${groupId}`).then(res => res.data),
};

export const messagesApi = {
  getPrivateMessages: (userId: string, page = 1, limit = 50): Promise<ApiResponse<{ messages: Message[] }>> =>
    api.get(`/messages/private/${userId}?page=${page}&limit=${limit}`).then(res => res.data),
  
  getGroupMessages: (groupId: string, page = 1, limit = 50): Promise<ApiResponse<{ messages: Message[] }>> =>
    api.get(`/messages/group/${groupId}?page=${page}&limit=${limit}`).then(res => res.data),
  
  sendPrivateMessage: (data: { recipientId: string; content: string; messageType?: string }): Promise<ApiResponse<Message>> =>
    api.post('/messages/private', data).then(res => res.data),
  
  sendGroupMessage: (data: { groupId: string; content: string; messageType?: string }): Promise<ApiResponse<Message>> =>
    api.post('/messages/group', data).then(res => res.data),
  
  markMessageRead: (messageId: string): Promise<ApiResponse> =>
    api.put(`/messages/${messageId}/read`).then(res => res.data),
  
  editMessage: (messageId: string, content: string): Promise<ApiResponse<Message>> =>
    api.put(`/messages/${messageId}`, { content }).then(res => res.data),
  
  deleteMessage: (messageId: string): Promise<ApiResponse> =>
    api.delete(`/messages/${messageId}`).then(res => res.data),
};

export default api;