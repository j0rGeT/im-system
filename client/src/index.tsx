import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* 鼠标悬停效果 */
  .friend-item:hover,
  .group-item:hover,
  .message-item:hover {
    background-color: #f8f9fa !important;
  }

  .send-button:hover {
    transform: scale(1.05);
  }

  .user-profile:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  /* 选择文本样式 */
  ::selection {
    background-color: #007bff;
    color: white;
  }

  /* 输入框聚焦样式 */
  input:focus,
  textarea:focus {
    outline: none;
    border-color: #007bff !important;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) !important;
  }

  /* 按钮点击效果 */
  button:active {
    transform: translateY(1px);
  }

  /* 禁用按钮样式 */
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed !important;
  }

  /* 消息气泡动画 */
  .message-bubble {
    animation: fadeInUp 0.3s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 模态框动画 */
  .modal {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .sidebar {
      width: 280px !important;
    }
    
    .chat-window {
      flex: 1;
    }
    
    .message-content {
      max-width: 85% !important;
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 100%;
      position: absolute;
      z-index: 1000;
    }
    
    .message-content {
      max-width: 95% !important;
    }
    
    .input-container {
      padding: 10px !important;
    }
  }
`;
document.head.appendChild(style);