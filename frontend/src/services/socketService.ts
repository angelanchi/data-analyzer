import { io, Socket } from 'socket.io-client';
import { CollaborationEvent } from '../types';

export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private isConnecting = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // 連接到服務器
  connect(serverUrl = 'http://localhost:3001'): void {
    // 防止重複連接
    if (this.socket?.connected || this.isConnecting) {
      console.log('[SocketService] Already connected or connecting, skipping...');
      return;
    }

    this.isConnecting = true;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupEventHandlers();
  }

  // 設置基本事件處理器
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket 連接成功:', this.socket?.id);
      this.isConnecting = false;
      this.emit('socket-connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket 斷開連接:', reason);
      this.isConnecting = false;
      this.emit('socket-disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket 連接錯誤:', error);
      this.isConnecting = false;
    });

    this.socket.on('authenticated', (data) => {
      console.log('用戶認證成功:', data);
      this.emit('authenticated', data);
    });

    this.socket.on('authentication-error', (data) => {
      console.error('認證失敗:', data);
      this.emit('authentication-error', data);
    });

    this.socket.on('project-joined', (data) => {
      console.log('成功加入專案:', data);
      this.emit('project-joined', data);
    });

    this.socket.on('project-left', (data) => {
      console.log('離開專案:', data);
      this.emit('project-left', data);
    });

    this.socket.on('collaboration-event', (event: CollaborationEvent) => {
      console.log('協作事件:', event);
      this.emit('collaboration-event', event);
      this.emit(`collaboration-${event.type}`, event);
    });

    this.socket.on('project-stats', (stats) => {
      this.emit('project-stats', stats);
    });

    this.socket.on('active-users', (users) => {
      this.emit('active-users', users);
    });

    this.socket.on('error', (error) => {
      console.error('Socket 錯誤:', error);
      this.emit('socket-error', error);
    });

    this.socket.on('heartbeat-ack', () => {
      // 心跳確認
    });
  }

  // 用戶認證
  authenticate(userId: string): void {
    if (!this.socket) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('authenticate', { userId });
  }

  // 加入專案
  joinProject(projectId: string): void {
    if (!this.socket) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('join-project', { projectId });
  }

  // 離開專案
  leaveProject(projectId: string): void {
    if (!this.socket) {
      console.error('Socket 未連接');
      return;
    }

    this.socket.emit('leave-project', { projectId });
  }

  // 發送數據變更事件
  sendDataChange(data: {
    projectId: string;
    fieldPath: string;
    oldValue: any;
    newValue: any;
    changeType: 'create' | 'update' | 'delete';
  }): void {
    if (!this.socket) return;
    this.socket.emit('data-change', data);
  }

  // 發送圖表變更事件
  sendChartChange(data: {
    projectId: string;
    chartId: string;
    oldConfig: any;
    newConfig: any;
  }): void {
    if (!this.socket) return;
    this.socket.emit('chart-change', data);
  }

  // 發送游標移動事件
  sendCursorMove(data: {
    projectId: string;
    x: number;
    y: number;
    component: string;
  }): void {
    if (!this.socket) return;
    this.socket.emit('cursor-move', data);
  }

  // 發送打字狀態
  sendTyping(data: {
    projectId: string;
    component: string;
    isTyping: boolean;
  }): void {
    if (!this.socket) return;
    this.socket.emit('typing', data);
  }

  // 發送數據文件添加事件
  sendDataFileAdded(data: {
    projectId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
  }): void {
    if (!this.socket) return;
    this.socket.emit('data-file-added', data);
  }

  // 發送數據文件移除事件
  sendDataFileRemoved(data: {
    projectId: string;
    fileId: string;
    fileName: string;
  }): void {
    if (!this.socket) return;
    this.socket.emit('data-file-removed', data);
  }

  // 獲取專案統計
  getProjectStats(projectId: string): void {
    if (!this.socket) return;
    this.socket.emit('get-project-stats', { projectId });
  }

  // 獲取活躍用戶
  getActiveUsers(projectId: string): void {
    if (!this.socket) return;
    this.socket.emit('get-active-users', { projectId });
  }

  // 心跳檢測
  sendHeartbeat(): void {
    if (!this.socket) return;
    this.socket.emit('heartbeat');
  }

  // 事件監聽
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // 移除事件監聽
  off(event: string, callback?: (data: any) => void): void {
    if (!this.eventListeners.has(event)) return;

    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  // 觸發事件
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件處理器錯誤 (${event}):`, error);
      }
    });
  }

  // 斷開連接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  // 獲取連接狀態
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 獲取Socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // 開始心跳檢測
  startHeartbeat(interval = 30000): void {
    setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat();
      }
    }, interval);
  }
}

// 導出單例實例
export const socketService = SocketService.getInstance();