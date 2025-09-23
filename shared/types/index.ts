// 數據類型定義
export interface DataPoint {
  Point_ID: string;
  Location_X: number;
  Location_Y: number;
  td?: number;
  Voltage?: number;
  Current?: number;
  Temperature?: number;
  Resistance?: number;
  Capacitance?: number;
  Signal_Quality?: number;
  Test_Time: string;
  Operator: string;
  Equipment_ID: string;
  Batch_No: string;
  Test_Result: 'PASS' | 'Fail' | 'Warning' | 'Pass';
  Power?: number;
  Frequency?: number;
  Impedance?: number;
  Phase_Angle?: number;
}

// 圖表類型
export type ChartType =
  | 'scatter'
  | 'line'
  | 'bar';

// 圖表配置
export interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  filters?: DataFilter[];
  styling?: ChartStyling;
}

// 圖表樣式
export interface ChartStyling {
  colors?: string[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  backgroundColor?: string;
}

// 數據過濾器
export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

// 清理規則
export interface CleaningRule {
  field: string;
  enabled: boolean;
  minValue?: number;
  maxValue?: number;
  handleMissing: 'remove' | 'interpolate' | 'default' | 'skip';
  defaultValue?: any;
  removeOutliers?: boolean;
  outlierMethod?: 'iqr' | 'zscore';
}

// 移除原因
export interface RemovalReason {
  field: string;
  ruleType: 'range' | 'outlier' | 'missing';
  detail: string;
}

// 被移除行的信息
export interface RemovedRowInfo {
  rowIndex: number;
  rowData: DataPoint;
  reasons: RemovalReason[];
}

// 清理預覽結果
export interface CleaningPreviewResult {
  cleanedData: DataPoint[];
  originalCount: number;
  cleanedCount: number;
  removedCount: number;
  retentionRate: number;
  removedRows: RemovedRowInfo[];
  originalStatistics: Record<string, DataStatistics>;
  cleanedStatistics: Record<string, DataStatistics>;
  affectedFields: string[];
}

// 專案
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  collaborators: string[];
  dataFiles: string[];
  charts: ChartConfig[];
  status: 'active' | 'archived' | 'deleted';
  tags?: string[];
}

// 數據文件
export interface DataFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  processedAt?: string;
  rowCount?: number;
  columnCount?: number;
  columns?: string[];
  status: 'uploaded' | 'processed' | 'error';
  errorMessage?: string;
}

// API響應
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// 分頁響應
export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 文件上傳
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: DataFile;
}

// 統計信息
export interface DataStatistics {
  field: string;
  count: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  nullCount: number;
  uniqueCount: number;
  dataType: 'numeric' | 'string' | 'date' | 'boolean';
}

// 驗證錯誤
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// WebSocket事件
export interface SocketEvent {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
  projectId?: string;
}

// 匯出選項
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'png' | 'svg' | 'pdf';
  filename?: string;
  includeFilters?: boolean;
  includeStatistics?: boolean;
  metadata?: any;
  flattenedData?: Record<string, unknown>[];
  groupedData?: Record<string, unknown>[];
  primarySort?: string | null;
  secondarySort?: string | null;
}

// 用戶管理
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  isOnline: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user' | 'viewer';

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

// 專案權限
export type Permission = 'owner' | 'collaborator' | 'viewer';

export interface UserPermission {
  userId: string;
  permission: Permission;
  grantedAt: string;
  grantedBy: string;
}

// 協作會話
export interface CollaborationSession {
  id: string;
  projectId: string;
  userId: string;
  socketId: string;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'disconnected';
  cursor?: {
    x: number;
    y: number;
    component: string;
  };
}

// 專案版本
export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  description: string;
  snapshotData: string; // JSON stringified project state
  createdBy: string;
  createdAt: string;
  isCurrent: boolean;
  tags: string[];
  parentVersionId?: string;
}

// 版本變更記錄
export interface VersionChange {
  id: string;
  versionId: string;
  changeType: 'create' | 'update' | 'delete';
  fieldPath: string;
  oldValue: any;
  newValue: any;
  userId: string;
  timestamp: string;
  description?: string;
}

// 專案評論
export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  targetType: 'project' | 'chart' | 'data' | 'version';
  targetId?: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt?: string;
  isResolved: boolean;
  reactions: CommentReaction[];
}

export interface CommentReaction {
  userId: string;
  type: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
  createdAt: string;
}

// 即時協作事件
export interface CollaborationEvent {
  type: 'user-join' | 'user-leave' | 'data-change' | 'chart-change' | 'cursor-move' | 'typing' | 'conflict' | 'data-file-added' | 'data-file-removed';
  projectId: string;
  userId: string;
  timestamp: string;
  data?: any;
  targetComponent?: string;
  fieldPath?: string;
}

// 衝突解決
export interface DataConflict {
  id: string;
  projectId: string;
  fieldPath: string;
  conflictType: 'concurrent-edit' | 'version-mismatch' | 'permission-denied';
  originalValue: any;
  conflictingValues: Array<{
    value: any;
    userId: string;
    timestamp: string;
  }>;
  status: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionStrategy?: 'accept-mine' | 'accept-theirs' | 'merge' | 'custom';
}