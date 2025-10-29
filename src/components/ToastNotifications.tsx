import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAppStore } from '../store/useAppStore';

export const ToastNotifications: React.FC = () => {
  const { isDarkMode } = useAppStore();

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={isDarkMode ? 'dark' : 'light'}
      style={{
        zIndex: 10000,
      }}
    />
  );
};
