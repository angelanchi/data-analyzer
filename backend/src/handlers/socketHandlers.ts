import { Server as SocketIOServer, Socket } from 'socket.io';
import { CollaborationService } from '../services/collaborationService';
import { UserService } from '../services/userService';
import { CollaborationEvent } from 'shared/types';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // 追踪每個用戶的連接（防止連接泄漏）
  const userConnections = new Map<string, Set<string>>();
  const MAX_CONNECTIONS_PER_USER = 3;

  // 用戶連接處理
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`[${io.sockets.sockets.size}] 用戶連接: ${socket.id}`);

    // 用戶認證 - 簡化版本，從查詢參數獲取用戶ID
    socket.on('authenticate', async (data: { userId: string }) => {
      try {
        const user = await UserService.getUserById(data.userId);
        if (user) {
          // 檢查並限制每用戶連接數
          if (!userConnections.has(user.id)) {
            userConnections.set(user.id, new Set());
          }

          const connections = userConnections.get(user.id)!;

          // 如果超過最大連接數，斷開最舊的連接
          if (connections.size >= MAX_CONNECTIONS_PER_USER) {
            const oldestSocketId = connections.values().next().value;

            if (oldestSocketId) {
              const oldestSocket = io.sockets.sockets.get(oldestSocketId);

              if (oldestSocket) {
                console.log(`[連接限制] 用戶 ${user.username} 超過 ${MAX_CONNECTIONS_PER_USER} 個連接，斷開舊連接 ${oldestSocketId}`);
                oldestSocket.emit('connection-limit-exceeded', {
                  message: '由於新連接建立，此連接已被斷開'
                });
                oldestSocket.disconnect(true);
              }

              connections.delete(oldestSocketId);
            }
          }

          // 添加當前連接
          connections.add(socket.id);
          console.log(`[連接管理] 用戶 ${user.username} 當前連接數: ${connections.size}/${MAX_CONNECTIONS_PER_USER}`);

          socket.userId = user.id;
          socket.username = user.username;

          // 更新用戶在線狀態
          await UserService.setUserOnlineStatus(user.id, true);

          socket.emit('authenticated', { user });
          console.log(`用戶 ${user.displayName} (${user.username}) 已認證`);
        } else {
          socket.emit('authentication-error', { message: '用戶不存在' });
        }
      } catch (error) {
        console.error('認證錯誤:', error);
        socket.emit('authentication-error', { message: '認證失敗' });
      }
    });

    // 加入專案房間
    socket.on('join-project', async (data: { projectId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: '請先認證' });
          return;
        }

        const { projectId } = data;

        // 創建協作會話
        const session = await CollaborationService.createSession(
          projectId,
          socket.userId,
          socket.id
        );

        // 加入Socket.io房間
        socket.join(projectId);

        // 獲取專案中的其他活躍用戶
        const activeUsers = await CollaborationService.getActiveUsersInProject(projectId);

        // 通知自己成功加入
        socket.emit('project-joined', {
          projectId,
          session,
          activeUsers: activeUsers.filter(u => u.userId !== socket.userId)
        });

        // 通知專案中的其他用戶
        const joinEvent: CollaborationEvent = {
          type: 'user-join',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          data: {
            user: activeUsers.find(u => u.userId === socket.userId)?.user
          }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          joinEvent,
          socket.id
        );

        // 廣播給其他socket
        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', joinEvent);
        });

        console.log(`用戶 ${socket.username} 加入專案 ${projectId}`);
      } catch (error) {
        console.error('加入專案錯誤:', error);
        socket.emit('error', { message: '加入專案失敗' });
      }
    });

    // 離開專案房間
    socket.on('leave-project', async (data: { projectId: string }) => {
      try {
        if (!socket.userId) return;

        const { projectId } = data;

        // 移除協作會話
        await CollaborationService.removeSessionBySocketId(socket.id);

        // 離開Socket.io房間
        socket.leave(projectId);

        // 通知專案中的其他用戶
        const leaveEvent: CollaborationEvent = {
          type: 'user-leave',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          leaveEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', leaveEvent);
        });

        socket.emit('project-left', { projectId });
        console.log(`用戶 ${socket.username} 離開專案 ${projectId}`);
      } catch (error) {
        console.error('離開專案錯誤:', error);
      }
    });

    // 數據變更事件
    socket.on('data-change', async (data: {
      projectId: string;
      fieldPath: string;
      oldValue: any;
      newValue: any;
      changeType: 'create' | 'update' | 'delete';
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, fieldPath, oldValue, newValue, changeType } = data;

        const changeEvent: CollaborationEvent = {
          type: 'data-change',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          fieldPath,
          data: {
            changeType,
            fieldPath,
            oldValue,
            newValue
          }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          changeEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', changeEvent);
        });

        console.log(`數據變更: ${socket.username} 在 ${projectId} 修改了 ${fieldPath}`);
      } catch (error) {
        console.error('數據變更處理錯誤:', error);
      }
    });

    // 圖表配置變更事件
    socket.on('chart-change', async (data: {
      projectId: string;
      chartId: string;
      oldConfig: any;
      newConfig: any;
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, chartId, oldConfig, newConfig } = data;

        const chartEvent: CollaborationEvent = {
          type: 'chart-change',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          targetComponent: 'chart',
          data: {
            chartId,
            oldConfig,
            newConfig
          }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          chartEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', chartEvent);
        });

        console.log(`圖表變更: ${socket.username} 在 ${projectId} 修改了圖表 ${chartId}`);
      } catch (error) {
        console.error('圖表變更處理錯誤:', error);
      }
    });

    // 數據文件添加事件
    socket.on('data-file-added', async (data: {
      projectId: string;
      fileId: string;
      fileName: string;
      fileSize: number;
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, fileId, fileName, fileSize } = data;

        const fileAddedEvent: CollaborationEvent = {
          type: 'data-file-added',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          data: {
            fileId,
            fileName,
            fileSize,
            addedBy: socket.username
          }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          fileAddedEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', fileAddedEvent);
        });

        console.log(`數據文件添加: ${socket.username} 在 ${projectId} 添加了 ${fileName}`);
      } catch (error) {
        console.error('數據文件添加處理錯誤:', error);
      }
    });

    // 數據文件移除事件
    socket.on('data-file-removed', async (data: {
      projectId: string;
      fileId: string;
      fileName: string;
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, fileId, fileName } = data;

        const fileRemovedEvent: CollaborationEvent = {
          type: 'data-file-removed',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          data: {
            fileId,
            fileName,
            removedBy: socket.username
          }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          fileRemovedEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', fileRemovedEvent);
        });

        console.log(`數據文件移除: ${socket.username} 在 ${projectId} 移除了 ${fileName}`);
      } catch (error) {
        console.error('數據文件移除處理錯誤:', error);
      }
    });

    // 游標移動事件
    socket.on('cursor-move', async (data: {
      projectId: string;
      x: number;
      y: number;
      component: string;
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, x, y, component } = data;

        // 更新會話中的游標位置
        const session = await CollaborationService.getSessionBySocketId(socket.id);
        if (session) {
          await CollaborationService.updateUserCursor(session.id, { x, y, component });
        }

        const cursorEvent: CollaborationEvent = {
          type: 'cursor-move',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          targetComponent: component,
          data: { x, y, component }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          cursorEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', cursorEvent);
        });
      } catch (error) {
        console.error('游標移動處理錯誤:', error);
      }
    });

    // 打字狀態事件
    socket.on('typing', async (data: {
      projectId: string;
      component: string;
      isTyping: boolean;
    }) => {
      try {
        if (!socket.userId) return;

        const { projectId, component, isTyping } = data;

        const typingEvent: CollaborationEvent = {
          type: 'typing',
          projectId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
          targetComponent: component,
          data: { isTyping }
        };

        const socketIds = await CollaborationService.broadcastToProject(
          projectId,
          typingEvent,
          socket.id
        );

        socketIds.forEach(socketId => {
          io.to(socketId).emit('collaboration-event', typingEvent);
        });
      } catch (error) {
        console.error('打字狀態處理錯誤:', error);
      }
    });

    // 獲取專案統計信息
    socket.on('get-project-stats', async (data: { projectId: string }) => {
      try {
        const stats = await CollaborationService.getProjectCollaborationStats(data.projectId);
        socket.emit('project-stats', stats);
      } catch (error) {
        console.error('獲取專案統計錯誤:', error);
        socket.emit('error', { message: '獲取統計信息失敗' });
      }
    });

    // 獲取活躍用戶列表
    socket.on('get-active-users', async (data: { projectId: string }) => {
      try {
        const activeUsers = await CollaborationService.getActiveUsersInProject(data.projectId);
        socket.emit('active-users', activeUsers);
      } catch (error) {
        console.error('獲取活躍用戶錯誤:', error);
        socket.emit('error', { message: '獲取活躍用戶失敗' });
      }
    });

    // 用戶斷開連接處理
    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          // 從用戶連接記錄中移除
          if (userConnections.has(socket.userId)) {
            const connections = userConnections.get(socket.userId)!;
            connections.delete(socket.id);

            if (connections.size === 0) {
              userConnections.delete(socket.userId);
            }

            console.log(`[連接管理] 用戶 ${socket.username} 斷開連接，剩餘連接數: ${connections.size}`);
          }

          // 獲取用戶的會話
          const session = await CollaborationService.getSessionBySocketId(socket.id);

          if (session) {
            // 通知專案中的其他用戶
            const leaveEvent: CollaborationEvent = {
              type: 'user-leave',
              projectId: session.projectId,
              userId: socket.userId,
              timestamp: new Date().toISOString()
            };

            const socketIds = await CollaborationService.broadcastToProject(
              session.projectId,
              leaveEvent,
              socket.id
            );

            socketIds.forEach(socketId => {
              io.to(socketId).emit('collaboration-event', leaveEvent);
            });

            // 移除協作會話
            await CollaborationService.removeSessionBySocketId(socket.id);
          }

          // 檢查用戶是否還有其他活躍會話
          const userSessions = await CollaborationService.getUserActiveSessions(socket.userId);
          if (userSessions.length === 0) {
            // 設置用戶為離線狀態
            await UserService.setUserOnlineStatus(socket.userId, false);
          }

          console.log(`用戶 ${socket.username} (${socket.userId}) 斷開連接`);
        }
      } catch (error) {
        console.error('斷開連接處理錯誤:', error);
      }
    });

    // 心跳檢測
    socket.on('heartbeat', async () => {
      try {
        if (socket.userId) {
          const session = await CollaborationService.getSessionBySocketId(socket.id);
          if (session) {
            await CollaborationService.updateSession(session.id, {
              lastActive: new Date().toISOString()
            });
          }

          // 更新用戶最後活躍時間
          await UserService.updateLastActive(socket.userId);
        }

        socket.emit('heartbeat-ack');
      } catch (error) {
        console.error('心跳處理錯誤:', error);
      }
    });
  });

  // 定期清理過期會話
  setInterval(async () => {
    try {
      await CollaborationService.cleanupExpiredSessions();
    } catch (error) {
      console.error('清理過期會話錯誤:', error);
    }
  }, 5 * 60 * 1000); // 每5分鐘清理一次

  console.log('Socket.io 協作處理器已設置');
};