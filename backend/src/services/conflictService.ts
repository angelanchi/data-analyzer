import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { DataConflict, CollaborationEvent } from 'shared/types';
import { CollaborationService } from './collaborationService';

export class ConflictService {
  // 檢測數據衝突
  static async detectConflict(
    projectId: string,
    fieldPath: string,
    userId: string,
    newValue: any,
    originalValue?: any
  ): Promise<DataConflict | null> {
    // 檢查是否有其他用戶在最近時間內修改了相同字段
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // 獲取該專案的活躍用戶
    const activeSessions = await CollaborationService.getActiveSessionsByProject(projectId);
    const otherUsers = activeSessions.filter(session => session.userId !== userId);

    if (otherUsers.length === 0) {
      return null; // 沒有其他用戶，無衝突
    }

    // 檢查現有的待處理衝突
    const existingConflicts = await query.findMany('data_conflicts', {
      project_id: projectId,
      field_path: fieldPath,
      status: 'pending'
    });

    if ((existingConflicts as any[]).length > 0) {
      // 更新現有衝突
      const conflict = existingConflicts[0] as any;
      const conflictingValues = JSON.parse(conflict.conflicting_values);

      // 添加新的衝突值
      conflictingValues.push({
        value: newValue,
        userId,
        timestamp: new Date().toISOString()
      });

      await query.update('data_conflicts',
        { conflicting_values: JSON.stringify(conflictingValues) },
        { id: conflict.id }
      );

      return await this.getConflict(conflict.id);
    }

    // 創建新的衝突記錄
    return await this.createConflict(
      projectId,
      fieldPath,
      'concurrent-edit',
      originalValue,
      [{ value: newValue, userId, timestamp: new Date().toISOString() }]
    );
  }

  // 創建衝突記錄
  static async createConflict(
    projectId: string,
    fieldPath: string,
    conflictType: 'concurrent-edit' | 'version-mismatch' | 'permission-denied',
    originalValue: any,
    conflictingValues: Array<{
      value: any;
      userId: string;
      timestamp: string;
    }>
  ): Promise<DataConflict> {
    const conflictId = uuidv4();
    const now = new Date().toISOString();

    const conflictData = {
      id: conflictId,
      project_id: projectId,
      field_path: fieldPath,
      conflict_type: conflictType,
      original_value: originalValue ? JSON.stringify(originalValue) : null,
      conflicting_values: JSON.stringify(conflictingValues),
      status: 'pending',
      created_at: now
    };

    await query.insert('data_conflicts', conflictData);

    return {
      id: conflictId,
      projectId,
      fieldPath,
      conflictType,
      originalValue,
      conflictingValues,
      status: 'pending'
    };
  }

  // 獲取衝突詳情
  static async getConflict(conflictId: string): Promise<DataConflict | null> {
    const conflict = await query.findOne('data_conflicts', { id: conflictId });
    if (!conflict) return null;

    return {
      id: (conflict as any).id,
      projectId: (conflict as any).project_id,
      fieldPath: (conflict as any).field_path,
      conflictType: (conflict as any).conflict_type,
      originalValue: (conflict as any).original_value ? JSON.parse((conflict as any).original_value) : null,
      conflictingValues: JSON.parse((conflict as any).conflicting_values),
      status: (conflict as any).status,
      resolvedBy: (conflict as any).resolved_by,
      resolvedAt: (conflict as any).resolved_at,
      resolutionStrategy: (conflict as any).resolution_strategy
    };
  }

  // 獲取專案的所有衝突
  static async getProjectConflicts(
    projectId: string,
    status?: 'pending' | 'resolved' | 'ignored'
  ): Promise<DataConflict[]> {
    const whereClause: any = { project_id: projectId };
    if (status) {
      whereClause.status = status;
    }

    const conflicts = await query.findMany('data_conflicts', whereClause, 'created_at DESC');

    return (conflicts as any[]).map(conflict => ({
      id: conflict.id,
      projectId: conflict.project_id,
      fieldPath: conflict.field_path,
      conflictType: conflict.conflict_type,
      originalValue: conflict.original_value ? JSON.parse(conflict.original_value) : null,
      conflictingValues: JSON.parse(conflict.conflicting_values),
      status: conflict.status,
      resolvedBy: conflict.resolved_by,
      resolvedAt: conflict.resolved_at,
      resolutionStrategy: conflict.resolution_strategy
    }));
  }

  // 解決衝突
  static async resolveConflict(
    conflictId: string,
    resolutionStrategy: 'accept-mine' | 'accept-theirs' | 'merge' | 'custom',
    resolvedBy: string,
    finalValue?: any
  ): Promise<DataConflict> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) {
      throw new Error('衝突不存在');
    }

    let resolvedValue = finalValue;

    if (!resolvedValue) {
      switch (resolutionStrategy) {
        case 'accept-mine':
          // 接受解決者的版本（通常是最新的衝突值）
          const myChanges = conflict.conflictingValues.filter(cv => cv.userId === resolvedBy);
          if (myChanges.length > 0) {
            resolvedValue = myChanges[myChanges.length - 1].value;
          }
          break;

        case 'accept-theirs':
          // 接受其他人的版本（通常是最早的衝突值）
          const otherChanges = conflict.conflictingValues.filter(cv => cv.userId !== resolvedBy);
          if (otherChanges.length > 0) {
            resolvedValue = otherChanges[0].value;
          }
          break;

        case 'merge':
          // 簡單的合併策略（這裡需要根據數據類型實現具體邏輯）
          resolvedValue = this.mergeValues(conflict.conflictingValues.map(cv => cv.value));
          break;

        default:
          throw new Error('無效的解決策略');
      }
    }

    const now = new Date().toISOString();

    await query.update('data_conflicts',
      {
        status: 'resolved',
        resolved_by: resolvedBy,
        resolved_at: now,
        resolution_strategy: resolutionStrategy
      },
      { id: conflictId }
    );

    // 記錄解決事件
    const resolveEvent: CollaborationEvent = {
      type: 'conflict',
      projectId: conflict.projectId,
      userId: resolvedBy,
      timestamp: now,
      fieldPath: conflict.fieldPath,
      data: {
        action: 'resolved',
        strategy: resolutionStrategy,
        finalValue: resolvedValue
      }
    };

    // 廣播衝突解決事件
    await CollaborationService.broadcastToProject(conflict.projectId, resolveEvent);

    return {
      ...conflict,
      status: 'resolved',
      resolvedBy,
      resolvedAt: now,
      resolutionStrategy
    };
  }

  // 忽略衝突
  static async ignoreConflict(conflictId: string, resolvedBy: string): Promise<void> {
    await query.update('data_conflicts',
      {
        status: 'ignored',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString()
      },
      { id: conflictId }
    );
  }

  // 檢測版本衝突
  static async detectVersionConflict(
    projectId: string,
    expectedVersionId: string,
    currentVersionId: string
  ): Promise<DataConflict | null> {
    if (expectedVersionId !== currentVersionId) {
      return await this.createConflict(
        projectId,
        'version',
        'version-mismatch',
        expectedVersionId,
        [{
          value: currentVersionId,
          userId: 'system',
          timestamp: new Date().toISOString()
        }]
      );
    }

    return null;
  }

  // 檢測權限衝突
  static async detectPermissionConflict(
    projectId: string,
    userId: string,
    action: string,
    resource: string
  ): Promise<DataConflict | null> {
    // 這裡可以實現權限檢查邏輯
    // 目前簡化實現
    const user = await query.findOne('users', { id: userId });
    if (!user) {
      return await this.createConflict(
        projectId,
        `${resource}.${action}`,
        'permission-denied',
        null,
        [{
          value: 'permission-denied',
          userId,
          timestamp: new Date().toISOString()
        }]
      );
    }

    return null;
  }

  // 自動解決衝突
  static async autoResolveConflicts(projectId: string): Promise<number> {
    const pendingConflicts = await this.getProjectConflicts(projectId, 'pending');
    let resolvedCount = 0;

    for (const conflict of pendingConflicts) {
      try {
        // 簡單的自動解決策略：選擇最新的值
        const latestChange = conflict.conflictingValues.reduce((latest, current) => {
          return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        });

        await this.resolveConflict(
          conflict.id,
          'accept-theirs',
          'system',
          latestChange.value
        );

        resolvedCount++;
      } catch (error) {
        console.error(`自動解決衝突 ${conflict.id} 失敗:`, error);
      }
    }

    return resolvedCount;
  }

  // 合併值的簡單實現
  private static mergeValues(values: any[]): any {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0];

    // 如果是字符串，嘗試合併
    if (typeof values[0] === 'string') {
      return values.join('\n---\n');
    }

    // 如果是數字，取平均值
    if (typeof values[0] === 'number') {
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    // 如果是對象，嘗試合併屬性
    if (typeof values[0] === 'object' && values[0] !== null) {
      const merged = {};
      for (const value of values) {
        Object.assign(merged, value);
      }
      return merged;
    }

    // 默認返回最後一個值
    return values[values.length - 1];
  }

  // 預防衝突 - 字段鎖定
  static async lockField(
    projectId: string,
    fieldPath: string,
    userId: string,
    duration: number = 5 * 60 * 1000 // 5分鐘
  ): Promise<boolean> {
    // 這裡可以實現字段鎖定邏輯
    // 簡化實現：記錄到緩存或數據庫
    console.log(`用戶 ${userId} 鎖定字段 ${fieldPath} ${duration}ms`);
    return true;
  }

  // 釋放字段鎖定
  static async unlockField(
    projectId: string,
    fieldPath: string,
    userId: string
  ): Promise<void> {
    console.log(`用戶 ${userId} 釋放字段鎖定 ${fieldPath}`);
  }

  // 檢查字段是否被鎖定
  static async isFieldLocked(
    projectId: string,
    fieldPath: string,
    userId: string
  ): Promise<boolean> {
    // 簡化實現：總是返回false
    return false;
  }

  // 獲取衝突統計
  static async getConflictStats(projectId: string): Promise<{
    pending: number;
    resolved: number;
    ignored: number;
    total: number;
    recentConflicts: DataConflict[];
  }> {
    const allConflicts = await this.getProjectConflicts(projectId);

    const pending = allConflicts.filter(c => c.status === 'pending').length;
    const resolved = allConflicts.filter(c => c.status === 'resolved').length;
    const ignored = allConflicts.filter(c => c.status === 'ignored').length;

    // 最近24小時的衝突
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentConflicts = allConflicts.filter(c => {
      const createdAt = new Date(c.resolvedAt || new Date().toISOString());
      return createdAt > yesterday;
    }).slice(0, 10);

    return {
      pending,
      resolved,
      ignored,
      total: allConflicts.length,
      recentConflicts
    };
  }
}