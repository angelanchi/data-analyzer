import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

// 用戶管理路由 - 開發友好版本

// 獲取所有用戶
router.get('/', UserController.getAllUsers);

// 獲取當前用戶（開發模式）
router.get('/current', UserController.getCurrentUser);

// 設置當前用戶（開發模式的用戶切換）
router.post('/current', UserController.setCurrentUser);

// 搜索用戶
router.get('/search', UserController.searchUsers);

// 獲取在線用戶
router.get('/online', UserController.getOnlineUsers);

// 初始化測試用戶
router.post('/init-test-users', UserController.initializeTestUsers);

// 根據ID獲取用戶
router.get('/:userId', UserController.getUserById);

// 創建新用戶
router.post('/', UserController.createUser);

// 更新用戶信息
router.put('/:userId', UserController.updateUser);

// 刪除用戶
router.delete('/:userId', UserController.deleteUser);

export default router;