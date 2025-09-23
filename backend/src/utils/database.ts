import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data', 'analyzer.db');

// 創建數據庫連接
export const db = new sqlite3.Database(dbPath);

// 將sqlite3方法轉換為Promise
export const dbRun = (sql: string, params?: any[]): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    const callback = function(this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    };

    if (params && params.length > 0) {
      db.run(sql, params, callback);
    } else {
      db.run(sql, callback);
    }
  });
};

export const dbGet = (sql: string, params?: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row);
    };

    if (params && params.length > 0) {
      db.get(sql, params, callback);
    } else {
      db.get(sql, callback);
    }
  });
};

export const dbAll = (sql: string, params?: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    };

    if (params && params.length > 0) {
      db.all(sql, params, callback);
    } else {
      db.all(sql, callback);
    }
  });
};

// 初始化數據庫表
export const initializeDatabase = async (): Promise<void> => {
  try {
    // 用戶表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT,
        role TEXT DEFAULT 'user',
        is_online BOOLEAN DEFAULT FALSE,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用戶會話表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 專案表（擴展版本）
    await dbRun(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner TEXT NOT NULL,
        collaborators TEXT DEFAULT '[]',
        data_files TEXT DEFAULT '[]',
        charts TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        tags TEXT DEFAULT '[]',
        current_version_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 數據文件表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS data_files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        row_count INTEGER,
        column_count INTEGER,
        columns TEXT DEFAULT '[]',
        status TEXT DEFAULT 'uploaded',
        error_message TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME
      )
    `);

    // 分析配置表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS analysis_configurations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        selected_metrics TEXT DEFAULT '[]',
        selected_categorical_metrics TEXT DEFAULT '[]',
        selected_groups TEXT DEFAULT '[]',
        primary_sort TEXT,
        secondary_sort TEXT,
        column_type_overrides TEXT DEFAULT '{}',
        chart_config TEXT,
        cleaning_rules TEXT DEFAULT '[]',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 專案版本表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS project_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        description TEXT,
        snapshot_data TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_current BOOLEAN DEFAULT FALSE,
        tags TEXT DEFAULT '[]',
        parent_version_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_version_id) REFERENCES project_versions (id)
      )
    `);

    // 版本變更記錄表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS version_changes (
        id TEXT PRIMARY KEY,
        version_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        field_path TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        user_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        FOREIGN KEY (version_id) REFERENCES project_versions (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 協作會話表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        socket_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        cursor_data TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 專案評論表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS project_comments (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        parent_comment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_resolved BOOLEAN DEFAULT FALSE,
        reactions TEXT DEFAULT '[]',
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES project_comments (id) ON DELETE CASCADE
      )
    `);

    // 數據衝突表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS data_conflicts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        field_path TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        original_value TEXT,
        conflicting_values TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        resolved_by TEXT,
        resolved_at DATETIME,
        resolution_strategy TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users (id)
      )
    `);

    // 創建索引
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);

    await dbRun(`CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_data_files_status ON data_files(status)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_analysis_configs_project_id ON analysis_configurations(project_id)`);

    await dbRun(`CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_project_versions_current ON project_versions(is_current)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_version_changes_version_id ON version_changes(version_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project_id ON collaboration_sessions(project_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id ON collaboration_sessions(user_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_data_conflicts_project_id ON data_conflicts(project_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_data_conflicts_status ON data_conflicts(status)`);

    console.log('數據庫表初始化完成');
  } catch (error) {
    console.error('數據庫初始化錯誤:', error);
    throw error;
  }
};

// 數據庫查詢輔助函數
export const query = {
  // 獲取單個記錄
  findOne: async <T = any>(table: string, where: Record<string, any>): Promise<T | undefined> => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');

    const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return await dbGet(sql, values) as T | undefined;
  },

  // 獲取多個記錄
  findMany: async <T = any>(table: string, where?: Record<string, any>, orderBy?: string, limit?: number): Promise<T[]> => {
    let sql = `SELECT * FROM ${table}`;
    const values: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const keys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...whereValues);
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ?`;
      values.push(limit);
    }

    return await dbAll(sql, values) as T[];
  },

  // 插入記錄
  insert: async (table: string, data: Record<string, any>): Promise<sqlite3.RunResult> => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return await dbRun(sql, values) as sqlite3.RunResult;
  },

  // 更新記錄
  update: async (table: string, data: Record<string, any>, where: Record<string, any>): Promise<sqlite3.RunResult> => {
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = setKeys.map(key => `${key} = ?`).join(', ');
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`;
    return await dbRun(sql, [...setValues, ...whereValues]) as sqlite3.RunResult;
  },

  // 刪除記錄
  delete: async (table: string, where: Record<string, any>): Promise<sqlite3.RunResult> => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys.map(key => `${key} = ?`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return await dbRun(sql, values) as sqlite3.RunResult;
  }
};

// 關閉數據庫連接
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('數據庫連接已關閉');
        resolve();
      }
    });
  });
};