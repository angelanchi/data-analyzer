import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ApiResponse } from 'shared/types';

// 簡化版用戶控制器 - 開發模式友好
export class UserController {
  // 獲取所有用戶
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getAllUsers();

      res.json({
        success: true,
        data: users,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('獲取用戶列表錯誤:', error);
      res.status(500).json({
        success: false,
        error: '獲取用戶列表失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 根據ID獲取用戶
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: '用戶ID是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: '用戶不存在',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('獲取用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '獲取用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 創建新用戶（簡化版）
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, displayName, avatar, role } = req.body;

      if (!username || !email || !displayName) {
        res.status(400).json({
          success: false,
          error: '用戶名、郵箱和顯示名稱都是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 簡單的郵箱格式驗證
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: '郵箱格式不正確',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const user = await UserService.createUser({
        username,
        email,
        displayName,
        avatar,
        role
      });

      res.status(201).json({
        success: true,
        data: user,
        message: '用戶創建成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('創建用戶錯誤:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '創建用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 更新用戶信息
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { displayName, avatar, email, role } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: '用戶ID是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const updates: any = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (avatar !== undefined) updates.avatar = avatar;
      if (email !== undefined) {
        // 驗證郵箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({
            success: false,
            error: '郵箱格式不正確',
            timestamp: new Date().toISOString()
          } as ApiResponse);
          return;
        }
        updates.email = email;
      }
      if (role !== undefined) updates.role = role;

      const updatedUser = await UserService.updateUser(userId, updates);

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: '用戶不存在',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: updatedUser,
        message: '用戶信息更新成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('更新用戶錯誤:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '更新用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 刪除用戶
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: '用戶ID是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 檢查用戶是否存在
      const user = await UserService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: '用戶不存在',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      await UserService.deleteUser(userId);

      res.json({
        success: true,
        message: '用戶刪除成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('刪除用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '刪除用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 獲取當前用戶（開發模式：默認返回admin或第一個用戶）
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // 從查詢參數或session中獲取當前用戶ID
      const currentUserId = req.query.userId as string || req.headers['x-current-user'] as string;

      let user;
      if (currentUserId) {
        user = await UserService.getUserById(currentUserId);
      }

      // 如果沒有指定用戶或用戶不存在，返回默認用戶
      if (!user) {
        user = await UserService.getDefaultUser();
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('獲取當前用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '獲取當前用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 設置當前用戶（開發模式：簡單的用戶切換）
  static async setCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: '用戶ID是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const user = await UserService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: '用戶不存在',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 更新用戶活躍狀態
      await UserService.updateLastActive(userId);

      res.json({
        success: true,
        data: user,
        message: '用戶切換成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('設置當前用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '設置當前用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 搜索用戶
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: '搜索關鍵字是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const users = await UserService.searchUsersByName(q);

      res.json({
        success: true,
        data: users,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('搜索用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '搜索用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 獲取在線用戶
  static async getOnlineUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getOnlineUsers();

      res.json({
        success: true,
        data: users,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('獲取在線用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '獲取在線用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 初始化測試用戶
  static async initializeTestUsers(req: Request, res: Response): Promise<void> {
    try {
      await UserService.initializeTestUsers();

      const users = await UserService.getAllUsers();

      res.json({
        success: true,
        data: users,
        message: '測試用戶初始化成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('初始化測試用戶錯誤:', error);
      res.status(500).json({
        success: false,
        error: '初始化測試用戶失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
}