import { io, Socket } from 'socket.io-client';
import { SocketEvents, Message } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;
      
      this.socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001', {
        auth: { token },
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket连接成功');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket连接失败:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket断开连接:', reason);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  joinRoom(roomId: string): void {
    this.emit('joinRoom', roomId);
  }

  leaveRoom(roomId: string): void {
    this.emit('leaveRoom', roomId);
  }

  sendPrivateMessage(recipientId: string, content: string, messageType = 'text'): void {
    this.emit('sendPrivateMessage', {
      recipientId,
      content,
      messageType,
    });
  }

  sendGroupMessage(groupId: string, content: string, messageType = 'text'): void {
    this.emit('sendGroupMessage', {
      groupId,
      content,
      messageType,
    });
  }

  markMessageRead(messageId: string): void {
    this.emit('markMessageRead', { messageId });
  }

  sendTyping(recipientId?: string, groupId?: string, isTyping = true): void {
    this.emit('typing', {
      recipientId,
      groupId,
      isTyping,
    });
  }

  onNewPrivateMessage(callback: (message: Message) => void): void {
    this.on('newPrivateMessage', callback);
  }

  onNewGroupMessage(callback: (message: Message) => void): void {
    this.on('newGroupMessage', callback);
  }

  onMessageDelivered(callback: (data: { messageId: string; message: Message }) => void): void {
    this.on('messageDelivered', callback);
  }

  onMessageRead(callback: (data: { messageId: string; userId: string; username: string }) => void): void {
    this.on('messageRead', callback);
  }

  onUserTyping(callback: (data: { userId: string; username: string; isTyping: boolean; groupId?: string }) => void): void {
    this.on('userTyping', callback);
  }

  onUserOnline(callback: (data: { userId: string; username: string; status: string }) => void): void {
    this.on('userOnline', callback);
  }

  onUserOffline(callback: (data: { userId: string; username: string; status: string; lastSeen: string }) => void): void {
    this.on('userOffline', callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.on('error', callback);
  }

  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();
export default socketService;