import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { userApi } from '../services/userApi';

interface UserContextType {
  currentUser: User | null;
  allUsers: User[];
  users: Record<string, User>;
  isLoading: boolean;
  error: string | null;
  switchUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 從localStorage獲取上次選擇的用戶ID
  const getStoredUserId = (): string | null => {
    return localStorage.getItem('currentUserId');
  };

  // 保存用戶ID到localStorage
  const storeUserId = (userId: string) => {
    localStorage.setItem('currentUserId', userId);
  };

  // 創建模擬用戶數據作為後備
  const createMockUsers = (): User[] => {
    return [
      {
        id: 'mock-user-1',
        username: 'demo-user',
        displayName: 'Demo User',
        email: 'demo@example.com',
        role: 'user' as UserRole,
        avatar: '',
        isOnline: true,
        lastActive: new Date().toISOString(),
      },
    ];
  };

  // 初始化用戶數據
  const initializeUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 檢查 API 連接
      const isConnected = await import('../services/api').then(m => m.checkApiConnection());

      if (!isConnected) {
        throw new Error('API_CONNECTION_FAILED');
      }

      // 嘗試獲取所有用戶
      const users = await userApi.getAllUsers();
      setAllUsers(users);

      // 獲取當前用戶
      const storedUserId = getStoredUserId();
      let current: User;

      if (storedUserId) {
        try {
          current = await userApi.getCurrentUser(storedUserId);
        } catch {
          // 如果存儲的用戶ID無效，使用默認用戶
          current = await userApi.getCurrentUser();
        }
      } else {
        current = await userApi.getCurrentUser();
      }

      setCurrentUser(current);
      storeUserId(current.id);

    } catch (err) {
      // API 連接失敗時使用模擬數據
      console.warn('API 服務不可用，使用離線模式:', err);

      const mockUsers = createMockUsers();
      setAllUsers(mockUsers);

      const storedUserId = getStoredUserId();
      const current = mockUsers.find(user => user.id === storedUserId) || mockUsers[0];
      setCurrentUser(current);
      storeUserId(current.id);

      // 設置友好的錯誤消息
      const isNetworkError = err instanceof Error &&
        (err.message.includes('API_CONNECTION_FAILED') ||
         (err as any).isNetworkError);

      setError(isNetworkError
        ? '正在離線模式運行 - 某些功能可能受限'
        : '用戶服務暫時不可用，正在使用離線模式'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 切換用戶
  const switchUser = async (userId: string) => {
    try {
      setError(null);
      const user = await userApi.setCurrentUser(userId);
      setCurrentUser(user);
      storeUserId(userId);

      // 更新所有用戶列表中的狀態
      setAllUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, isOnline: true, lastActive: new Date().toISOString() }
          : u
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '切換用戶失敗';
      setError(errorMessage);
      console.error('切換用戶失敗:', err);
      throw err;
    }
  };

  // 刷新用戶列表
  const refreshUsers = async () => {
    try {
      setError(null);
      const users = await userApi.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新用戶列表失敗';
      setError(errorMessage);
      console.error('刷新用戶列表失敗:', err);
    }
  };

  // 更新當前用戶信息
  const updateCurrentUser = async (updates: Partial<User>) => {
    if (!currentUser) {
      throw new Error('沒有當前用戶');
    }

    try {
      setError(null);
      const updatedUser = await userApi.updateUser(currentUser.id, updates);
      setCurrentUser(updatedUser);

      // 同步更新所有用戶列表
      setAllUsers(prev => prev.map(u =>
        u.id === currentUser.id ? updatedUser : u
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新用戶信息失敗';
      setError(errorMessage);
      console.error('更新用戶信息失敗:', err);
      throw err;
    }
  };

  // 組件掛載時初始化
  useEffect(() => {
    initializeUsers();
  }, [initializeUsers]);

  // 定期刷新在線用戶狀態（可選）
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        // 更新當前用戶的活躍時間
        userApi.setCurrentUser(currentUser.id).catch(console.error);
      }
    }, 5 * 60 * 1000); // 每5分鐘更新一次

    return () => clearInterval(interval);
  }, [currentUser]);

  // 將allUsers轉換為Record格式
  const usersRecord = React.useMemo(() => {
    return allUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, User>);
  }, [allUsers]);

  const value: UserContextType = {
    currentUser,
    allUsers,
    users: usersRecord,
    isLoading,
    error,
    switchUser,
    refreshUsers,
    updateCurrentUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};