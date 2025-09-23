import { User, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const userApi = {
  // 獲取所有用戶
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`);
    const result: ApiResponse<User[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '獲取用戶列表失敗');
    }

    return result.data || [];
  },

  // 獲取當前用戶
  async getCurrentUser(userId?: string): Promise<User> {
    const url = userId
      ? `${API_BASE_URL}/users/current?userId=${userId}`
      : `${API_BASE_URL}/users/current`;

    const response = await fetch(url);
    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '獲取當前用戶失敗');
    }

    return result.data!;
  },

  // 設置當前用戶
  async setCurrentUser(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '設置當前用戶失敗');
    }

    return result.data!;
  },

  // 根據ID獲取用戶
  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '獲取用戶失敗');
    }

    return result.data!;
  },

  // 創建新用戶
  async createUser(userData: {
    username: string;
    email: string;
    displayName: string;
    avatar?: string;
    role?: 'admin' | 'user' | 'viewer';
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '創建用戶失敗');
    }

    return result.data!;
  },

  // 更新用戶信息
  async updateUser(userId: string, updates: {
    displayName?: string;
    avatar?: string;
    email?: string;
    role?: 'admin' | 'user' | 'viewer';
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result: ApiResponse<User> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '更新用戶失敗');
    }

    return result.data!;
  },

  // 搜索用戶
  async searchUsers(query: string): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`);
    const result: ApiResponse<User[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '搜索用戶失敗');
    }

    return result.data || [];
  },

  // 獲取在線用戶
  async getOnlineUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users/online`);
    const result: ApiResponse<User[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '獲取在線用戶失敗');
    }

    return result.data || [];
  },

  // 初始化測試用戶
  async initializeTestUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users/init-test-users`, {
      method: 'POST',
    });

    const result: ApiResponse<User[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || '初始化測試用戶失敗');
    }

    return result.data || [];
  },
};