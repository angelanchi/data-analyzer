import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from 'shared/types';

export class AuthController {
  // 用戶註冊
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, displayName } = req.body;

      // 基本驗證
      if (!username || !email || !password || !displayName) {
        res.status(400).json({
          success: false,
          error: '所有欄位都是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 驗證用戶名格式
      if (username.length < 3 || username.length > 20) {
        res.status(400).json({
          success: false,
          error: '用戶名長度必須在3-20個字符之間',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

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

      // 驗證密碼強度
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: '密碼長度至少6個字符',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 註冊用戶
      const result = await AuthService.register({
        username,
        email,
        password,
        displayName
      });

      res.status(201).json({
        success: true,
        data: result,
        message: '註冊成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('註冊錯誤:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '註冊失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 用戶登錄
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: '用戶名和密碼都是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 獲取客戶端信息
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.login(
        { username, password },
        userAgent,
        ipAddress
      );

      res.json({
        success: true,
        data: result,
        message: '登錄成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('登錄錯誤:', error);
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : '登錄失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 用戶登出
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(400).json({
          success: false,
          error: '未提供認證令牌',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      await AuthService.logout(token);

      res.json({
        success: true,
        message: '登出成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('登出錯誤:', error);
      res.status(500).json({
        success: false,
        error: '登出失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 獲取當前用戶信息
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // 用戶信息在middleware中已經附加到request上
      const user = (req as any).user;

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('獲取用戶信息錯誤:', error);
      res.status(500).json({
        success: false,
        error: '獲取用戶信息失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 更新用戶資料
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { displayName, avatar, email } = req.body;

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

      const updatedUser = await AuthService.updateUser(user.id, updates);

      res.json({
        success: true,
        data: updatedUser,
        message: '用戶資料更新成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('更新用戶資料錯誤:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '更新用戶資料失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 更改密碼
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: '原密碼和新密碼都是必填的',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: '新密碼長度至少6個字符',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      await AuthService.changePassword(user.id, oldPassword, newPassword);

      res.json({
        success: true,
        message: '密碼修改成功，請重新登錄',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('更改密碼錯誤:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '更改密碼失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 刷新令牌
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(400).json({
          success: false,
          error: '未提供認證令牌',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const newToken = await AuthService.refreshToken(token);

      if (!newToken) {
        res.status(401).json({
          success: false,
          error: '令牌刷新失敗',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: { token: newToken },
        message: '令牌刷新成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('刷新令牌錯誤:', error);
      res.status(500).json({
        success: false,
        error: '令牌刷新失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  // 驗證令牌
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(400).json({
          success: false,
          error: '未提供認證令牌',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const user = await AuthService.verifyToken(token);

      if (!user) {
        res.status(401).json({
          success: false,
          error: '令牌無效或已過期',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: user,
        message: '令牌驗證成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (error) {
      console.error('驗證令牌錯誤:', error);
      res.status(500).json({
        success: false,
        error: '令牌驗證失敗',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
}