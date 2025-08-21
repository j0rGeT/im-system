import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User, LoginData, RegisterData } from '../types';
import { authApi } from '../utils/api';
import socketService from '../utils/socket';

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          dispatch({ type: 'SET_USER', payload: { user, token } });
          
          const response = await authApi.getMe();
          if (response.user) {
            dispatch({ type: 'UPDATE_USER', payload: response.user });
            localStorage.setItem('user', JSON.stringify(response.user));
            
            await socketService.connect(token);
          }
        } catch (error) {
          console.error('认证初始化失败:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authApi.login(data);
      
      if (response.user && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });
        
        await socketService.connect(response.token);
      } else {
        throw new Error('登录响应无效');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw new Error(error.response?.data?.error || '登录失败');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authApi.register(data);
      
      if (response.user && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        dispatch({ type: 'SET_USER', payload: { user: response.user, token: response.token } });
        
        await socketService.connect(response.token);
      } else {
        throw new Error('注册响应无效');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw new Error(error.response?.data?.error || '注册失败');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('退出登录API调用失败:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socketService.disconnect();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider中使用');
  }
  return context;
}