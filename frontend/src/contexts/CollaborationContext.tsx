import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { CollaborationEvent, User, DataConflict } from '../types';

interface CollaborationState {
  isConnected: boolean;
  currentProjectId: string | null;
  activeUsers: Array<{
    userId: string;
    user: User;
    lastActive: string;
    cursorPosition?: { x: number; y: number; component: string };
    isTyping?: { component: string; isTyping: boolean };
  }>;
  pendingConflicts: DataConflict[];
  recentEvents: CollaborationEvent[];
  connectionError: string | null;
}

interface CollaborationContextType {
  state: CollaborationState;
  connectToProject: (projectId: string, userId: string) => Promise<void>;
  leaveProject: () => void;
  sendDataChange: (data: {
    projectId: string;
    fieldPath: string;
    oldValue: any;
    newValue: any;
    changeType: 'create' | 'update' | 'delete';
  }) => void;
  sendChartChange: (data: {
    projectId: string;
    chartId: string;
    oldConfig: any;
    newConfig: any;
  }) => void;
  sendCursorMove: (data: {
    projectId: string;
    x: number;
    y: number;
    component: string;
  }) => void;
  sendTyping: (data: {
    projectId: string;
    component: string;
    isTyping: boolean;
  }) => void;
  sendDataFileAdded: (data: {
    projectId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
  }) => void;
  sendDataFileRemoved: (data: {
    projectId: string;
    fileId: string;
    fileName: string;
  }) => void;
}

type CollaborationAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_PROJECT'; payload: string | null }
  | { type: 'SET_ACTIVE_USERS'; payload: CollaborationState['activeUsers'] }
  | { type: 'ADD_EVENT'; payload: CollaborationEvent }
  | { type: 'UPDATE_USER_CURSOR'; payload: { userId: string; cursor: { x: number; y: number; component: string } } }
  | { type: 'UPDATE_USER_TYPING'; payload: { userId: string; typing: { component: string; isTyping: boolean } } }
  | { type: 'ADD_CONFLICT'; payload: DataConflict }
  | { type: 'REMOVE_CONFLICT'; payload: string }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: CollaborationState = {
  isConnected: false,
  currentProjectId: null,
  activeUsers: [],
  pendingConflicts: [],
  recentEvents: [],
  connectionError: null,
};

function collaborationReducer(state: CollaborationState, action: CollaborationAction): CollaborationState {
  switch (action.type) {
  case 'SET_CONNECTED':
    return { ...state, isConnected: action.payload };

  case 'SET_PROJECT':
    return { ...state, currentProjectId: action.payload };

  case 'SET_ACTIVE_USERS':
    return { ...state, activeUsers: action.payload };

  case 'ADD_EVENT':
    return {
      ...state,
      recentEvents: [action.payload, ...state.recentEvents].slice(0, 50), // 保留最近50個事件
    };

  case 'UPDATE_USER_CURSOR':
    return {
      ...state,
      activeUsers: state.activeUsers.map(user =>
        user.userId === action.payload.userId
          ? { ...user, cursorPosition: action.payload.cursor }
          : user
      ),
    };

  case 'UPDATE_USER_TYPING':
    return {
      ...state,
      activeUsers: state.activeUsers.map(user =>
        user.userId === action.payload.userId
          ? { ...user, isTyping: action.payload.typing }
          : user
      ),
    };

  case 'ADD_CONFLICT':
    return {
      ...state,
      pendingConflicts: [...state.pendingConflicts, action.payload],
    };

  case 'REMOVE_CONFLICT':
    return {
      ...state,
      pendingConflicts: state.pendingConflicts.filter(c => c.id !== action.payload),
    };

  case 'SET_CONNECTION_ERROR':
    return { ...state, connectionError: action.payload };

  case 'RESET':
    return initialState;

  default:
    return state;
  }
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

interface CollaborationProviderProps {
  children: ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);

  useEffect(() => {
    // 設置Socket事件監聽器
    const setupSocketListeners = () => {
      socketService.on('socket-connected', () => {
        dispatch({ type: 'SET_CONNECTED', payload: true });
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      });

      socketService.on('socket-disconnected', () => {
        dispatch({ type: 'SET_CONNECTED', payload: false });
      });

      socketService.on('socket-error', (error: any) => {
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: error.message || '連接錯誤' });
      });

      socketService.on('project-joined', (data: any) => {
        dispatch({ type: 'SET_PROJECT', payload: data.projectId });
        dispatch({ type: 'SET_ACTIVE_USERS', payload: data.activeUsers || [] });
      });

      socketService.on('project-left', () => {
        dispatch({ type: 'SET_PROJECT', payload: null });
        dispatch({ type: 'SET_ACTIVE_USERS', payload: [] });
      });

      socketService.on('active-users', (users: any[]) => {
        dispatch({ type: 'SET_ACTIVE_USERS', payload: users });
      });

      socketService.on('collaboration-event', (event: CollaborationEvent) => {
        dispatch({ type: 'ADD_EVENT', payload: event });

        // 處理特定事件類型
        switch (event.type) {
        case 'cursor-move':
          if (event.data && event.userId) {
            dispatch({
              type: 'UPDATE_USER_CURSOR',
              payload: {
                userId: event.userId,
                cursor: {
                  x: event.data.x,
                  y: event.data.y,
                  component: event.data.component,
                },
              },
            });
          }
          break;

        case 'typing':
          if (event.data && event.userId) {
            dispatch({
              type: 'UPDATE_USER_TYPING',
              payload: {
                userId: event.userId,
                typing: {
                  component: event.targetComponent || '',
                  isTyping: event.data.isTyping,
                },
              },
            });
          }
          break;

        case 'conflict':
          if (event.data && event.data.action === 'detected') {
            // 衝突檢測到，添加到待處理列表
            const conflict: DataConflict = {
              id: event.data.conflictId,
              projectId: event.projectId,
              fieldPath: event.fieldPath || '',
              conflictType: 'concurrent-edit',
              originalValue: event.data.originalValue,
              conflictingValues: event.data.conflictingValues || [],
              status: 'pending',
            };
            dispatch({ type: 'ADD_CONFLICT', payload: conflict });
          } else if (event.data && event.data.action === 'resolved') {
            // 衝突已解決，從列表中移除
            dispatch({ type: 'REMOVE_CONFLICT', payload: event.data.conflictId });
          }
          break;

        case 'data-file-added':
          // 數據文件添加事件 - 可以在此處觸發UI更新或通知
          console.log('數據文件已添加:', event.data);
          break;

        case 'data-file-removed':
          // 數據文件移除事件 - 可以在此處觸發UI更新或通知
          console.log('數據文件已移除:', event.data);
          break;
        }
      });
    };

    setupSocketListeners();

    // 清理函數
    return () => {
      socketService.off('socket-connected');
      socketService.off('socket-disconnected');
      socketService.off('socket-error');
      socketService.off('project-joined');
      socketService.off('project-left');
      socketService.off('active-users');
      socketService.off('collaboration-event');
    };
  }, []);

  const connectToProject = async (projectId: string, userId: string) => {
    try {
      // 幂等性檢查：如果已經連接到同一專案，直接返回
      if (state.currentProjectId === projectId && socketService.isConnected()) {
        console.log(`[CollaborationContext] Already connected to project ${projectId}`);
        return;
      }

      // 如果連接到不同專案，先離開當前專案
      if (state.currentProjectId && state.currentProjectId !== projectId) {
        console.log(`[CollaborationContext] Leaving current project ${state.currentProjectId}`);
        leaveProject();
      }

      if (!socketService.isConnected()) {
        socketService.connect();

        // 等待連接完成
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (socketService.isConnected()) {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }

      socketService.authenticate(userId);

      // 等待認證完成
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('認證超時'));
        }, 5000);

        socketService.on('authenticated', () => {
          clearTimeout(timeout);
          resolve();
        });

        socketService.on('authentication-error', (error: any) => {
          clearTimeout(timeout);
          reject(new Error(error.message || '認證失敗'));
        });
      });

      socketService.joinProject(projectId);
    } catch (error) {
      console.error('連接到專案失敗:', error);
      dispatch({
        type: 'SET_CONNECTION_ERROR',
        payload: error instanceof Error ? error.message : '連接失敗'
      });
      throw error;
    }
  };

  const leaveProject = () => {
    if (state.currentProjectId) {
      socketService.leaveProject(state.currentProjectId);
    }
    dispatch({ type: 'RESET' });
  };

  const sendDataChange = (data: {
    projectId: string;
    fieldPath: string;
    oldValue: any;
    newValue: any;
    changeType: 'create' | 'update' | 'delete';
  }) => {
    socketService.sendDataChange(data);
  };

  const sendChartChange = (data: {
    projectId: string;
    chartId: string;
    oldConfig: any;
    newConfig: any;
  }) => {
    socketService.sendChartChange(data);
  };

  const sendCursorMove = (data: {
    projectId: string;
    x: number;
    y: number;
    component: string;
  }) => {
    socketService.sendCursorMove(data);
  };

  const sendTyping = (data: {
    projectId: string;
    component: string;
    isTyping: boolean;
  }) => {
    socketService.sendTyping(data);
  };

  const sendDataFileAdded = (data: {
    projectId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
  }) => {
    socketService.sendDataFileAdded(data);
  };

  const sendDataFileRemoved = (data: {
    projectId: string;
    fileId: string;
    fileName: string;
  }) => {
    socketService.sendDataFileRemoved(data);
  };

  const contextValue: CollaborationContextType = {
    state,
    connectToProject,
    leaveProject,
    sendDataChange,
    sendChartChange,
    sendCursorMove,
    sendTyping,
    sendDataFileAdded,
    sendDataFileRemoved,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};