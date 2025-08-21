import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ChatState, Message, User } from '../types';
import { messagesApi } from '../utils/api';
import socketService from '../utils/socket';
import { useAuth } from './AuthContext';

interface ChatContextType extends ChatState {
  setCurrentChat: (chat: { type: 'private' | 'group'; id: string; name: string; avatar?: string } | null) => void;
  loadMessages: (chatType: 'private' | 'group', chatId: string) => Promise<void>;
  sendMessage: (content: string, messageType?: string) => void;
  markMessageAsRead: (messageId: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setTyping: (userId: string, isTyping: boolean, groupId?: string) => void;
  setUserOnline: (userId: string, status: string) => void;
}

type ChatAction =
  | { type: 'SET_CURRENT_CHAT'; payload: ChatState['currentChat'] }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { messageId: string; updates: Partial<Message> } }
  | { type: 'SET_TYPING'; payload: { userId: string; isTyping: boolean; groupId?: string } }
  | { type: 'SET_USER_ONLINE'; payload: { userId: string; status: string } }
  | { type: 'ADD_ONLINE_USER'; payload: User }
  | { type: 'REMOVE_ONLINE_USER'; payload: string };

const initialState: ChatState = {
  currentChat: null,
  messages: [],
  typing: {},
  onlineUsers: [],
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload, messages: [] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg._id === action.payload.messageId
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };
    case 'SET_TYPING':
      const typingKey = action.payload.groupId 
        ? `${action.payload.groupId}_${action.payload.userId}`
        : action.payload.userId;
      return {
        ...state,
        typing: {
          ...state.typing,
          [typingKey]: action.payload.isTyping,
        },
      };
    case 'SET_USER_ONLINE':
      return {
        ...state,
        onlineUsers: state.onlineUsers.map(user =>
          user._id === action.payload.userId
            ? { ...user, status: action.payload.status as any }
            : user
        ),
      };
    case 'ADD_ONLINE_USER':
      return {
        ...state,
        onlineUsers: state.onlineUsers.some(user => user._id === action.payload._id)
          ? state.onlineUsers.map(user =>
              user._id === action.payload._id ? action.payload : user
            )
          : [...state.onlineUsers, action.payload],
      };
    case 'REMOVE_ONLINE_USER':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(user => user._id !== action.payload),
      };
    default:
      return state;
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleNewPrivateMessage = (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    };

    const handleNewGroupMessage = (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    };

    const handleMessageDelivered = (data: { messageId: string; message: Message }) => {
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
    };

    const handleMessageRead = (data: { messageId: string; userId: string; username: string }) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: data.messageId,
          updates: {
            readBy: [...(state.messages.find(m => m._id === data.messageId)?.readBy || []), {
              _id: '',
              user: { _id: data.userId, username: data.username } as User,
              readAt: new Date().toISOString(),
            }],
          },
        },
      });
    };

    const handleUserTyping = (data: { userId: string; username: string; isTyping: boolean; groupId?: string }) => {
      dispatch({
        type: 'SET_TYPING',
        payload: {
          userId: data.userId,
          isTyping: data.isTyping,
          groupId: data.groupId,
        },
      });
    };

    const handleUserOnline = (data: { userId: string; username: string; status: string }) => {
      dispatch({
        type: 'ADD_ONLINE_USER',
        payload: {
          _id: data.userId,
          username: data.username,
          status: data.status as any,
        } as User,
      });
    };

    const handleUserOffline = (data: { userId: string; username: string; status: string; lastSeen: string }) => {
      dispatch({
        type: 'SET_USER_ONLINE',
        payload: {
          userId: data.userId,
          status: data.status,
        },
      });
    };

    const handleError = (data: { message: string }) => {
      console.error('Socket错误:', data.message);
    };

    socketService.onNewPrivateMessage(handleNewPrivateMessage);
    socketService.onNewGroupMessage(handleNewGroupMessage);
    socketService.onMessageDelivered(handleMessageDelivered);
    socketService.onMessageRead(handleMessageRead);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);
    socketService.onError(handleError);

    return () => {
      socketService.removeAllListeners();
    };
  }, [isAuthenticated, user, state.messages]);

  const setCurrentChat = (chat: ChatState['currentChat']) => {
    if (state.currentChat) {
      if (state.currentChat.type === 'group') {
        socketService.leaveRoom(`group_${state.currentChat.id}`);
      }
    }

    if (chat && chat.type === 'group') {
      socketService.joinRoom(`group_${chat.id}`);
    }

    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
  };

  const loadMessages = async (chatType: 'private' | 'group', chatId: string) => {
    try {
      let response;
      if (chatType === 'private') {
        response = await messagesApi.getPrivateMessages(chatId);
      } else {
        response = await messagesApi.getGroupMessages(chatId);
      }

      if (response.data?.messages) {
        dispatch({ type: 'SET_MESSAGES', payload: response.data.messages });
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  const sendMessage = (content: string, messageType = 'text') => {
    if (!state.currentChat || !content.trim()) return;

    if (state.currentChat.type === 'private') {
      socketService.sendPrivateMessage(state.currentChat.id, content.trim(), messageType);
    } else {
      socketService.sendGroupMessage(state.currentChat.id, content.trim(), messageType);
    }
  };

  const markMessageAsRead = (messageId: string) => {
    socketService.markMessageRead(messageId);
  };

  const addMessage = (message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { messageId, updates } });
  };

  const setTyping = (userId: string, isTyping: boolean, groupId?: string) => {
    if (!state.currentChat) return;

    if (state.currentChat.type === 'private') {
      socketService.sendTyping(state.currentChat.id, undefined, isTyping);
    } else {
      socketService.sendTyping(undefined, state.currentChat.id, isTyping);
    }
  };

  const setUserOnline = (userId: string, status: string) => {
    dispatch({ type: 'SET_USER_ONLINE', payload: { userId, status } });
  };

  const value: ChatContextType = {
    ...state,
    setCurrentChat,
    loadMessages,
    sendMessage,
    markMessageAsRead,
    addMessage,
    updateMessage,
    setTyping,
    setUserOnline,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat必须在ChatProvider中使用');
  }
  return context;
}