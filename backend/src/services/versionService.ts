import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database';
import { ProjectVersion, VersionChange, Project } from 'shared/types';

export class VersionService {
  // 創建專案版本快照
  static async createVersion(
    projectId: string,
    description: string,
    createdBy: string,
    projectData: any,
    parentVersionId?: string
  ): Promise<ProjectVersion> {
    const versionId = uuidv4();
    const now = new Date().toISOString();

    // 生成版本號
    const existingVersions = await query.findMany('project_versions',
      { project_id: projectId },
      'created_at DESC'
    );

    const versionNumber = `v${(existingVersions as any[]).length + 1}.0`;

    // 將當前版本設為非當前
    const currentVersions = await query.findMany('project_versions', {
      project_id: projectId,
      is_current: true
    });

    for (const version of currentVersions as any[]) {
      await query.update('project_versions',
        { is_current: false },
        { id: version.id }
      );
    }

    const versionData = {
      id: versionId,
      project_id: projectId,
      version_number: versionNumber,
      description,
      snapshot_data: JSON.stringify(projectData),
      created_by: createdBy,
      created_at: now,
      is_current: true,
      tags: '[]',
      parent_version_id: parentVersionId || null
    };

    await query.insert('project_versions', versionData);

    return {
      id: versionId,
      projectId,
      versionNumber,
      description,
      snapshotData: JSON.stringify(projectData),
      createdBy,
      createdAt: now,
      isCurrent: true,
      tags: [],
      parentVersionId
    };
  }

  // 記錄版本變更
  static async recordChange(
    versionId: string,
    changeType: 'create' | 'update' | 'delete',
    fieldPath: string,
    oldValue: any,
    newValue: any,
    userId: string,
    description?: string
  ): Promise<VersionChange> {
    const changeId = uuidv4();
    const now = new Date().toISOString();

    const changeData = {
      id: changeId,
      version_id: versionId,
      change_type: changeType,
      field_path: fieldPath,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      user_id: userId,
      timestamp: now,
      description: description || null
    };

    await query.insert('version_changes', changeData);

    return {
      id: changeId,
      versionId,
      changeType,
      fieldPath,
      oldValue,
      newValue,
      userId,
      timestamp: now,
      description
    };
  }

  // 獲取專案的所有版本
  static async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    const versions = await query.findMany('project_versions',
      { project_id: projectId },
      'created_at DESC'
    );

    return (versions as any[]).map(version => ({
      id: version.id,
      projectId: version.project_id,
      versionNumber: version.version_number,
      description: version.description,
      snapshotData: version.snapshot_data,
      createdBy: version.created_by,
      createdAt: version.created_at,
      isCurrent: version.is_current,
      tags: version.tags ? JSON.parse(version.tags) : [],
      parentVersionId: version.parent_version_id
    }));
  }

  // 獲取特定版本
  static async getVersion(versionId: string): Promise<ProjectVersion | null> {
    const version = await query.findOne('project_versions', { id: versionId });
    if (!version) return null;

    return {
      id: (version as any).id,
      projectId: (version as any).project_id,
      versionNumber: (version as any).version_number,
      description: (version as any).description,
      snapshotData: (version as any).snapshot_data,
      createdBy: (version as any).created_by,
      createdAt: (version as any).created_at,
      isCurrent: (version as any).is_current,
      tags: (version as any).tags ? JSON.parse((version as any).tags) : [],
      parentVersionId: (version as any).parent_version_id
    };
  }

  // 獲取當前版本
  static async getCurrentVersion(projectId: string): Promise<ProjectVersion | null> {
    const version = await query.findOne('project_versions', {
      project_id: projectId,
      is_current: true
    });

    if (!version) return null;

    return {
      id: (version as any).id,
      projectId: (version as any).project_id,
      versionNumber: (version as any).version_number,
      description: (version as any).description,
      snapshotData: (version as any).snapshot_data,
      createdBy: (version as any).created_by,
      createdAt: (version as any).created_at,
      isCurrent: (version as any).is_current,
      tags: (version as any).tags ? JSON.parse((version as any).tags) : [],
      parentVersionId: (version as any).parent_version_id
    };
  }

  // 切換到指定版本
  static async switchToVersion(projectId: string, versionId: string): Promise<ProjectVersion> {
    // 將所有版本設為非當前
    const allVersions = await query.findMany('project_versions', { project_id: projectId });
    for (const version of allVersions as any[]) {
      await query.update('project_versions',
        { is_current: false },
        { id: version.id }
      );
    }

    // 設置目標版本為當前
    await query.update('project_versions',
      { is_current: true },
      { id: versionId }
    );

    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('版本不存在');
    }

    return version;
  }

  // 獲取版本變更歷史
  static async getVersionChanges(versionId: string): Promise<VersionChange[]> {
    const changes = await query.findMany('version_changes',
      { version_id: versionId },
      'timestamp DESC'
    );

    return (changes as any[]).map(change => ({
      id: change.id,
      versionId: change.version_id,
      changeType: change.change_type,
      fieldPath: change.field_path,
      oldValue: change.old_value ? JSON.parse(change.old_value) : null,
      newValue: change.new_value ? JSON.parse(change.new_value) : null,
      userId: change.user_id,
      timestamp: change.timestamp,
      description: change.description
    }));
  }

  // 比較兩個版本的差異
  static async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: ProjectVersion;
    version2: ProjectVersion;
    differences: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: any;
      newValue?: any;
    }>;
  }> {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);

    if (!version1 || !version2) {
      throw new Error('版本不存在');
    }

    const data1 = JSON.parse(version1.snapshotData);
    const data2 = JSON.parse(version2.snapshotData);

    const differences = this.calculateDifferences(data1, data2);

    return {
      version1,
      version2,
      differences
    };
  }

  // 計算數據差異
  private static calculateDifferences(
    obj1: any,
    obj2: any,
    path: string = ''
  ): Array<{
    path: string;
    type: 'added' | 'removed' | 'modified';
    oldValue?: any;
    newValue?: any;
  }> {
    const differences: Array<{
      path: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: any;
      newValue?: any;
    }> = [];

    // 檢查obj1中的屬性
    for (const key in obj1) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in obj2)) {
        // 屬性在obj2中被移除
        differences.push({
          path: currentPath,
          type: 'removed',
          oldValue: obj1[key]
        });
      } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' &&
                 obj1[key] !== null && obj2[key] !== null) {
        // 遞歸比較對象
        differences.push(...this.calculateDifferences(obj1[key], obj2[key], currentPath));
      } else if (obj1[key] !== obj2[key]) {
        // 值被修改
        differences.push({
          path: currentPath,
          type: 'modified',
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    }

    // 檢查obj2中新增的屬性
    for (const key in obj2) {
      if (!(key in obj1)) {
        const currentPath = path ? `${path}.${key}` : key;
        differences.push({
          path: currentPath,
          type: 'added',
          newValue: obj2[key]
        });
      }
    }

    return differences;
  }

  // 恢復到指定版本
  static async restoreVersion(projectId: string, versionId: string): Promise<any> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('版本不存在');
    }

    const projectData = JSON.parse(version.snapshotData);

    // 這裡應該更新專案的實際數據
    // 具體實現取決於專案數據的存儲方式
    // 目前先返回數據，由調用者處理

    // 切換到這個版本
    await this.switchToVersion(projectId, versionId);

    return projectData;
  }

  // 創建分支版本
  static async createBranch(
    parentVersionId: string,
    description: string,
    createdBy: string,
    branchName?: string
  ): Promise<ProjectVersion> {
    const parentVersion = await this.getVersion(parentVersionId);
    if (!parentVersion) {
      throw new Error('父版本不存在');
    }

    const projectData = JSON.parse(parentVersion.snapshotData);

    // 創建分支版本
    const branchVersion = await this.createVersion(
      parentVersion.projectId,
      description,
      createdBy,
      projectData,
      parentVersionId
    );

    // 如果提供了分支名稱，添加標籤
    if (branchName) {
      await this.addVersionTag(branchVersion.id, `branch:${branchName}`);
    }

    return branchVersion;
  }

  // 添加版本標籤
  static async addVersionTag(versionId: string, tag: string): Promise<void> {
    const version = await query.findOne('project_versions', { id: versionId });
    if (!version) {
      throw new Error('版本不存在');
    }

    const currentTags = (version as any).tags ? JSON.parse((version as any).tags) : [];
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      await query.update('project_versions',
        { tags: JSON.stringify(currentTags) },
        { id: versionId }
      );
    }
  }

  // 移除版本標籤
  static async removeVersionTag(versionId: string, tag: string): Promise<void> {
    const version = await query.findOne('project_versions', { id: versionId });
    if (!version) {
      throw new Error('版本不存在');
    }

    const currentTags = (version as any).tags ? JSON.parse((version as any).tags) : [];
    const updatedTags = currentTags.filter((t: string) => t !== tag);

    await query.update('project_versions',
      { tags: JSON.stringify(updatedTags) },
      { id: versionId }
    );
  }

  // 自動創建版本（基於變更數量）
  static async autoCreateVersion(
    projectId: string,
    userId: string,
    projectData: any,
    changeThreshold: number = 10
  ): Promise<ProjectVersion | null> {
    const currentVersion = await this.getCurrentVersion(projectId);
    if (!currentVersion) {
      // 創建初始版本
      return await this.createVersion(
        projectId,
        '初始版本',
        userId,
        projectData
      );
    }

    // 計算變更數量
    const changes = await this.getVersionChanges(currentVersion.id);
    const recentChanges = changes.filter(change => {
      const changeTime = new Date(change.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return changeTime > oneHourAgo;
    });

    if (recentChanges.length >= changeThreshold) {
      // 創建新版本
      return await this.createVersion(
        projectId,
        `自動版本 - ${recentChanges.length}個變更`,
        userId,
        projectData,
        currentVersion.id
      );
    }

    return null;
  }

  // 清理舊版本
  static async cleanupOldVersions(
    projectId: string,
    keepCount: number = 50
  ): Promise<void> {
    const versions = await this.getProjectVersions(projectId);

    if (versions.length > keepCount) {
      const versionsToDelete = versions
        .filter(v => !v.isCurrent) // 不刪除當前版本
        .slice(keepCount); // 保留最新的keepCount個版本

      for (const version of versionsToDelete) {
        // 刪除版本變更記錄
        await query.delete('version_changes', { version_id: version.id });
        // 刪除版本
        await query.delete('project_versions', { id: version.id });
      }
    }
  }
}