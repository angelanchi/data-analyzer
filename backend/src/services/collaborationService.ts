import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { CollaborationSession, CollaborationEvent, User } from 'shared/types';

export class CollaborationService {
  // 創建協作會話
  static async createSession(
    projectId: string,
    userId: string,
    socketId: string
  ): Promise<CollaborationSession> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const sessionData = {
      id: sessionId,
      project_id: projectId,
      user_id: userId,
      socket_id: socketId,
      joined_at: now,
      last_active: now,
      status: 'active',
      cursor_data: null
    };

    await query.insert('collaboration_sessions', sessionData);

    return {
      id: sessionId,
      projectId,
      userId,
      socketId,
      joinedAt: now,
      lastActive: now,
      status: 'active'
    };
  }

  // 更新會話狀態
  static async updateSession(
    sessionId: string,
    updates: {
      status?: 'active' | 'inactive' | 'disconnected';
      cursor?: { x: number; y: number; component: string };
      lastActive?: string;
    }
  ): Promise<void> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.cursor) updateData.cursor_data = JSON.stringify(updates.cursor);
    if (updates.lastActive) updateData.last_active = updates.lastActive;
    else updateData.last_active = new Date().toISOString();

    await query.update('collaboration_sessions', updateData, { id: sessionId });
  }

  // 根據Socket ID獲取會話
  static async getSessionBySocketId(socketId: string): Promise<CollaborationSession | null> {
    const session = await query.findOne('collaboration_sessions', { socket_id: socketId });
    if (!session) return null;

    return {
      id: (session as any).id,
      projectId: (session as any).project_id,
      userId: (session as any).user_id,
      socketId: (session as any).socket_id,
      joinedAt: (session as any).joined_at,
      lastActive: (session as any).last_active,
      status: (session as any).status,
      cursor: (session as any).cursor_data ? JSON.parse((session as any).cursor_data) : undefined
    };
  }

  // 獲取專案的所有活躍會話
  static async getActiveSessionsByProject(projectId: string): Promise<CollaborationSession[]> {
    const sessions = await query.findMany('collaboration_sessions', {
      project_id: projectId,
      status: 'active'
    }, 'joined_at ASC');

    return (sessions as any[]).map(session => ({
      id: session.id,
      projectId: session.project_id,
      userId: session.user_id,
      socketId: session.socket_id,
      joinedAt: session.joined_at,
      lastActive: session.last_active,
      status: session.status,
      cursor: session.cursor_data ? JSON.parse(session.cursor_data) : undefined
    }));
  }

  // 獲取專案的活躍用戶（帶用戶信息）
  static async getActiveUsersInProject(projectId: string): Promise<Array<CollaborationSession & { user: User }>> {
    // 由於我們的query工具比較簡單，這裡使用兩次查詢
    const sessions = await this.getActiveSessionsByProject(projectId);
    const usersWithSessions = [];

    for (const session of sessions) {
      const userRecord = await query.findOne('users', { id: session.userId });
      if (userRecord) {
        const user: User = {
          id: (userRecord as any).id,
          username: (userRecord as any).username,
          email: (userRecord as any).email,
          displayName: (userRecord as any).display_name,
          avatar: (userRecord as any).avatar,
          role: (userRecord as any).role,
          isOnline: (userRecord as any).is_online,
          lastActive: (userRecord as any).last_active,
          createdAt: (userRecord as any).created_at,
          updatedAt: (userRecord as any).updated_at
        };

        usersWithSessions.push({
          ...session,
          user
        });
      }
    }

    return usersWithSessions;
  }

  // 移除會話
  static async removeSession(sessionId: string): Promise<void> {
    await query.delete('collaboration_sessions', { id: sessionId });
  }

  // 根據Socket ID移除會話
  static async removeSessionBySocketId(socketId: string): Promise<void> {
    await query.delete('collaboration_sessions', { socket_id: socketId });
  }

  // 設置會話為非活躍狀態
  static async setSessionInactive(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'inactive',
      lastActive: new Date().toISOString()
    });
  }

  // 清理過期會話
  static async cleanupExpiredSessions(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // 獲取所有超過5分鐘沒有活動的會話
    const allSessions = await query.findMany('collaboration_sessions', {});
    const expiredSessions = (allSessions as any[]).filter(
      session => session.last_active < fiveMinutesAgo
    );

    // 設置為已斷開連接狀態
    for (const session of expiredSessions) {
      await this.updateSession(session.id, { status: 'disconnected' });
    }

    // 刪除超過1小時的斷開連接會話
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const veryOldSessions = (allSessions as any[]).filter(
      session => session.status === 'disconnected' && session.last_active < oneHourAgo
    );

    for (const session of veryOldSessions) {
      await this.removeSession(session.id);
    }
  }

  // 更新用戶游標位置
  static async updateUserCursor(
    sessionId: string,
    cursor: { x: number; y: number; component: string }
  ): Promise<void> {
    await this.updateSession(sessionId, { cursor });
  }

  // 記錄協作事件
  static async logCollaborationEvent(event: Omit<CollaborationEvent, 'timestamp'>): Promise<void> {
    // 這裡可以記錄到數據庫或日誌文件
    console.log('協作事件:', {
      ...event,
      timestamp: new Date().toISOString()
    });

    // 如果需要持久化存儲，可以創建一個events表
    // 目前先記錄到控制台
  }

  // 廣播事件到專案的所有用戶
  static async broadcastToProject(
    projectId: string,
    event: CollaborationEvent,
    excludeSocketId?: string
  ): Promise<string[]> {
    const sessions = await this.getActiveSessionsByProject(projectId);
    const socketIds = sessions
      .filter(session => session.socketId !== excludeSocketId)
      .map(session => session.socketId);

    // 記錄事件
    await this.logCollaborationEvent(event);

    return socketIds;
  }

  // 檢查用戶是否在專案中
  static async isUserInProject(userId: string, projectId: string): Promise<boolean> {
    const session = await query.findOne('collaboration_sessions', {
      user_id: userId,
      project_id: projectId,
      status: 'active'
    });

    return !!session;
  }

  // 獲取用戶的活躍會話
  static async getUserActiveSessions(userId: string): Promise<CollaborationSession[]> {
    const sessions = await query.findMany('collaboration_sessions', {
      user_id: userId,
      status: 'active'
    }, 'last_active DESC');

    return (sessions as any[]).map(session => ({
      id: session.id,
      projectId: session.project_id,
      userId: session.user_id,
      socketId: session.socket_id,
      joinedAt: session.joined_at,
      lastActive: session.last_active,
      status: session.status,
      cursor: session.cursor_data ? JSON.parse(session.cursor_data) : undefined
    }));
  }

  // 計算專案統計信息
  static async getProjectCollaborationStats(projectId: string): Promise<{
    activeUsers: number;
    totalSessions: number;
    recentActivity: Date | null;
  }> {
    const activeSessions = await this.getActiveSessionsByProject(projectId);
    const allSessions = await query.findMany('collaboration_sessions', { project_id: projectId });

    const recentActivity = allSessions.length > 0
      ? new Date(Math.max(...(allSessions as any[]).map(s => new Date(s.last_active).getTime())))
      : null;

    return {
      activeUsers: activeSessions.length,
      totalSessions: allSessions.length,
      recentActivity
    };
  }
}