import React, { createContext, useState, useContext } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    // Eğer message bir nesne olarak gelirse
    if (typeof message === 'object' && message.message) {
      setNotification({ 
        message: message.message, 
        type: message.type || 'success' 
      });
    } else {
      // String olarak gelirse
      setNotification({ message, type });
    }
    
    // 3 saniye sonra bildirimi kapat
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <div 
          className={`
            fixed top-4 left-4 z-50 px-4 py-2 rounded-lg 
            ${notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : notification.type === 'error'
              ? 'bg-red-500 text-white'
              : notification.type === 'warning'
              ? 'bg-red-500 text-black'
              : 'bg-gray-500 text-white'}
            transition-all duration-300 ease-in-out
          `}
        >
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
