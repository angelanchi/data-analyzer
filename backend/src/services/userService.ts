import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { User } from 'shared/types';

export class UserService {
  // 獲取所有用戶
  static async getAllUsers(): Promise<User[]> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    const userRecords = await query.findMany<UserRecord>('users', undefined, 'created_at ASC');

    return userRecords.map(record => ({
      id: record.id,
      username: record.username,
      email: record.email,
      displayName: record.display_name,
      avatar: record.avatar,
      role: record.role as 'admin' | 'user' | 'viewer',
      isOnline: record.is_online,
      lastActive: record.last_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }));
  }

  // 根據ID獲取用戶
  static async getUserById(userId: string): Promise<User | null> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    const userRecord = await query.findOne<UserRecord>('users', { id: userId });
    if (!userRecord) {
      return null;
    }

    return {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      avatar: userRecord.avatar,
      role: userRecord.role as 'admin' | 'user' | 'viewer',
      isOnline: userRecord.is_online,
      lastActive: userRecord.last_active,
      createdAt: userRecord.created_at,
      updatedAt: userRecord.updated_at
    };
  }

  // 創建新用戶（簡化版）
  static async createUser(userData: {
    username: string;
    email: string;
    displayName: string;
    avatar?: string;
    role?: 'admin' | 'user' | 'viewer';
  }): Promise<User> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    // 檢查用戶名是否已存在
    const existingUser = await query.findOne<UserRecord>('users', { username: userData.username });
    if (existingUser) {
      throw new Error('用戶名已存在');
    }

    // 檢查郵箱是否已存在
    const existingEmail = await query.findOne<UserRecord>('users', { email: userData.email });
    if (existingEmail) {
      throw new Error('郵箱已被使用');
    }

    const userId = uuidv4();
    const now = new Date().toISOString();

    const userRecord = {
      id: userId,
      username: userData.username,
      email: userData.email,
      password_hash: 'dev-mode-no-password', // 開發模式不需要密碼
      display_name: userData.displayName,
      avatar: userData.avatar || null,
      role: userData.role || 'user',
      is_online: false,
      last_active: now,
      created_at: now,
      updated_at: now
    };

    await query.insert('users', userRecord);

    return {
      id: userId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName,
      avatar: userData.avatar || undefined,
      role: userData.role || 'user',
      isOnline: false,
      lastActive: now,
      createdAt: now,
      updatedAt: now
    };
  }

  // 更新用戶信息
  static async updateUser(userId: string, updates: {
    displayName?: string;
    avatar?: string;
    email?: string;
    role?: 'admin' | 'user' | 'viewer';
  }): Promise<User | null> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    // 如果更新郵箱，檢查是否已被使用
    if (updates.email) {
      const existingEmail = await query.findOne<UserRecord>('users', { email: updates.email });
      if (existingEmail && existingEmail.id !== userId) {
        throw new Error('郵箱已被其他用戶使用');
      }
    }

    const updateData: any = {};
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;

    await query.update('users', updateData, { id: userId });

    return this.getUserById(userId);
  }

  // 設置用戶在線狀態
  static async setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const now = new Date().toISOString();
    await query.update('users',
      {
        is_online: isOnline,
        last_active: now
      },
      { id: userId }
    );
  }

  // 更新用戶最後活躍時間
  static async updateLastActive(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await query.update('users',
      { last_active: now },
      { id: userId }
    );
  }

  // 刪除用戶
  static async deleteUser(userId: string): Promise<void> {
    await query.delete('users', { id: userId });
  }

  // 初始化預設測試用戶
  static async initializeTestUsers(): Promise<void> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    const testUsers = [
      {
        username: 'admin',
        email: 'admin@test.com',
        displayName: '管理員',
        avatar: '👨‍💼',
        role: 'admin' as const
      },
      {
        username: 'alice',
        email: 'alice@test.com',
        displayName: 'Alice Wang',
        avatar: '👩‍🔬',
        role: 'user' as const
      },
      {
        username: 'bob',
        email: 'bob@test.com',
        displayName: 'Bob Chen',
        avatar: '👨‍🔬',
        role: 'user' as const
      },
      {
        username: 'charlie',
        email: 'charlie@test.com',
        displayName: 'Charlie Liu',
        avatar: '👨‍💻',
        role: 'viewer' as const
      }
    ];

    for (const userData of testUsers) {
      try {
        // 檢查用戶是否已存在
        const existingUser = await query.findOne<UserRecord>('users', { username: userData.username });
        if (!existingUser) {
          await this.createUser(userData);
          console.log(`創建測試用戶: ${userData.displayName} (${userData.username})`);
        }
      } catch (error) {
        console.log(`測試用戶 ${userData.username} 已存在，跳過創建`);
      }
    }
  }

  // 獲取或創建預設用戶
  static async getDefaultUser(): Promise<User> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    // 嘗試獲取admin用戶
    let adminUser = await query.findOne<UserRecord>('users', { username: 'admin' });

    if (!adminUser) {
      // 如果沒有admin用戶，初始化測試用戶
      await this.initializeTestUsers();
      adminUser = await query.findOne<UserRecord>('users', { username: 'admin' });
    }

    if (!adminUser) {
      throw new Error('無法創建或獲取預設用戶');
    }

    return {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      displayName: adminUser.display_name,
      avatar: adminUser.avatar,
      role: adminUser.role as 'admin' | 'user' | 'viewer',
      isOnline: adminUser.is_online,
      lastActive: adminUser.last_active,
      createdAt: adminUser.created_at,
      updatedAt: adminUser.updated_at
    };
  }

  // 根據用戶名搜索
  static async searchUsersByName(searchTerm: string): Promise<User[]> {
    // 簡單的模糊搜索實現
    const allUsers = await this.getAllUsers();
    const searchLower = searchTerm.toLowerCase();

    return allUsers.filter(user =>
      user.username.toLowerCase().includes(searchLower) ||
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }

  // 獲取在線用戶
  static async getOnlineUsers(): Promise<User[]> {
    interface UserRecord {
      id: string;
      username: string;
      email: string;
      display_name: string;
      avatar?: string;
      role: string;
      is_online: boolean;
      last_active: string;
      created_at: string;
      updated_at: string;
    }

    const userRecords = await query.findMany<UserRecord>('users', { is_online: true }, 'last_active DESC');

    return userRecords.map(record => ({
      id: record.id,
      username: record.username,
      email: record.email,
      displayName: record.display_name,
      avatar: record.avatar,
      role: record.role as 'admin' | 'user' | 'viewer',
      isOnline: record.is_online,
      lastActive: record.last_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }));
  }
}