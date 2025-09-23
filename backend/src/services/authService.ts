import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { User, UserSession } from 'shared/types';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '7d';
  private static readonly SALT_ROUNDS = 12;

  // 用戶註冊
  static async register(userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ user: User; token: string }> {
    // 檢查用戶名和郵箱是否已存在
    const existingUser = await query.findOne('users', { username: userData.username });
    if (existingUser) {
      throw new Error('用戶名已存在');
    }

    const existingEmail = await query.findOne('users', { email: userData.email });
    if (existingEmail) {
      throw new Error('郵箱已被註冊');
    }

    // 密碼哈希
    const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    // 創建用戶
    const userId = uuidv4();
    const now = new Date().toISOString();

    const userRecord = {
      id: userId,
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
      display_name: userData.displayName,
      role: 'user',
      is_online: false,
      last_active: now,
      created_at: now,
      updated_at: now
    };

    await query.insert('users', userRecord);

    // 生成JWT令牌
    const token = this.generateToken(userId);

    // 創建會話記錄
    await this.createSession(userId, token);

    // 返回用戶信息（不包含密碼）
    const user: User = {
      id: userId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName,
      role: 'user',
      isOnline: false,
      lastActive: now,
      createdAt: now,
      updatedAt: now
    };

    return { user, token };
  }

  // 用戶登錄
  static async login(credentials: {
    username: string;
    password: string;
  }, userAgent?: string, ipAddress?: string): Promise<{ user: User; token: string }> {
    // 查找用戶
    const userRecord = await query.findOne('users', { username: credentials.username });
    if (!userRecord) {
      throw new Error('用戶名或密碼錯誤');
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(credentials.password, userRecord.password_hash);
    if (!isPasswordValid) {
      throw new Error('用戶名或密碼錯誤');
    }

    // 生成新的JWT令牌
    const token = this.generateToken(userRecord.id);

    // 創建新的會話記錄
    await this.createSession(userRecord.id, token, userAgent, ipAddress);

    // 更新用戶在線狀態和最後活躍時間
    const now = new Date().toISOString();
    await query.update('users',
      {
        is_online: true,
        last_active: now
      },
      { id: userRecord.id }
    );

    // 轉換為前端使用的用戶對象
    const user: User = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      avatar: userRecord.avatar,
      role: userRecord.role as any,
      isOnline: true,
      lastActive: now,
      createdAt: userRecord.created_at,
      updatedAt: userRecord.updated_at
    };

    return { user, token };
  }

  // 登出
  static async logout(token: string): Promise<void> {
    // 刪除會話記錄
    await query.delete('user_sessions', { token });

    // 解析令牌獲取用戶ID
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };

      // 檢查用戶是否還有其他活躍會話
      const activeSessions = await query.findMany('user_sessions', { user_id: decoded.userId });

      // 如果沒有其他會話，設置為離線
      if (activeSessions.length === 0) {
        await query.update('users',
          { is_online: false },
          { id: decoded.userId }
        );
      }
    } catch (error) {
      console.error('登出時解析令牌失敗:', error);
    }
  }

  // 驗證令牌
  static async verifyToken(token: string): Promise<User | null> {
    try {
      // 驗證JWT令牌
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };

      // 檢查會話是否存在且未過期
      const session = await query.findOne('user_sessions', { token });
      if (!session) {
        return null;
      }

      // 檢查會話是否過期
      if (new Date(session.expires_at) < new Date()) {
        await query.delete('user_sessions', { token });
        return null;
      }

      // 獲取用戶信息
      const userRecord = await query.findOne('users', { id: decoded.userId });
      if (!userRecord) {
        return null;
      }

      // 更新最後活躍時間
      const now = new Date().toISOString();
      await query.update('users',
        { last_active: now },
        { id: userRecord.id }
      );

      // 轉換為前端用戶對象
      const user: User = {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        displayName: userRecord.display_name,
        avatar: userRecord.avatar,
        role: userRecord.role as any,
        isOnline: userRecord.is_online,
        lastActive: now,
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at
      };

      return user;
    } catch (error) {
      console.error('令牌驗證失敗:', error);
      return null;
    }
  }

  // 刷新令牌
  static async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const decoded = jwt.verify(oldToken, this.JWT_SECRET) as { userId: string };

      // 檢查舊會話
      const session = await query.findOne('user_sessions', { token: oldToken });
      if (!session) {
        return null;
      }

      // 生成新令牌
      const newToken = this.generateToken(decoded.userId);

      // 更新會話記錄
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await query.update('user_sessions',
        {
          token: newToken,
          expires_at: expiresAt.toISOString()
        },
        { id: session.id }
      );

      return newToken;
    } catch (error) {
      console.error('令牌刷新失敗:', error);
      return null;
    }
  }

  // 獲取用戶資料
  static async getUserById(userId: string): Promise<User | null> {
    const userRecord = await query.findOne('users', { id: userId });
    if (!userRecord) {
      return null;
    }

    return {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      avatar: userRecord.avatar,
      role: userRecord.role as any,
      isOnline: userRecord.is_online,
      lastActive: userRecord.last_active,
      createdAt: userRecord.created_at,
      updatedAt: userRecord.updated_at
    };
  }

  // 更新用戶資料
  static async updateUser(userId: string, updates: {
    displayName?: string;
    avatar?: string;
    email?: string;
  }): Promise<User | null> {
    // 如果更新郵箱，檢查是否已被使用
    if (updates.email) {
      const existingEmail = await query.findOne('users', { email: updates.email });
      if (existingEmail && existingEmail.id !== userId) {
        throw new Error('郵箱已被其他用戶使用');
      }
    }

    const updateData: any = {};
    if (updates.displayName) updateData.display_name = updates.displayName;
    if (updates.avatar) updateData.avatar = updates.avatar;
    if (updates.email) updateData.email = updates.email;

    await query.update('users', updateData, { id: userId });

    return this.getUserById(userId);
  }

  // 更改密碼
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const userRecord = await query.findOne('users', { id: userId });
    if (!userRecord) {
      throw new Error('用戶不存在');
    }

    // 驗證舊密碼
    const isOldPasswordValid = await bcrypt.compare(oldPassword, userRecord.password_hash);
    if (!isOldPasswordValid) {
      throw new Error('原密碼錯誤');
    }

    // 哈希新密碼
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // 更新密碼
    await query.update('users',
      { password_hash: newPasswordHash },
      { id: userId }
    );

    // 刪除所有現有會話，強制重新登錄
    await query.delete('user_sessions', { user_id: userId });
    await query.update('users', { is_online: false }, { id: userId });
  }

  // 生成JWT令牌
  private static generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  // 創建會話記錄
  private static async createSession(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天後過期

    const sessionData: any = {
      id: sessionId,
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };

    if (userAgent) sessionData.user_agent = userAgent;
    if (ipAddress) sessionData.ip_address = ipAddress;

    await query.insert('user_sessions', sessionData);
  }

  // 清理過期會話
  static async cleanupExpiredSessions(): Promise<void> {
    const now = new Date().toISOString();

    // 獲取過期會話的用戶ID
    const expiredSessions = await query.findMany('user_sessions', {});
    const expiredUserIds = expiredSessions
      .filter(session => new Date(session.expires_at) < new Date())
      .map(session => session.user_id);

    // 刪除過期會話
    await query.delete('user_sessions', {});

    // 對於沒有活躍會話的用戶，設置為離線
    for (const userId of [...new Set(expiredUserIds)]) {
      const activeSessions = await query.findMany('user_sessions', { user_id: userId });
      if (activeSessions.length === 0) {
        await query.update('users', { is_online: false }, { id: userId });
      }
    }
  }
}