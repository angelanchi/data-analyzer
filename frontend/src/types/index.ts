// 數據點介面
export interface DataPoint {
  Point_ID?: string;  // 改為可選，因為可能使用其他欄位作為識別碼
  Location_X?: number;
  Location_Y?: number;
  td?: number;
  Voltage?: number;
  Current?: number;
  Temperature?: number;
  Resistance?: number;
  Capacitance?: number;
  Signal_Quality?: number;
  Test_Time?: string;
  Operator?: string;
  Equipment_ID?: string;
  Batch_No?: string;
  Test_Result?: 'PASS' | 'Fail' | 'Warning' | 'Pass';
  Power?: number;
  Frequency?: number;
  Impedance?: number;
  Phase_Angle?: number;
  [key: string]: any;  // 允許動態欄位
}

// Chart types
export type ChartType =
  | 'scatter'
  | 'bar';

// ??????
export interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  filters?: DataFilter[];
}
// Data filter definition
export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin';
  value: any;
}

// ??????
export interface CleaningRule {
  field: string;
  enabled: boolean;
  minValue?: number;
  maxValue?: number;
  handleMissing: 'remove' | 'interpolate' | 'default';
  defaultValue?: any;
  removeOutliers?: boolean;
  outlierMethod?: 'iqr' | 'zscore' | 'modified_zscore';
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

// ???
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
}

// API???
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ??????
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface BatchViewSourceSummary {
  sourceName: string;
  rowCount: number;
}

export interface BatchViewColumns {
  common: string[];
  all: Record<string, string[]>;
}

export interface BatchViewMetadata {
  batchCount: number;
  flattenedRowCount: number;
  groupedPointCount: number;
  flattenParams: string[] | null;
  groupParams: string[] | null;
  defaultMetrics: string[] | null;
  defaultGroups: string[] | null;
  columnTypes: {
    numeric: string[];
    categorical: string[];
    // 新增：只包含原始上傳資料的欄位（排除系統生成的欄位）
    originalNumeric?: string[];
    originalCategorical?: string[];
  };
  sources: BatchViewSourceSummary[];
  columns: BatchViewColumns;
  aggregations: {
    overall: Record<string, { mean: number | null; count: number; min: number | null; max: number | null }>;
    bySource: Array<{ source: string; metrics: Record<string, { mean: number | null; count: number }> }>;
  };
}

export interface AnalysisJobFileRef {
  fileId: string;
  label?: string;
}

export interface AnalysisJobRequest {
  files?: Record<string, string>;
  fileIds?: AnalysisJobFileRef[];
  params: string[];
  targetParam?: string;
  pointIds?: string[];
  groupBy?: string[];
  flattenParams?: string[];
  outputDir?: string;
}

export interface AnalysisSummary {
  commonColumns: string[];
  metadata: Record<string, unknown>;
  excelPath: string;
  pdfPath: string;
  dotPlotPath: string;
  linePlotPath: string;
}

export type AnalysisJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface AnalysisJobCreateResponse {
  jobId: string;
  status: AnalysisJobStatus;
  createdAt: string;
}

export interface AnalysisJobResult {
  summary: AnalysisSummary;
  outputDir: string;
  stdout: string;
  stderr: string;
}

export interface AnalysisJobStatusResponse extends AnalysisJobCreateResponse {
  startedAt?: string;
  finishedAt?: string;
  result?: AnalysisJobResult;
  error?: string;
}
export interface BatchViewResult {
  flattenedData: Record<string, any>[];
  groupedData: Record<string, any>[];
  metadata: BatchViewMetadata;
}

// Sorting configuration for data view
export interface DataSortConfig {
  primarySort: string | null;
  secondarySort: string | null;
}
// ??????
export interface DataStatistics {
  field: string;
  count: number;
  nullCount: number;
  uniqueCount: number;
  dataType: 'numeric' | 'string' | 'date' | 'boolean';
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  mode?: number;
  variance?: number;
  standardDeviation?: number;
  lowerBound?: number;
  upperBound?: number;
}
// ??????
export interface ExportOptions {
  format: string;
  filename: string;
  includeFilters: boolean;
  metadata?: any;
  flattenedData?: Record<string, unknown>[];
  groupedData?: Record<string, unknown>[];
  primarySort?: string | null;
  secondarySort?: string | null;
}

// ??????
export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  color?: string;
  isOnline?: boolean;
  lastActive?: string;
}

// ?????????
export interface CollaborationSession {
  id: string;
  projectId: string;
  userId: string;
  socketId: string;
  joinedAt: string;
  lastActive: string;
  user?: User;
  cursorPosition?: {
    x: number;
    y: number;
    component: string;
  };
}

export interface CollaborationEvent {
  type: 'user-join' | 'user-leave' | 'data-change' | 'chart-change' | 'cursor-move' | 'typing' | 'conflict' | 'data-file-added' | 'data-file-removed';
  projectId: string;
  userId: string;
  timestamp: string;
  fieldPath?: string;
  targetComponent?: string;
  data?: any;
}

// ?????????
export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  description: string;
  snapshotData: string;
  createdBy: string;
  createdAt: string;
  isCurrent: boolean;
  tags?: string[];
  parentVersionId?: string;
}

export interface VersionChange {
  id: string;
  versionId: string;
  changeType: 'create' | 'update' | 'delete';
  fieldPath: string;
  oldValue?: any;
  newValue?: any;
  userId: string;
  timestamp: string;
  description?: string;
}

// ??????
export interface DataConflict {
  id: string;
  projectId: string;
  fieldPath: string;
  conflictType: 'concurrent-edit' | 'version-mismatch' | 'permission-denied';
  originalValue?: any;
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







