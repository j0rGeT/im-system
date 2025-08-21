import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={styles.authContainer}>
      {isLogin ? (
        <Login onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
}

function ChatApp() {
  return (
    <ChatProvider>
      <div style={styles.appContainer}>
        <Sidebar />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>加载中...</p>
      </div>
    );
  }

  return isAuthenticated ? <ChatApp /> : <AuthScreen />;
}

function App() {
  return (
    <AuthProvider>
      <div style={styles.app}>
        <AppContent />
      </div>
    </AuthProvider>
  );
}

const styles = {
  app: {
    height: '100vh',
    overflow: 'hidden',
  },
  authContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '20px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    margin: 0,
    color: '#666',
    fontSize: '16px',
  },
};

export default App;