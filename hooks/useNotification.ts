import { useState, useEffect, useCallback } from 'react';

export interface NotificationState {
  message: string;
  type: 'success' | 'info';
}

export const useNotification = (duration: number = 3000) => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, duration]);

  const showNotification = useCallback((message: string, type: 'success' | 'info') => {
    setNotification({ message, type });
  }, []);

  return { notification, showNotification };
};
